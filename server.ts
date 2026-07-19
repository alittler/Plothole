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
