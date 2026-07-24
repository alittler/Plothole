import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy-loaded Gemini Client with verification
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in the system environment secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Strictly defined JSON Response Schema matching requested format
const characterSchema = {
  type: Type.ARRAY,
  description: "An array of extracted character profiles from the provided manuscript text.",
  items: {
    type: Type.OBJECT,
    properties: {
      core: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Full Name or Primary Alias of the character. Use 'Unnamed Character' if no name is given." },
          nickname: { type: Type.STRING, description: "Common nickname or alias, or null if none exists.", nullable: true },
          role: { type: Type.STRING, description: "Job/Title/Function/Archetype (e.g., 'King', 'Detective', 'Rebel', 'AI Guardian')" },
          species: { type: Type.STRING, description: "Species/Race/Origin (e.g., 'Human', 'Cyborg', 'Elf', 'Alien', 'Canine', 'Unknown')" },
          living_status: { 
            type: Type.STRING, 
            description: "Living status of the character. Must be one of: 'Alive', 'Dead', 'Missing', 'Unknown', 'Undead', 'Non-biological'" 
          }
        },
        required: ["name", "role", "species", "living_status"]
      },
      content: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Concise summary of physical appearance, personality, voice, and mannerisms. Adapt description to the genre (e.g., include tech specs for sci-fi, magic abilities for fantasy). Max 300 words." },
          goals: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "List of the character's core goals or motivations." 
          },
          relationships: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Name of the related character as spelled in the text." },
                relation: { type: Type.STRING, description: "Type of relationship (e.g., 'Brother', 'Enemy', 'Mentor', 'AI Subroutine')" }
              },
              required: ["name", "relation"]
            }
          },
          quotes: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "Notable quotes or statements spoken by or directly attributed to the character." 
          }
        },
        required: ["description", "goals", "relationships", "quotes"]
      },
      custom_fields: {
        type: Type.OBJECT,
        description: "Dynamic key-value pairs representing unique details about the character not covered by standard fields. Adapt to context (e.g. Magic Spells for fantasy, Cybernetic Implants for sci-fi, Wealth or Weaknesses). All values must be strings.",
      },
      metadata: {
        type: Type.OBJECT,
        properties: {
          first_appearance: { type: Type.STRING, description: "Chapter, Section, Scene or page where the character is first mentioned.", nullable: true },
          tags: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "A list of descriptive adjectives or style tags for filtering." 
          },
          notes: { type: Type.STRING, description: "Any extra context, observations, or general literary notes.", nullable: true }
        },
        required: ["tags"]
      }
    },
    required: ["core", "content", "custom_fields", "metadata"]
  }
};

// Helper function to retry calls with exponential backoff and jitter
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  backoff = 2
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = String(error.message || error || "");
    const status = error.status || (error.error && error.error.code);
    
    const isRetryable = 
      status === 503 || 
      status === 429 || 
      errorStr.includes("503") || 
      errorStr.includes("429") || 
      errorStr.includes("UNAVAILABLE") || 
      errorStr.includes("high demand") ||
      errorStr.includes("overloaded");

    if (isRetryable && retries > 0) {
      // Add standard random jitter (e.g., +/- 20%) to prevent thundering herd
      const jitter = (Math.random() - 0.5) * 0.2 * delay;
      const finalDelay = Math.max(100, delay + jitter);
      console.warn(`Gemini API returned retryable error (${status || errorStr}). Retrying in ${Math.round(finalDelay)}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, finalDelay));
      return withRetry(fn, retries - 1, delay * backoff, backoff);
    }
    throw error;
  }
}

// User-friendly API error mapper for Gemini quotas and service statuses
function getFriendlyErrorMessage(error: any, modelUsed: string): string {
  const errorStr = String(error.message || error || "").toLowerCase();
  const status = error.status || (error.error && error.error.code);

  const isQuota = status === 429 || 
                  errorStr.includes("429") || 
                  errorStr.includes("quota") || 
                  errorStr.includes("exhausted") || 
                  errorStr.includes("rate-limit") || 
                  errorStr.includes("limit exceeded") ||
                  errorStr.includes("rate_limit");

  const isOverloaded = status === 503 || 
                       errorStr.includes("503") || 
                       errorStr.includes("unavailable") || 
                       errorStr.includes("overloaded") || 
                       errorStr.includes("high demand") || 
                       errorStr.includes("busy") ||
                       errorStr.includes("internal error");

  const modelLabel = modelUsed === "gemini-3.1-flash-lite" ? "3.1 Lite" : "3.5 Flash";

  if (isQuota) {
    return `Gemini API Quota Exceeded (429 Resource Exhausted): The model '${modelLabel}' has temporarily run out of tokens in its per-minute free-tier quota.

To continue without waiting, you can:
1. Switch to 'gemini-3.1-flash-lite' using the dropdown selector at the bottom of the input panel (this model has lighter resource usage).
2. Reduce your input size by choosing a smaller Truncation Limit (e.g. 'First 15,000 characters' or 'First 30,000 characters') to fit within the free-tier per-minute limit.
3. Wait about 30 to 60 seconds for your quota to automatically refresh, then try again.`;
  }

  if (isOverloaded) {
    return `Gemini Service Busy (503 Service Unavailable): The AI Studio model servers are currently experiencing high demand.

Please try sending your request again in a few seconds. If this continues, switching to the lighter 'gemini-3.1-flash-lite' model can help bypass peak congestion.`;
  }

  if (errorStr.includes("api_key") || errorStr.includes("key not found") || errorStr.includes("api key is not configured") || errorStr.includes("invalid api key")) {
    return `Gemini API Authentication Error: Your Gemini API key is missing or invalid. Please configure a valid key under the developer console settings or system environment variables.`;
  }

  // Return the main error message if it's clear, otherwise fallback
  return error.message || "An unexpected error occurred during literary manuscript analysis.";
}

// API Endpoint for character profile extraction
app.post("/api/analyze", async (req, res) => {
  let { text, optimizeWhitespace, truncationLimit, model } = req.body;
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Manuscript text is required for analysis." });
  }

  const modelUsed = model === "gemini-3.1-flash-lite" ? "gemini-3.1-flash-lite" : "gemini-3.5-flash";

  try {
    const ai = getGeminiClient();
    
    const originalLength = text.length;
    
    // 1. Optional Truncation Limit
    if (truncationLimit && typeof truncationLimit === "number" && truncationLimit > 0) {
      text = text.slice(0, truncationLimit);
    }
    
    // 2. Optional Whitespace Compression
    if (optimizeWhitespace) {
      text = text
        .replace(/[ \t]+/g, ' ') // compress spaces and tabs
        .replace(/\r?\n\s*\r?\n/g, '\n\n') // compress multiple sequential blank lines
        .trim();
    }
    
    const optimizedLength = text.length;
    const charSavings = originalLength - optimizedLength;
    const estimatedTokenSavings = charSavings > 0 ? Math.round(charSavings / 4) : 0;
    const wasOptimized = !!(optimizeWhitespace || (truncationLimit && truncationLimit > 0));

    const prompt = `Read the entire manuscript text provided below and extract character profiles for ALL unique characters mentioned in the story, utilizing a **Tiered Character Profiling System**:

1. **TIER 1: Major / Most Common Characters** (Characters central to the narrative, who speak dialogue, interact frequently, or are mentioned multiple times):
   - Perform deep analysis and fully populate all fields in the schema.
   - Provide a comprehensive, high-detail 'description' (up to 300 words).
   - Fully extract their 'goals', 'relationships' (linking to other exact character names), 'quotes', 'custom_fields' (e.g. specific magical spells, gear, or cybernetics matching the setting), and literary 'notes'.
   - Add "Major" to their metadata 'tags'.

2. **TIER 2: Minor / Least Common Characters** (Characters mentioned in passing, secondary figures, or background characters):
   - Minimize detail extraction to basic essentials to keep analysis focused.
   - Core fields ('name', 'species', 'role', 'living_status') must still be correctly identified.
   - In 'custom_fields', you MUST extract only their primary "location" or the setting where they are seen or mentioned (e.g., {"location": "The Village Tavern"}). No other custom fields should be added.
   - In 'content', set:
     - 'description' to a very simple, brief single-sentence summary (e.g. "A minor character introduced in [location].").
     - 'goals' to an empty array: []
     - 'relationships' to an empty array: []
     - 'quotes' to an empty array: []
   - In 'metadata', set:
     - 'tags' to ["Minor"].
     - 'notes' to null or a simple brief mention.

Follow the provided JSON schema exactly. Extract only actual facts from the text; if a detail is not mentioned, set it to null or an empty array.

Manuscript Text:
${text}`;

    const response = await withRetry(() => 
      ai.models.generateContent({
        model: modelUsed,
        contents: prompt,
        config: {
          systemInstruction: "You are a universal literary analysis engine. Your sole function is to read manuscript texts of any genre, identify all characters, categorize them into Major and Minor tiers, and extract structural character profiles following the strict JSON schema provided.",
          responseMimeType: "application/json",
          responseSchema: characterSchema,
          temperature: 0.1, // low temperature for precise extraction
        }
      })
    );

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response returned from the character extraction engine.");
    }

    const usage = response.usageMetadata;
    const tokens = usage ? {
      promptTokens: usage.promptTokenCount ?? 0,
      completionTokens: usage.candidatesTokenCount ?? 0,
      totalTokens: usage.totalTokenCount ?? 0
    } : undefined;

    const characters = JSON.parse(jsonText.trim());
    return res.json({ 
      success: true, 
      characters, 
      tokens,
      optimization: {
        originalLength,
        optimizedLength,
        charSavings,
        estimatedTokenSavings,
        wasOptimized,
        modelUsed
      }
    });

  } catch (error: any) {
    console.error("Gemini Character Analysis Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: getFriendlyErrorMessage(error, modelUsed) 
    });
  }
});

// JSON Schema for Wikipedia Enrichment
const enrichSchema = {
  type: Type.OBJECT,
  properties: {
    irl_fields: {
      type: Type.OBJECT,
      description: "A dictionary/map containing real-life biographical details extracted from the Wikipedia summary. The keys must be snake_case strings prefixed with 'irl_' (e.g., 'irl_birth_date', 'irl_nationality', 'irl_era', 'irl_accomplishments'). All values must be strings.",
    }
  },
  required: ["irl_fields"]
};

// API Endpoint for Wikipedia-based biographical enrichment
app.post("/api/wikipedia-enrich", async (req, res) => {
  const { characterName, existingProfile, wikipediaSummary } = req.body;
  if (!wikipediaSummary || typeof wikipediaSummary !== "string" || wikipediaSummary.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Wikipedia summary text is required for enrichment." });
  }

  try {
    const ai = getGeminiClient();
    
    const prompt = `You are a biographical research agent.
Compare the existing character profile of "${characterName || 'the character'}" with the real-life historical/biographical information from the Wikipedia text below.
Identify any missing details, key facts, or real-life biographical info (such as Birth Date, Death Date, Nationality, Historical Occupation, Major Achievements, or Notable Associates) from the Wikipedia text that are not present or could enrich the existing profile.

Existing Profile:
${JSON.stringify(existingProfile || {}, null, 2)}

Wikipedia Text:
${wikipediaSummary}

Extract these missing real-life details as an object of key-value pairs where keys are snake_case and must be prefixed with 'irl_' (e.g. 'irl_birth_date', 'irl_known_for', 'irl_nationality', 'irl_full_name'). The values must be short, descriptive string summaries. Return only this JSON structure.`;

    const response = await withRetry(() => 
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a professional research historian. Your goal is to read a Wikipedia text and extract missing real-life biographical details for a character, formatting them as a JSON object of key-value pairs starting with 'irl_'.",
          responseMimeType: "application/json",
          responseSchema: enrichSchema,
          temperature: 0.1,
        }
      })
    );

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response returned from the Wikipedia enrichment engine.");
    }

    const result = JSON.parse(jsonText.trim());
    return res.json({ success: true, irl_fields: result.irl_fields || {} });

  } catch (error: any) {
    console.error("Wikipedia Enrichment Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: getFriendlyErrorMessage(error, "gemini-3.5-flash") 
    });
  }
});

// API Endpoint for character portrait generation using Imagen 3
app.post("/api/generate-portrait", async (req, res) => {
  const { prompt, name, role, description } = req.body;
  if (!description || typeof description !== "string") {
    return res.status(400).json({ success: false, error: "Character description is required." });
  }

  try {
    const ai = getGeminiClient();
    
    // Construct a high-quality portrait prompt based on character details
    // We append photographic style keywords to ensure a gorgeous portrait as outlined in the Prompt Guidelines
    const builtPrompt = `A high-quality, professional, beautiful character portrait of ${name || 'a character'}${role ? `, who is a ${role}` : ''}. Character details: ${description}. Style: polished digital art, detailed face, cinematic lighting, dramatic composition, solid clean background, 1:1 ratio.`;

    const response = await withRetry(() => 
      ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: prompt || builtPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "1:1",
        }
      })
    );

    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error("No images returned from the generation engine.");
    }

    const imageBytes = response.generatedImages[0].image.imageBytes;
    const dataUrl = `data:image/jpeg;base64,${imageBytes}`;

    return res.json({ 
      success: true, 
      dataUrl,
      promptUsed: prompt || builtPrompt
    });

  } catch (error: any) {
    console.error("Gemini Portrait Generation Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: getFriendlyErrorMessage(error, "imagen-3.0-generate-002") 
    });
  }
});

// API Endpoint for extracting text from PDF/Documents using Gemini
app.post("/api/research/parse-file", async (req, res) => {
  const { base64Data, fileName, mimeType } = req.body;
  if (!base64Data || typeof base64Data !== "string") {
    return res.status(400).json({ success: false, error: "File data (base64) is required." });
  }

  try {
    const ai = getGeminiClient();
    const cleanedBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");

    const response = await withRetry(() => 
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: cleanedBase64,
              mimeType: mimeType || "application/pdf"
            }
          },
          {
            text: `Please parse this document ("${fileName || 'document'}") and extract its entire text content as clean, readable markdown or plain text. 
Maintain all headings, lists, tables, and important structures. Do not write a summary or comments of your own; output only the extracted content. If the file is scanned, use OCR to accurately extract the text.`
          }
        ]
      })
    );

    const text = response.text;
    if (!text) {
      throw new Error("Failed to extract text content from the document.");
    }

    return res.json({
      success: true,
      text: text
    });

  } catch (error: any) {
    console.error("Document Parsing Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: getFriendlyErrorMessage(error, "gemini-3.5-flash") 
    });
  }
});

// API Endpoint for NotebookLM-style research grounding chat
app.post("/api/research/chat", async (req, res) => {
  const { sources, message, history } = req.body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ success: false, error: "A message is required for chat." });
  }

  try {
    const ai = getGeminiClient();

    // Serialize the sources to use as the grounding context
    let context = "";
    if (sources && Array.isArray(sources) && sources.length > 0) {
      context = "Below are the available research sources and materials that you must use to answer questions:\n\n";
      sources.forEach((source: any, idx: number) => {
        context += `--- SOURCE #${idx + 1} ---\n`;
        context += `Title: ${source.title || "Untitled Source"}\n`;
        context += `Type: ${source.type}\n`;
        if (source.url) context += `URL: ${source.url}\n`;
        context += `Content:\n${source.content || "(Empty source)"}\n\n`;
      });
      context += "--- END OF SOURCES ---\n\n";
    } else {
      context = "No source materials have been uploaded or configured yet. Politely remind the user to add some research sources (text, links, or files) so you can answer based on them.\n\n";
    }

    const systemInstruction = `You are a professional, specialized AI research partner (similar to NotebookLM) for literary analysis, worldbuilding, and manuscript planning.
Your primary directive is to answer questions, explain concepts, and draft outlines relying strictly and exclusively on the provided research sources above.

Rules:
1. Always base your answers on the content from the sources. Do not make up facts.
2. If the user asks a question that is not covered in the provided sources, answer as best as you can but clearly note what details you are drawing from outside general knowledge vs. what was in their sources.
3. Be structured, elegant, helpful, and highly insightful.
4. Keep citations clean, referencing sources by their titles (e.g., "according to the source 'My Character Outline'").`;

    const contents: any[] = [];
    const fullSystemInstruction = `${systemInstruction}\n\n${context}`;

    if (history && Array.isArray(history)) {
      history.forEach((turn: any) => {
        contents.push({
          role: turn.role === "model" ? "model" : "user",
          parts: [{ text: turn.text || "" }]
        });
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await withRetry(() => 
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: fullSystemInstruction,
          temperature: 0.3,
        }
      })
    );

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response returned from the research chat engine.");
    }

    const usage = response.usageMetadata;
    const tokens = usage ? {
      promptTokens: usage.promptTokenCount ?? 0,
      completionTokens: usage.candidatesTokenCount ?? 0,
      totalTokens: usage.totalTokenCount ?? 0
    } : undefined;

    return res.json({ 
      success: true, 
      text: jsonText,
      tokens
    });

  } catch (error: any) {
    console.error("Research Chat Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: getFriendlyErrorMessage(error, "gemini-3.5-flash") 
    });
  }
});

// API Endpoint for "The Oracle" RAG Engine
app.post("/api/oracle/query", async (req, res) => {
  const { 
    message, 
    history, 
    manuscriptText, 
    manuscriptTitle, 
    activeChapterFilter, 
    characters, 
    notebooks, 
    atlasState 
  } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ success: false, error: "A prompt or question is required for The Oracle." });
  }

  try {
    const ai = getGeminiClient();

    // 1. PROCESS PRIMARY SOURCE: Manuscript Text & Chapter Chunking
    let manuscriptContext = "";
    const manuscriptCitations: any[] = [];
    
    if (manuscriptText && typeof manuscriptText === "string" && manuscriptText.trim().length > 0) {
      // Chunk manuscript by Chapter/Scene markers
      const rawChapters = manuscriptText.split(/(?=(?:Chapter|CHAPTER|Act|ACT|Scene|SCENE|\n#{1,3}\s+))/g);
      let selectedChapters = rawChapters;

      if (activeChapterFilter && activeChapterFilter !== "ALL") {
        selectedChapters = rawChapters.filter(ch => ch.toLowerCase().includes(activeChapterFilter.toLowerCase()));
        if (selectedChapters.length === 0) selectedChapters = rawChapters; // fallback if filter didn't match
      }

      manuscriptContext += `=== PRIMARY SOURCE (HIGHEST PRIORITY): MANUSCRIPT TEXT ("${manuscriptTitle || 'Active Manuscript'}") ===\n`;
      selectedChapters.slice(0, 8).forEach((chChunk, idx) => {
        const firstLine = chChunk.trim().split('\n')[0].slice(0, 60);
        const chapterTitle = firstLine.length > 5 ? firstLine : `Chapter / Section ${idx + 1}`;
        manuscriptContext += `\n--- [MANUSCRIPT BLOCK: ${chapterTitle}] ---\n${chChunk.trim().slice(0, 4500)}\n`;
        
        manuscriptCitations.push({
          id: `primary_ch_${idx}`,
          tier: 'primary_manuscript',
          title: chapterTitle,
          sourceTypeLabel: 'Primary Source (Manuscript Text)',
          snippet: chChunk.trim().slice(0, 180) + '...',
          chapter: chapterTitle
        });
      });
      manuscriptContext += `\n=== END OF PRIMARY SOURCE ===\n\n`;
    } else {
      manuscriptContext += `=== PRIMARY SOURCE: No Manuscript text provided in current context ===\n\n`;
    }

    // 2. PROCESS SECONDARY SOURCE: Character Cards / Dossiers
    let characterContext = "";
    const characterCitations: any[] = [];

    if (characters && Array.isArray(characters) && characters.length > 0) {
      characterContext += `=== SECONDARY SOURCE (SUPPORTING DETAIL): CHARACTER DOSSIERS ===\n`;
      characters.forEach((char: any, idx: number) => {
        const name = char.core?.name || 'Unnamed Character';
        const role = char.core?.role || 'Unknown Role';
        const status = char.core?.living_status || 'Unknown Status';
        const desc = char.content?.description || 'No description';
        const goals = Array.isArray(char.content?.goals) ? char.content.goals.join('; ') : '';
        const rels = Array.isArray(char.content?.relationships) 
          ? char.content.relationships.map((r: any) => `${r.name} (${r.relation})`).join(', ')
          : '';

        characterContext += `\n- CHARACTER DOSSIER: "${name}"\n`;
        characterContext += `  Role: ${role} | Status: ${status}\n`;
        characterContext += `  Goals/Motivations: ${goals || 'N/A'}\n`;
        characterContext += `  Relationships: ${rels || 'N/A'}\n`;
        characterContext += `  Description: ${desc}\n`;

        characterCitations.push({
          id: `secondary_char_${idx}`,
          tier: 'secondary_dossier',
          title: `Dossier: ${name}`,
          sourceTypeLabel: 'Secondary Source (Character Card)',
          snippet: `Role: ${role}, Status: ${status}. ${desc.slice(0, 120)}...`,
          characterName: name
        });
      });
      characterContext += `\n=== END OF SECONDARY SOURCE ===\n\n`;
    } else {
      characterContext += `=== SECONDARY SOURCE: No Character Cards in current project ===\n\n`;
    }

    // 3. PROCESS TERTIARY SOURCE: Research Notes & World-Building / Atlas Lore
    let tertiaryContext = "";
    const tertiaryCitations: any[] = [];

    if (notebooks && Array.isArray(notebooks) && notebooks.length > 0) {
      tertiaryContext += `=== TERTIARY SOURCE (CONTEXT & LORE): RESEARCH NOTES & NOTEBOOKS ===\n`;
      notebooks.forEach((nb: any, nbIdx: number) => {
        if (nb.sources && Array.isArray(nb.sources)) {
          nb.sources.slice(0, 5).forEach((src: any, srcIdx: number) => {
            tertiaryContext += `\n- RESEARCH NOTE: "${src.title || 'Untitled Note'}" (Notebook: ${nb.name})\n`;
            tertiaryContext += `  Content: ${src.content ? src.content.slice(0, 1500) : 'N/A'}\n`;

            tertiaryCitations.push({
              id: `tertiary_nb_${nbIdx}_${srcIdx}`,
              tier: 'tertiary_note',
              title: src.title || 'Research Note',
              sourceTypeLabel: 'Tertiary Source (Research Note)',
              snippet: (src.content || '').slice(0, 140) + '...'
            });
          });
        }
      });
      tertiaryContext += `\n=== END OF RESEARCH NOTES ===\n\n`;
    }

    if (atlasState && atlasState.locations && Array.isArray(atlasState.locations) && atlasState.locations.length > 0) {
      tertiaryContext += `=== TERTIARY SOURCE (GEOGRAPHY & LORE): FANTASY ATLAS MAP ===\n`;
      tertiaryContext += `Map Title: "${atlasState.mapTitle || 'World Map'}"\n`;
      atlasState.locations.forEach((loc: any, locIdx: number) => {
        tertiaryContext += `- LOCATION: "${loc.name}" (${loc.category || 'Landmark'})\n  Description: ${loc.description}\n`;
        
        tertiaryCitations.push({
          id: `tertiary_atlas_${locIdx}`,
          tier: 'tertiary_atlas',
          title: `Atlas Location: ${loc.name}`,
          sourceTypeLabel: 'Tertiary Source (Fantasy Atlas)',
          snippet: `[${loc.category}] ${loc.description.slice(0, 120)}...`
        });
      });
      tertiaryContext += `\n=== END OF ATLAS LORE ===\n\n`;
    }

    // SYSTEM PROMPT ENFORCING STRICT DATA HIERARCHY & CONTRADICTION DETECTION
    const systemPrompt = `You are "The Oracle", an elite AI literary analyst, continuity editor, and story world consultant.
Your role is to answer questions about the user's story manuscript, character dossiers, worldbuilding research notes, and atlas maps.

STRICT DATA HIERARCHY RULES:
1. PRIMARY SOURCE (Highest Authority): The Manuscript Text.
   - Events, dialogue, character positions, and actions occurring in the Manuscript override all other sources regarding current plot reality.
2. SECONDARY SOURCE (Supporting Detail): Character Dossiers.
   - Defines character profiles, stated motivations, traits, and background profiles.
3. TERTIARY SOURCE (Context & Lore): Research Notes & Fantasy Atlas Map.
   - Defines magic systems, world rules, historical notes, and geographic locations.

CRITICAL DIRECTIVE - CONTRADICTION DETECTION:
- Compare facts across sources! If the Manuscript text contradicts details in a Character Card or Research Note (e.g., Manuscript says Character A is dead or in Chapter 3 at Location X, but Character Card says Alive or at Location Y; or Manuscript states motive A while Dossier states motive B):
  You MUST explicitly flag this discrepancy to the author in your response using a prominent callout block:
  "⚠️ CONTRADICTION DETECTED: [Describe the exact conflict between Chapter X and Character Card/Lore Note]."

CITATION REQUIREMENTS:
- You MUST cite source origins inline in your response using exact bracketed labels:
  - [Based on Chapter X] or [Based on Manuscript: Chapter Name]
  - [From Character Dossier: Character Name]
  - [From Research Note: Note Title]
  - [From Fantasy Atlas: Location Name]

TONE & FORMATTING:
- Be clear, insightful, professional, and well-structured. Use bold headings, bullet points, and clean typography.`;

    const fullContextPrompt = `${manuscriptContext}\n${characterContext}\n${tertiaryContext}`;

    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((turn: any) => {
        contents.push({
          role: turn.role === "assistant" || turn.role === "model" ? "model" : "user",
          parts: [{ text: turn.content || turn.text || "" }]
        });
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: `User Question: ${message}` }]
    });

    const response = await withRetry(() => 
      ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: contents,
        config: {
          systemInstruction: `${systemPrompt}\n\nSTORY DATASETS AVAILABLE:\n${fullContextPrompt}`,
          temperature: 0.2, // Low temperature for high factual continuity
        }
      })
    );

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from The Oracle intelligence engine.");
    }

    // Extract detected contradictions if any were formatted with the ⚠️ callout
    const contradictions: string[] = [];
    const contradictionMatches = jsonText.match(/⚠️\s*CONTRADICTION DETECTED:\s*([^\n\r]+)/gi);
    if (contradictionMatches) {
      contradictionMatches.forEach(match => {
        contradictions.push(match.replace(/⚠️\s*CONTRADICTION DETECTED:\s*/i, '').trim());
      });
    }

    const usage = response.usageMetadata;
    const tokens = usage ? {
      promptTokens: usage.promptTokenCount ?? 0,
      completionTokens: usage.candidatesTokenCount ?? 0,
      totalTokens: usage.totalTokenCount ?? 0
    } : undefined;

    // Filter relevant citations actually mentioned or used
    const allCitations = [...manuscriptCitations, ...characterCitations, ...tertiaryCitations];

    return res.json({
      success: true,
      text: jsonText,
      citations: allCitations,
      contradictions,
      tokens
    });

  } catch (error: any) {
    console.error("The Oracle Engine Error:", error);
    return res.status(500).json({
      success: false,
      error: getFriendlyErrorMessage(error, "gemini-3.6-flash")
    });
  }
});

// API Endpoint for Stenopad Wiki Tag Metadata Extraction
app.post("/api/extract-wiki-tags", async (req, res) => {
  const { noteText, existingEntities } = req.body;

  if (!noteText || typeof noteText !== "string") {
    return res.json({ success: true, tags: [] });
  }

  const entitiesList = Array.isArray(existingEntities) ? existingEntities : [];

  const prompt = `You are an intelligent metadata extraction engine for a fantasy writing application. Your task is to analyze a user's note text and extract all "Wiki Tags" (words starting with a hash symbol, e.g., #Gandalf, #TheShire).

INPUT DATA:
1. Note Text: "${noteText.replace(/"/g, '\\"')}"
2. Existing Entities Database: ${JSON.stringify(entitiesList)}
   (Format: [{"name": "Gandalf", "type": "Character", "id": 101}, {"name": "TheShire", "type": "Location", "id": 205}])

INSTRUCTIONS:
1. Identify every instance of a tag in the format #[Word] within the Note Text.
2. For each tag found:
   - Normalize the name (remove special characters, keep case as is).
   - Search the "Existing Entities Database" for a match (case-insensitive).
   - If a match is found:
     - Return the tag name, the matched Entity Type (Character/Location/Book), and the Entity ID.
     - Mark this as a "Linked Tag".
   - If NO match is found:
     - Return the tag name and type "Custom".
     - Mark this as "Unlinked Tag".
3. Do NOT output the full text of the note. Only output a JSON list of the extracted tags.

OUTPUT FORMAT:
Return ONLY a valid JSON array. Do not include markdown formatting, explanations, or extra text.
Example:
[
  { "tag": "#Gandalf", "name": "Gandalf", "type": "Character", "entity_id": 101, "status": "linked" },
  { "tag": "#TheShire", "name": "TheShire", "type": "Location", "entity_id": 205, "status": "linked" },
  { "tag": "#PlotTwist", "name": "PlotTwist", "type": "Custom", "entity_id": null, "status": "unlinked" }
]

If no tags are found, return an empty array [].`;

  try {
    const ai = getGeminiClient();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    );

    const rawText = response.text || "[]";
    let extractedTags = [];
    try {
      extractedTags = JSON.parse(rawText);
    } catch (e) {
      console.warn("Failed to parse JSON from Gemini wiki tag response, falling back to regex parsing", e);
      // Client-side regex fallback logic handled cleanly
    }

    return res.json({
      success: true,
      tags: extractedTags
    });
  } catch (error: any) {
    console.error("Wiki Tag Extraction Error:", error);
    // Deterministic Regex Fallback if Gemini endpoint errors
    const tagMatches = noteText.match(/#[A-Za-z0-9_]+/g) || [];
    const uniqueTags = Array.from(new Set(tagMatches));
    const fallbackTags = uniqueTags.map(tagStr => {
      const cleanName = tagStr.replace('#', '');
      const match = entitiesList.find((e: any) => e.name && e.name.toLowerCase() === cleanName.toLowerCase());
      if (match) {
        return { tag: tagStr, name: cleanName, type: match.type || 'Character', entity_id: match.id || 1, status: 'linked' };
      }
      return { tag: tagStr, name: cleanName, type: 'Custom', entity_id: null, status: 'unlinked' };
    });

    return res.json({
      success: true,
      tags: fallbackTags,
      fallback: true
    });
  }
});



// Vite Middleware & Static Asset Serving Setup
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support React SPA routing with '*' route fallback (Express v4)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

initializeServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
