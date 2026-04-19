import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { ManuscriptAnalysisResponse, Note, ProjectData, Character, Relationship, Artifact, LoreEntry, TimelineEvent, AnalysisOptions, AppPrompts, Language, Plotline, MatrixCell, ContinuityError, EntitySpan } from "../types";
import { getAppPrompts, generateId, getApiKey, saveApiKey, getAppSettings } from "./storageService";

let initializedApiKey: string | null = null;

export const initializeApiKey = async () => {
  const metaEnv = (import.meta as any).env || {};
  const windowEnv = (window as any)._env_ || {};
  
  initializedApiKey = metaEnv.NEXT_PUBLIC_GEMINI_API_KEY ||
                      metaEnv.VITE_GEMINI_API_KEY || 
                      (window as any).GEMINI_API_KEY || 
                      (window as any).NEXT_PUBLIC_GEMINI_API_KEY ||
                      windowEnv.NEXT_PUBLIC_GEMINI_API_KEY ||
                      windowEnv.VITE_GEMINI_API_KEY ||
                      (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GEMINI_API_KEY : null) ||
                      (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null) ||
                      await getApiKey('gemini_api_key');
};

export const isApiKeyValid = () => {
  return !!initializedApiKey && initializedApiKey.trim().length >= 10;
};

export const setUserProvidedApiKey = async (name: string, key: string) => {
  initializedApiKey = key;
  await saveApiKey(name, key);
};

/**
 * Helper to get an AI client instance on-demand.
 * Validates the API key at the moment of call rather than module load.
 */
const getAiClient = () => {
  const apiKey = initializedApiKey;
  if (!apiKey || apiKey === 'undefined' || apiKey.trim().length < 10) {
    throw new Error("AI_CONFIG_ERROR: No valid API Key detected. Please click 'Connect Key' at the top of the screen.");
  }
  return new GoogleGenAI({ apiKey });
};

const safeJsonParse = (jsonString: string | undefined, defaultValue: any) => {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    const match = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const candidate = match ? match[1] : jsonString;
    try {
      return JSON.parse(candidate.trim());
    } catch (e2) {
      console.warn("AI JSON Parse Failure:", e2);
      return defaultValue;
    }
  }
};

export const unifiedAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    coverDescription: { type: Type.STRING },
    themes: { type: Type.ARRAY, items: { type: Type.STRING } },
    characters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          job: { type: Type.STRING },
          description: { type: Type.STRING },
          traits: { type: Type.ARRAY, items: { type: Type.STRING } },
          familyName: { type: Type.STRING },
          nickname: { type: Type.STRING },
          age: { type: Type.STRING },
          birthday: { type: Type.STRING },
          birthplace: { type: Type.STRING },
          residence: { type: Type.STRING },
          physicalFeatures: { type: Type.STRING, description: "Detailed physical description including height, weight, build, and distinctive marks." },
          style: { type: Type.STRING },
          strengths: { type: Type.STRING },
          weaknesses: { type: Type.STRING },
          firstMentionOffset: { type: Type.NUMBER, description: "The character index of their first appearance or mention in this text block." },
          lastMentionOffset: { type: Type.NUMBER, description: "The character index of their final appearance or mention in this text block." }
        }
      }
    },
    minorCharacters: { type: Type.ARRAY, items: { type: Type.STRING } },
    relationships: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sourceId: { type: Type.STRING, description: "The NAME of the first character." },
          targetId: { type: Type.STRING, description: "The NAME of the second character." },
          type: { type: Type.STRING, description: "The type of bond, e.g. Rival, Spouse, Mentor." },
          description: { type: Type.STRING, description: "Brief details about their interaction or dynamic." }
        },
        required: ["sourceId", "targetId", "type"]
      }
    },
    timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          charactersInvolved: { type: Type.ARRAY, items: { type: Type.STRING } },
          location: { type: Type.STRING }
        },
        required: ["date", "title", "description"]
      }
    },
    locations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          type: { type: Type.STRING }
        },
        required: ["name", "description"]
      }
    },
    artifacts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING },
          description: { type: Type.STRING },
          significance: { type: Type.STRING }
        }
      }
    },
    lore: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING },
          category: { type: Type.STRING }
        }
      }
    }
  },
  required: ["title", "summary"]
};

export const DEFAULT_PROMPTS: AppPrompts = {
  GENERAL_AND_CHARACTERS: "Extract title, summary, characters (including roles, jobs, physical descriptions, traits, and aliases), character relationships (bonds between characters), and themes.",
  PLOT_MATRIX_ANALYSIS: "Identify major subplots from these events.",
  TIMELINE: "Construct a chronological timeline.",
  LOCATIONS: "Extract key locations.",
  ARTIFACTS: "Extract inanimate artifacts.",
  LORE: "Extract world-building terms.",
  NOTE_ENHANCEMENT: "Expand this brainstorming fragment into a vivid narrative paragraph. Focus on imagery and atmosphere.",
  PROCESS_RAW_NOTES: "Analyze the following prose and extract entities and plot directions.",
  STRUCTURAL_ANALYSIS: "Analyze for logical consistency and plot structure.",
  SENTIMENT: "Analyze emotional tone (-10 to 10) for events.",
  RELATIONSHIPS: "Identify relationships between characters.",
  THEMES: "Extract primary themes.",
  SOFT_ANCHORS: "Identify chronological anchors.",
  PLOT_AUDIT: "Identify narrative inconsistencies.",
  THEME_EXTRACTION: "Synthesize thematic elements.",
  CONLANG_GEN: "Generate conlang vocabulary.",
  PROJECT_QA: "Answer the question using the provided context.",
  MISSPELLINGS_SCAN: 'Find misspellings of "{name}".',
  TOOLBOX_URL_ANALYSIS: "Analyze this URL for creative writer utility.",
  GENERATE_CONLANG_WORD: 'Construct a word for "{word}" in "{langName}".',
  CONNECT_NOTES: "Synthesize these notes into a narrative thread.",
  CONTINUITY_CHECK: "Identify factual contradictions or narrative inconsistencies within the manuscript and existing project data.",
  AI_MODEL: "gemini-2.0-flash"
};

const getCurrentPrompts = async (): Promise<AppPrompts> => {
  const saved = await getAppPrompts();
  return { ...DEFAULT_PROMPTS, ...(saved || {}) };
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const msg = error.message?.toLowerCase() || "";
    if (retries > 0 && (msg.includes("quota") || msg.includes("limit") || msg.includes("429") || msg.includes("503"))) {
      console.warn(`AI Rate Limit hit, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(res => setTimeout(res, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const analyzeStoryText = async (text: string, tokenLimit?: number, options?: AnalysisOptions, onProgress?: (msg: string) => void): Promise<ManuscriptAnalysisResponse> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const appSettings = await getAppSettings();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";

  // Determine intelligent chunk size based on model
  let maxChars = appSettings?.aiCharacterLimit || 400000; 
  if (!appSettings?.aiCharacterLimit) {
    if (model.includes('1.5') || model.includes('3.1')) {
      maxChars = 800000; // Models with huge context
    } else if (model.includes('3-flash')) {
      maxChars = 400000;
    }
  }

  const actualLimit = tokenLimit || maxChars;
  const textLength = text.length;

  // For massive files, be more aggressive with sampling to avoid hanging
  const isMassive = textLength > (actualLimit * 3); 
  const sampleSize = actualLimit;

  const systemInstruction = `You are a world-class story architect. Perform a scan of the provided manuscript snippet and extract a structured living encyclopedia. Return strictly JSON, and ensure all extracted text and descriptions are strictly in English.`;

  const chunks: string[] = [];
  if (textLength <= sampleSize) {
    chunks.push(text);
  } else if (isMassive) {
    // For massive files, take 5 smaller samples to get a better overview without hitting timeouts
    console.log(`Massive file detected (${(textLength/1024/1024).toFixed(2)}MB). Using sparse sampling...`);
    chunks.push(text.substring(0, sampleSize)); // Start
    chunks.push(text.substring(Math.floor(textLength * 0.25), Math.floor(textLength * 0.25) + sampleSize)); // 25%
    chunks.push(text.substring(Math.floor(textLength * 0.5), Math.floor(textLength * 0.5) + sampleSize)); // 50%
    chunks.push(text.substring(Math.floor(textLength * 0.75), Math.floor(textLength * 0.75) + sampleSize)); // 75%
    chunks.push(text.substring(Math.max(0, textLength - sampleSize))); // End
  } else {
    // Take Start, Middle, and End
    chunks.push(text.substring(0, sampleSize));
    const mid = Math.floor(textLength / 2);
    const midStart = Math.max(0, mid - Math.floor(sampleSize / 2));
    chunks.push(text.substring(midStart, midStart + sampleSize));
    chunks.push(text.substring(Math.max(0, textLength - sampleSize)));
  }

  const results = [];
  const errors = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const progressMsg = `Analyzing manuscript chunk ${i+1}/${chunks.length}...`;
    console.log(`${progressMsg} (${chunk.length} chars)`);
    if (onProgress) onProgress(progressMsg);
    
    try {
      const res = await withRetry(() => ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: chunk }] }],
        config: { 
          systemInstruction,
          responseMimeType: "application/json", 
          responseSchema: unifiedAnalysisSchema
        }
      }));
      const parsed = safeJsonParse(res.text, {});
      if (Object.keys(parsed).length > 0) {
        results.push(parsed);
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`Chunk ${i+1} failed:`, errorMsg);
      errors.push(`Chunk ${i+1}: ${errorMsg}`);
    }
  }

  if (results.length === 0) {
    const errorDetails = errors.length > 0 
      ? `\n\nDetails:\n${errors.join('\n')}`
      : '';
    throw new Error(`AI failed to return any valid analysis results.${errorDetails}`);
  }

  // Merge Results
  const merged: ManuscriptAnalysisResponse = {
    title: results[0].title || "Untitled Project",
    summary: results.map((r, i) => `[Part ${i+1}]: ${r.summary || ""}`).join("\n\n"),
    coverDescription: results[0].coverDescription || "",
    themes: Array.from(new Set(results.flatMap(r => r.themes || []))),
    characters: [],
    minorCharacters: Array.from(new Set(results.flatMap(r => r.minorCharacters || []))),
    timeline: [],
    locations: [],
    artifacts: [],
    lore: [],
    referenceUrls: []
  };

  // Deduplicate and merge entities by name
  const charMap = new Map();
  results.forEach(r => (r.characters || []).forEach((c: any) => {
    if (!charMap.has(c.name)) charMap.set(c.name, { ...c, id: generateId(), source: 'ai' });
  }));
  merged.characters = Array.from(charMap.values());

  const locMap = new Map();
  results.forEach(r => (r.locations || []).forEach((l: any) => {
    if (!locMap.has(l.name)) locMap.set(l.name, { ...l, id: generateId(), source: 'ai' });
  }));
  merged.locations = Array.from(locMap.values());

  const artMap = new Map();
  results.forEach(r => (r.artifacts || []).forEach((a: any) => {
    if (!artMap.has(a.name)) artMap.set(a.name, { ...a, id: generateId(), source: 'ai' });
  }));
  merged.artifacts = Array.from(artMap.values());

  const loreMap = new Map();
  results.forEach(r => (r.lore || []).forEach((l: any) => {
    if (!loreMap.has(l.term)) loreMap.set(l.term, { ...l, id: generateId(), source: 'ai' });
  }));
  merged.lore = Array.from(loreMap.values());

  // Timeline needs careful merging (sort by date if possible, but they are strings)
  merged.timeline = results.flatMap(r => (r.timeline || []).map((e: any) => ({ ...e, id: generateId(), source: 'ai' })));

  return merged;
};

export const detectManuscriptStructure = async (snippet: string): Promise<{actPattern: string, chapterPattern: string, scenePattern: string}> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  const systemInstruction = "Identify novel structure patterns (Acts, Chapters, Scenes) from the text. Return JSON with Javascript Regex strings (using ^ for start-of-line).";

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: `Analyze this manuscript snippet and find the splitting patterns: ${snippet.substring(0, 10000)}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          actPattern: { type: Type.STRING, description: "Regex for Parts or Acts (e.g. ^Part [0-9]+)" },
          chapterPattern: { type: Type.STRING, description: "Regex for Chapters (e.g. ^Chapter [0-9]+)" },
          scenePattern: { type: Type.STRING, description: "Regex for Scene breaks (e.g. ^\\\\*\\\\*\\\\*)" }
        },
        required: ["actPattern", "chapterPattern", "scenePattern"]
      }
    }
  }));

  return safeJsonParse(response.text, { actPattern: "^Part\\s+[0-9]+", chapterPattern: "^Chapter\\s+[0-9]+", scenePattern: "^\\*\\*\\*" });
};

export const getEvocativeTitles = async (scenes: {id: string, content: string}[]): Promise<{id: string, title: string}[]> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";

  const payload = scenes.map(s => `ID: ${s.id}\nCONTENT: ${s.content.substring(0, 500)}`).join('\n\n---\n\n');

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: `Generate 3-5 word evocative titles for these scenes:\n\n${payload}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING }
          },
          required: ["id", "title"]
        }
      }
    }
  }));

  return safeJsonParse(response.text, []);
};

export const doubleProcessNote = async (rawNote: string): Promise<{ expanded: string, summary: string, tags: string[] }> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";

  const expansionRes = await withRetry(() => ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: `${prompts.NOTE_ENHANCEMENT}\n\nNote: ${rawNote}` }] }]
  }));
  const expandedText = expansionRes.text || rawNote;

  const processingRes = await withRetry(() => ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: `${prompts.PROCESS_RAW_NOTES}\n\nText: ${expandedText}` }] }],
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          insights: { type: Type.STRING }
        }
      }
    }
  }));

  const meta = safeJsonParse(processingRes.text, { summary: "", tags: [] });
  return {
    expanded: expandedText,
    summary: meta.summary + (meta.insights ? `\n\nInsight: ${meta.insights}` : ""),
    tags: meta.tags || []
  };
};

export const generateBookCover = async (title: string, author: string, summary: string): Promise<string | null> => {
  const ai = getAiClient();
  // First, generate a text description
  const descPrompt = `Create a vivid, atmospheric book cover description for "${title}" by ${author}. 
Based on this summary: ${summary}

Write 2-3 sentences describing the visual composition, mood, color palette, and key visual elements. 
Be poetic and evocative. Do not mention the title or author in the description.`;
  
  const descResponse = await withRetry(() => 
    ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: { parts: [{ text: descPrompt }] },
    })
  );
  
  let description = '';
  const candidate = descResponse.candidates?.[0];
  if (candidate && candidate.content && candidate.content.parts) {
    for (const part of candidate.content.parts) {
      if (part.text) description = part.text;
    }
  }
  
  // Now extract key visual keywords from the description for image search
  const keywordPrompt = `Extract 3-5 key visual keywords from this book cover description for use in an image search. 
Return ONLY the keywords as a comma-separated list, nothing else.

Description: ${description}`;
  
  const keywordResponse = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: { parts: [{ text: keywordPrompt }] },
    })
  );
  
  let keywords = 'book, abstract, art';
  const keywordCandidate = keywordResponse.candidates?.[0];
  if (keywordCandidate && keywordCandidate.content && keywordCandidate.content.parts) {
    for (const part of keywordCandidate.content.parts) {
      if (part.text) keywords = part.text.trim();
    }
  }
  
  // Use Pixabay API (free, no authentication required)
  try {
    const firstKeyword = keywords.split(',')[0].trim();
    const searchTerm = encodeURIComponent(firstKeyword);
    const pixabayUrl = `https://pixabay.com/api/?key=48251261-22e8c46e0ef3f7ac8a45b77d0&q=${searchTerm}&per_page=1&image_type=photo&min_width=800&orientation=vertical`;
    
    const response = await fetch(pixabayUrl, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (response && response.ok) {
      const data = await response.json();
      if (data.hits && data.hits[0]) {
        // Return Pixabay image URL
        return data.hits[0].largeImageURL;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch Pixabay image:', e);
  }
  
  // Fallback: Return description with a visual URI so UI can render it
  if (description) {
    return `cover-description://${encodeURIComponent(description)}`;
  }
  
  return null;
};

export const generateCharacterPhysicalDescription = async (character: { name: string; role: string; age?: string; job?: string; traits?: string[]; description?: string }): Promise<string> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  
  const traitsText = character.traits?.length ? character.traits.join(', ') : 'various traits';
  const ageText = character.age ? `Age: ${character.age}. ` : '';
  const roleText = character.role ? `Role: ${character.role}. ` : '';
  
  const prompt = `Generate a detailed physical description for a character with these attributes:
Name: ${character.name}
${ageText}${roleText}Job: ${character.job || 'unknown'}
Traits: ${traitsText}
Current description: ${character.description || 'none provided'}

Write a vivid 2-3 sentence physical description including height, build, distinctive features, and overall appearance. 
Make it specific and evocative. Focus on visual details that bring the character to life.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
    })
  );
  
  let description = '';
  const candidate = response.candidates?.[0];
  if (candidate && candidate.content && candidate.content.parts) {
    for (const part of candidate.content.parts) {
      if (part.text) description = part.text;
    }
  }
  
  return description.trim();
};

export const processRawNotes = async (text: string): Promise<{content: string, category: string, tags: string[], analysis: string}[]> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  const response = await ai.models.generateContent({
    model,
    contents: `Analyze and extract entities: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            category: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            analysis: { type: Type.STRING }
          },
          required: ["content", "category", "tags", "analysis"]
        }
      }
    }
  });
  return safeJsonParse(response.text, []);
};

export const extractThemesFromNotes = async (notes: Note[]): Promise<string[]> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  const text = notes.map(n => n.content).join('\n');
  const response = await ai.models.generateContent({
    model,
    contents: `Extract literary themes: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  });
  return safeJsonParse(response.text, []);
};

export const askProjectAI = async (prompt: string, projectData: ProjectData | null): Promise<string> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  const context = projectData ? `Project Title: ${projectData.title}` : "No project context.";
  const response = await ai.models.generateContent({
    model,
    contents: `${context}\n\nUser Question: ${prompt}`,
  });
  return response.text || "No response generated.";
};

export const analyzeRelationships = async (text: string, characters: Character[]): Promise<Relationship[]> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  const charNames = characters.map(c => c.name).join(', ');
  const response = await ai.models.generateContent({
    model,
    contents: `Identify relationships between (${charNames}) in: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sourceId: { type: Type.STRING },
            targetId: { type: Type.STRING },
            type: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      }
    }
  });
  const data = safeJsonParse(response.text, []);
  return data.map((rel: any) => ({
    id: generateId(),
    sourceId: characters.find(c => c.name === rel.sourceId)?.id || rel.sourceId,
    targetId: characters.find(c => c.name === rel.targetId)?.id || rel.targetId,
    type: rel.type,
    description: rel.description
  }));
};

export const analyzeUrlForToolbox = async (url: string): Promise<{label: string, category: string, description: string}> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  const response = await ai.models.generateContent({
    model,
    contents: `Analyze website utility for a writer: ${url}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { label: { type: Type.STRING }, category: { type: Type.STRING }, description: { type: Type.STRING } }
      }
    }
  });
  return safeJsonParse(response.text, { label: url, category: 'General', description: '' });
};

export const generateConlangWord = async (language: Language, word: string): Promise<{translation: string, etymology: string}> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  const response = await ai.models.generateContent({
    model,
    contents: `Construct word for "${word}" based on phonology rules of ${language}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { translation: { type: Type.STRING }, etymology: { type: Type.STRING } }
      }
    }
  });
  return safeJsonParse(response.text, { translation: word, etymology: '' });
};

export const analyzeConlangPhonology = async (dictionary: string): Promise<string> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  const prompt = `
    You are an expert computational linguist specializing in phonology and conlanging.
    Analyze the following fictional dictionary and deduce a set of plausible phonological rules in IPA notation.

    Dictionary Data:
    ---
    ${dictionary}
    ---

    Return a Markdown report including:
    1. A descriptive name for detected rules.
    2. The rule in standard format (A → B / X _ Y).
    3. Concise linguistic explanation.
    4. Examples from the provided data.
  `;
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  return response.text || "Phonological analysis inconclusive.";
};

export const analyzePlotMatrix = async (events: TimelineEvent[]): Promise<{ plotlines: Plotline[], cells: MatrixCell[] }> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  const eventData = events.map(e => e.title).join(', ');
  const response = await ai.models.generateContent({
    model,
    contents: `Identify major subplots and development plotlines: ${eventData}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plotlines: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, color: { type: Type.STRING } } } },
          cells: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { eventTitle: { type: Type.STRING }, plotlineTitle: { type: Type.STRING }, content: { type: Type.STRING } } } }
        }
      }
    }
  });

  const data = safeJsonParse(response.text, { plotlines: [], cells: [] });
  const plotlines: Plotline[] = (data.plotlines || []).map((p: any) => ({ ...p, id: generateId() }));
  const cells: MatrixCell[] = (data.cells || []).map((c: any) => {
    const event = events.find(e => e.title === c.eventTitle);
    const plotline = plotlines.find(p => p.title === c.plotlineTitle);
    return { eventId: event?.id || '', plotlineId: plotline?.id || '', content: c.content };
  }).filter((c: MatrixCell) => c.eventId && c.plotlineId);

  return { plotlines, cells };
};

export const generateSourceGuide = async (text: string) => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  
  const response = await ai.models.generateContent({
    model,
    contents: `Analyze the following source text and provide a JSON response with three keys:
1. "summary": A brief 2-3 sentence summary of the text.
2. "topics": An array of 3-5 key topics or themes found in the text.
3. "questions": An array of 3-5 suggested questions a user could ask to explore this text further.

Source Text:
${text.substring(0, 15000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          topics: { type: Type.ARRAY, items: { type: Type.STRING } },
          questions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["summary", "topics", "questions"]
      }
    }
  });
  
  return safeJsonParse(response.text, { summary: "", topics: [], questions: [] });
};

export const stenoResearch = async (text: string) => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  const prompt = `
    Perform high-speed research and entity extraction on the following text.
    Extract key entities (people, places, organizations), summarize the core message, and identify any actionable insights or interesting connections.
    
    Format the output as Markdown with the following sections:
    - ## Summary
    - ## Key Entities
    - ## Insights & Connections
    
    Text to analyze:
    ---
    ${text}
    ---
  `;
  
  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  }));

  return response.text || "Research analysis failed.";

};

/**
 * Generic chat function for the AI Assistant.
 */
export const smartExtractSources = async (text: string): Promise<{ title: string; author: string; content: string; citation: string; url?: string; type: 'text' | 'web' }[]> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";

  const prompt = `
    Extract sources from the following text. 
    1. If the text is a URL, fetch/determine the website title and provide the URL.
    2. If the text is a title of a book, article, or resource, find/suggest a likely primary URL for it.
    3. Extract any significant literary/scriptural verses or quotes.
    
    IMPORTANT: Ignore any search engine prompts, search queries, or navigational artifacts (like "search results for...", "people also ask", etc.). Only extract the actual source data.

    Return a JSON array of objects with { title, author, content, citation, url, type }.
    - 'type' should be 'web' if a URL is provided or found, otherwise 'text'.
    
    TEXT: ${text}`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    }));
    return safeJsonParse(response.text, []);
  } catch (error) {
    console.error("Smart Extract Error:", error);
    return [];
  }
};
export const chatWithAssistant = async (
  message: string, 
  projectData: ProjectData | null, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[] = [],
  context: string = ''
) => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction: `You are The Oracle, a world-class narrative consultant.
      Your goal is to help the writer develop their story, characters, and world.
      
      ${context ? `ADDITIONAL CONTEXT (Grounded Sources):\n---\n${context}\n---\n` : ''}

      Context of current project:
      Title: ${projectData?.title || 'Untitled'}
      Summary: ${projectData?.summary || 'No summary yet.'}
      Characters: ${projectData?.characters.map(c => c.name).join(', ') || 'None'}
      Themes: ${projectData?.themes.join(', ') || 'None'}
      
      Be insightful, creative, and encouraging. Use the context provided to give specific advice.
      If the user asks for something you can't do (like generate a file), explain your role as a creative partner.`,
    },
    history,
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};

export const semanticSearchNotes = async (query: string, notes: Note[]): Promise<string[]> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";

  const noteData = notes.map(n => `ID: ${n.id}\nCONTENT: ${n.content}\nTAGS: ${n.tags.join(', ')}`).join('\n\n---\n\n');

  const response = await ai.models.generateContent({
    model,
    contents: `You are a semantic search engine. Given a query and a list of notes, return the IDs of the most relevant notes in order of relevance. Return strictly a JSON array of strings.

Query: ${query}

Notes:
${noteData}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  return safeJsonParse(response.text, []);
};

export const extractSoftAnchors = async (
  text: string, 
  existingEvents: { id: string, title: string, uei: number }[]
): Promise<{ title: string; description: string; uei: number; referenceEventId: string; date: string }[]> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";
  
  const existingContext = existingEvents.map(e => `ID: ${e.id} | Title: ${e.title} | UEI (Day Count): ${e.uei}`).join('\n');

  const prompt = `
You are Merlin, a master timeline architect.
Analyze the following text for "relative" temporal markers (e.g., "three days after the fire", "two weeks before the coronation").

Here are the existing "Hard Anchors" (known events) with their Universal Epoch Integer (UEI), which represents their raw day count:
---
${existingContext || 'None'}
---

Task:
1. Find any phrase that indicates a relative date tied to one of the hard anchors above.
2. Calculate the exact new UEI based on that reference (e.g., if the anchor is at UEI 45, "two days later" is UEI 47).
3. Create a descriptive title and description for the new event.
4. Estimate a natural language date string (e.g. "Year 1, Month 2").

Return a JSON array of these new "Soft Anchor" events:
[{ "title": "Event Name", "description": "What happens", "uei": 47, "referenceEventId": "the-hard-anchor-id", "date": "Estimated Date String" }]

Text to analyze:
${text}
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            uei: { type: Type.INTEGER },
            referenceEventId: { type: Type.STRING },
            date: { type: Type.STRING }
          },
          required: ["title", "description", "uei", "referenceEventId", "date"]
        }
      }
    }
  }));

  return safeJsonParse(response.text, []);
};

export const performOCR = async (base64Image: string): Promise<string> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";

  const prompt = `
    Perform high-accuracy OCR on the attached image. 
    Extract all visible text, including handwritten notes, character sketches details, or research clippings.
    Format the output as clean Markdown.
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(',')[1] || base64Image
              }
            }
          ]
        }
      ]
    }));
    return response.text || "";
  } catch (error) {
    console.error("OCR Error:", error);
    return "Failed to extract text from image.";
  }
};

export const notebookLMProcess = async (text: string, type: 'text' | 'pdf' | 'image'): Promise<{ markdown: string, metadata: any }> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";

  const systemInstruction = `
    You are a processing pipeline. Your task is to parse this source and generate the required sidecar files to integrate it into my application's database using the 'Bundle Method.'

    1. Generate the Plaintext Sidecar (extracted.md)
    - Extract all meaningful text, transcripts, or OCR data from the raw source file.
    - Format the extraction neatly as Markdown. Remove headers, footers, ad blocks, or UI noise if applicable.

    2. Generate the Metadata Index (index.json)
    - Analyze the extracted text and output a JSON object containing the database index.
    - The JSON object must strictly include the following fields:
      title: A concise name for the source.
      author: The creator of the source (if identifiable).
      date: The publication date to the best of your knowledge (Format: ISO-8601).
      summary: A strict 2-3 sentence summary of the core information or thesis inside the source.
      skos_tags: An object mapping this source to my Codex taxonomy using three string arrays: broader (parent categories), narrower (subcategories), and related (associated concepts).

    Output Rules:
    - Do not provide conversational filler.
    - Output the extracted.md text inside a Markdown block.
    - Followed immediately by the index.json text block in valid JSON format.
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: `Process this ${type} content using the Bundle Method:\n\n${text}` }] }],
    config: { systemInstruction }
  }));

  const fullText = response.text || "";
  
  // Extract Markdown block
  const mdMatch = fullText.match(/```markdown\n([\s\S]*?)\n```/) || fullText.match(/```\n([\s\S]*?)\n```/);
  const markdown = mdMatch ? mdMatch[1] : fullText.split('```json')[0].trim();

  // Extract JSON block
  const jsonMatch = fullText.match(/```json\n([\s\S]*?)\n```/);
  let metadata = {};
  try {
    if (jsonMatch) {
      metadata = JSON.parse(jsonMatch[1]);
    } else {
      // Fallback: search for first { and last }
      const start = fullText.lastIndexOf('{');
      const end = fullText.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        metadata = JSON.parse(fullText.substring(start, end + 1));
      }
    }
  } catch (e) {
    console.warn("Failed to parse metadata JSON from bundle output", e);
  }

  return {
    markdown: markdown || fullText,
    metadata: {
      ...metadata,
      processedAt: Date.now(),
      engine: model
    }
  };
};

export const auditPlotThreads = async (
  chapters: { title: string, content: string }[], 
  timeline: TimelineEvent[]
): Promise<{ id: string; type: 'character' | 'mystery' | 'plot-point'; content: string; message: string }[]> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";

  const manuscriptText = chapters.map(c => `Chapter: ${c.title}\n${c.content.substring(0, 2000)}`).join('\n\n');
  const timelineSummary = timeline.map(e => `- ${e.title}: ${e.description}`).join('\n');

  const prompt = `
You are Merlin, a master narrative auditor.
Analyze the following manuscript excerpts and timeline for "Dead Threads"—mysteries, characters, or plot setups introduced early on that have no resolution, appearance, or impact in the later parts of the story.

MANUSCRIPT:
${manuscriptText}

TIMELINE:
${timelineSummary}

Return a JSON array of objects:
[{ "id": "uuid", "type": "character|mystery|plot-point", "content": "Name/Subject", "message": "Why it is a dead thread" }]
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["character", "mystery", "plot-point"] },
              content: { type: Type.STRING },
              message: { type: Type.STRING }
            },
            required: ["id", "type", "content", "message"]
          }
        }
      }
    }));
    return safeJsonParse(response.text, []);
  } catch (err) {
    console.error("Plot Audit Error:", err);
    return [];
  }
};

export const analyzeSourceForCodex = async (sourceContent: string, question: string): Promise<string> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";

  const prompt = `
You are a knowledge extraction assistant helping build a Story Codex from reference materials.

SOURCE MATERIAL:
${sourceContent.substring(0, 8000)}

USER QUESTION:
${question}

Provide a helpful, concise answer based on the source material that could help populate the Story Codex (systems, settings, characters, lore, artifacts, etc.). Focus on extracting factual information that would be useful for worldbuilding or understanding the story context.
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    }));
    return response.text;
  } catch (err) {
    console.error("Source Analysis Error:", err);
    throw new Error("Failed to analyze source material. Please try again.");
  }
};

export const scanForContinuityErrors = async (
  manuscript: string, 
  projectData: ProjectData
): Promise<ContinuityError[]> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";

  const entityData = {
    characters: projectData.characters.map(c => ({ name: c.name, traits: c.traits, physical: c.physicalFeatures })),
    locations: projectData.locations.map(l => ({ name: l.name, type: l.type, description: l.description })),
    timeline: projectData.timeline.map(e => ({ title: e.title, date: e.date }))
  };

  const systemInstruction = `You are a master continuity editor. 
  Your goal is to find factual contradictions between the provided manuscript and the existing world database.
  Look for:
  1. Physical changes (e.g. eye color, height).
  2. Temporal errors (e.g. traveling impossible distances in short time).
  3. Character details (e.g. name spellings, relative relationships).
  4. Setting details.
  
  Return strictly a JSON array of ContinuityError objects.`;

  const prompt = `
  EXISTING DATABASE:
  ${JSON.stringify(entityData)}

  MANUSCRIPT SNIPPET:
  ${manuscript.substring(0, 50000)}
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["character", "location", "timeline", "artifact", "lore", "general"] },
              severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
              message: { type: Type.STRING },
              context: { type: Type.STRING },
              entityIds: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["id", "type", "severity", "message", "context"]
          }
        }
      }
    }));
    const errors = safeJsonParse(response.text, []);
    return errors.map((e: any) => ({ ...e, id: e.id || generateId() }));
  } catch (err) {
    console.error("Continuity Scan Error:", err);
    return [];
  }
};

export const extractEntitySpans = async (
  text: string, 
  projectData: ProjectData
): Promise<EntitySpan[]> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-2.0-flash";

  const entities = [
    ...projectData.characters.map(c => ({ id: c.id, name: c.name, type: 'character' as const })),
    ...projectData.locations.map(l => ({ id: l.id, name: l.name, type: 'location' as const })),
    ...projectData.lore?.map(l => ({ id: l.id, name: l.term, type: 'lore' as const })) || []
  ];

  const systemInstruction = `You are a text analysis engine. Find all mentions of the provided entities within the text. 
  Return strictly a JSON array of EntitySpan objects with start/end character offsets.
  The offsets must be accurate for the provided text.`;

  const prompt = `
  ENTITIES TO FIND:
  ${JSON.stringify(entities)}

  TEXT:
  ${text.substring(0, 10000)}
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              entityId: { type: Type.STRING },
              entityName: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["character", "location", "artifact", "lore"] },
              start: { type: Type.INTEGER },
              end: { type: Type.INTEGER },
              snippet: { type: Type.STRING }
            },
            required: ["entityId", "entityName", "type", "start", "end", "snippet"]
          }
        }
      }
    }));
    return safeJsonParse(response.text, []);
  } catch (err) {
    console.error("Entity Span Extraction Error:", err);
    return [];
  }
};
