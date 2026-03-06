import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { ManuscriptAnalysisResponse, Note, ProjectData, Character, Relationship, Artifact, LoreEntry, TimelineEvent, AnalysisOptions, Language, Plotline, MatrixCell, AppPrompts } from "../types";
import { getAppPrompts, generateId, getApiKey, saveApiKey } from "./storageService";

let initializedApiKey: string | null = null;

export const initializeApiKey = async () => {
  initializedApiKey = process.env.GEMINI_API_KEY || await getApiKey('gemini_api_key');
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

const unifiedAnalysisSchema = {
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
          description: { type: Type.STRING },
          traits: { type: Type.ARRAY, items: { type: Type.STRING } },
        }
      }
    },
    minorCharacters: { type: Type.ARRAY, items: { type: Type.STRING } },
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
  GENERAL_AND_CHARACTERS: "Extract title, summary, characters, and themes.",
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
  PROJECT_QA: "Answer the question using the provided context.",
  MISSPELLINGS_SCAN: 'Find misspellings of "{name}".',
  TOOLBOX_URL_ANALYSIS: "Analyze this URL for creative writer utility.",
  GENERATE_CONLANG_WORD: 'Construct a word for "{word}" in "{langName}".',
  CONNECT_NOTES: "Synthesize these notes into a narrative thread.",
  AI_MODEL: "gemini-3-flash-preview"
};

const getCurrentPrompts = async (): Promise<AppPrompts> => {
  const saved = await getAppPrompts();
  return { ...DEFAULT_PROMPTS, ...(saved || {}) };
};

export const analyzeManuscript = async (text: string, tokenLimit?: number, options?: AnalysisOptions): Promise<ManuscriptAnalysisResponse> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";

  // Determine intelligent chunk size based on model
  let maxChars = 150000; // Default safe limit
  if (model.includes('1.5') || model.includes('3.1')) {
    maxChars = 800000; // Models with huge context
  } else if (model.includes('3-flash')) {
    maxChars = 400000;
  }

  const actualLimit = tokenLimit || maxChars;
  const textLength = text.length;

  const systemInstruction = `You are a world-class story architect. Perform a scan of the provided manuscript snippet and extract a structured living encyclopedia. Return strictly JSON.`;

  // Intelligent Chunking Strategy:
  // If text is within limits, process normally.
  // If text is significantly larger, take Start, Middle, and End chunks to get a full narrative overview.
  const chunks: string[] = [];
  if (textLength <= actualLimit) {
    chunks.push(text);
  } else {
    // Take Start
    chunks.push(text.substring(0, actualLimit));
    // Take Middle
    const mid = Math.floor(textLength / 2);
    const midStart = Math.max(0, mid - Math.floor(actualLimit / 2));
    chunks.push(text.substring(midStart, midStart + actualLimit));
    // Take End
    chunks.push(text.substring(Math.max(0, textLength - actualLimit)));
  }

  const results = await Promise.all(chunks.map(async (chunk) => {
    const res = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: chunk }] }],
      config: { 
        systemInstruction,
        responseMimeType: "application/json", 
        responseSchema: unifiedAnalysisSchema
      }
    });
    return safeJsonParse(res.text, {});
  }));

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
    urls: []
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
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";
  const systemInstruction = "Identify novel structure patterns (Acts, Chapters, Scenes) from the text. Return JSON with Javascript Regex strings (using ^ for start-of-line).";

  const response = await ai.models.generateContent({
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
  });

  return safeJsonParse(response.text, { actPattern: "^Part\\s+[0-9]+", chapterPattern: "^Chapter\\s+[0-9]+", scenePattern: "^\\*\\*\\*" });
};

export const getEvocativeTitles = async (scenes: {id: string, content: string}[]): Promise<{id: string, title: string}[]> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";

  const payload = scenes.map(s => `ID: ${s.id}\nCONTENT: ${s.content.substring(0, 500)}`).join('\n\n---\n\n');

  const response = await ai.models.generateContent({
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
  });

  return safeJsonParse(response.text, []);
};

export const doubleProcessNote = async (rawNote: string): Promise<{ expanded: string, summary: string, tags: string[] }> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";

  const expansionRes = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: `${prompts.NOTE_ENHANCEMENT}\n\nNote: ${rawNote}` }] }]
  });
  const expandedText = expansionRes.text || rawNote;

  const processingRes = await ai.models.generateContent({
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
  });

  const meta = safeJsonParse(processingRes.text, { summary: "", tags: [] });
  return {
    expanded: expandedText,
    summary: meta.summary + (meta.insights ? `\n\nInsight: ${meta.insights}` : ""),
    tags: meta.tags || []
  };
};

export const generateBookCover = async (title: string, author: string, summary: string): Promise<string | null> => {
  const ai = getAiClient();
  const prompt = `Book cover for "${title}" by ${author}. Summary: ${summary}. Atmospheric, high quality, no text.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
  });
  const candidate = response.candidates?.[0];
  if (!candidate || !candidate.content || !candidate.content.parts) return null;

  for (const part of candidate.content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const processRawNotes = async (text: string): Promise<{content: string, category: string, tags: string[], analysis: string}[]> => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";
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
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";
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
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";
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
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";
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
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";
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
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Construct word for "${word}" based on phonology rules of ${language.name}`,
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
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";
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
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";
  const eventData = events.map(e => e.title).join(', ');
  const response = await ai.models.generateContent({
    model,
    contents: `Identify major subplots and development beats: ${eventData}`,
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
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";
  
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
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";
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
  
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  
  return response.text || "Research analysis failed.";
};

/**
 * Generic chat function for the AI Assistant.
 */
export const chatWithAssistant = async (
  message: string, 
  projectData: ProjectData | null, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[] = [],
  context: string = ''
) => {
  const ai = getAiClient();
  const prompts = await getCurrentPrompts();
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";
  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction: `You are the Plothole Story Architect, a world-class narrative consultant. 
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
  const model = prompts.AI_MODEL || "gemini-3-flash-preview";

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
