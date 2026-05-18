import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from "@google/genai";

const MANUSCRIPT_PATH = path.join(process.cwd(), 'source', 'manuscript.md');

async function callOpenRouter(prompt: string, apiKey: string) {
  console.log("Calling OpenRouter with gemini-2.0-flash...");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/alittler/Plothole",
      "X-Title": "Plothole Manuscript Analyzer"
    },
    body: JSON.stringify({
      "model": "google/gemini-2.0-flash-001",
      "messages": [
        { "role": "user", "content": prompt }
      ],
      "response_format": { "type": "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenRouter API failed: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function analyzeManuscript() {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!geminiApiKey && !openRouterApiKey) {
    console.error("Missing API credentials. Set GEMINI_API_KEY or OPENROUTER_API_KEY.");
    process.exit(1);
  }

  if (!fs.existsSync(MANUSCRIPT_PATH)) {
    console.error(`Manuscript file not found at ${MANUSCRIPT_PATH}`);
    process.exit(1);
  }

  const manuscriptText = fs.readFileSync(MANUSCRIPT_PATH, 'utf-8');
  console.log(`Loaded manuscript: ${manuscriptText.length} characters.`);

  const prompt = `
    You are a literary analyst. Analyze the following manuscript text and extract key story elements in JSON format.
    
    ## Extraction Goals:
    1. **Characters**: Extract full names, aliases, a brief description, and their role (protagonist, supporting, mentioned).
    2. **World Entities**: Extract locations, organizations, items, and lore that are narratively important.
    3. **Plot Summary**: A concise 3-5 sentence overall summary.
    4. **Themes**: Identify primary thematic elements.
    5. **Tension Arc**: Briefly describe the tension progression.

    ## Format Requirement:
    Return ONLY a valid JSON object with the following structure:
    {
      "summary": "string",
      "themes": ["string"],
      "tension_arc": "string",
      "characters": [
        { "name": "string", "aliases": ["string"], "description": "string", "role": "protagonist|supporting|mentioned" }
      ],
      "entities": [
        { "name": "string", "kind": "location|organization|item|lore", "type": "string", "description": "string" }
      ]
    }

    ## Manuscript Text:
    ${manuscriptText.slice(0, 30000)}
  `;

  let responseText: string | undefined;

  try {
    if (geminiApiKey && !geminiApiKey.includes("YOUR_API_KEY")) {
      console.log("Attempting analysis with Gemini API...");
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      responseText = response.text;
    }
  } catch (error) {
    console.warn("Gemini API failed, falling back to OpenRouter...");
  }

  if (!responseText && openRouterApiKey) {
    try {
      responseText = await callOpenRouter(prompt, openRouterApiKey);
    } catch (error) {
      console.error("OpenRouter also failed:", error);
    }
  }

  if (!responseText) {
    console.error("All AI analysis attempts failed.");
    process.exit(1);
  }

  try {
    const analysis = JSON.parse(responseText);

    console.log("\n--- Analysis Complete ---\n");
    console.log("Summary:", analysis.summary);
    console.log("\nCharacters Found:", analysis.characters.length);
    analysis.characters.forEach((c: any) => console.log(`- ${c.name} (${c.role}): ${c.description}`));
    
    console.log("\nEntities Found:", analysis.entities.length);
    analysis.entities.forEach((e: any) => console.log(`- ${e.name} (${e.kind}): ${e.description}`));

    // Save output
    const outputPath = path.join(process.cwd(), 'source', 'analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\nFull analysis saved to ${outputPath}`);

  } catch (error) {
    console.error("Failed to parse AI response:", error);
    console.log("Raw response:", responseText);
    process.exit(1);
  }
}

analyzeManuscript();
