import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

async function listModels() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');
  if (!apiKey) {
    console.error("No GEMINI_API_KEY found in .env");
    process.exit(1);
  }

  console.log(`Using API Key: prefix=${apiKey.substring(0, 4)}..., length=${apiKey.length}`);

  const genAI = new GoogleGenAI({ apiKey });
  
  try {
    const modelsResult = await genAI.models.list();
    console.log("Available models and their supported methods:");
    for await (const model of modelsResult) {
      console.log(`- Name: ${model.name}`);
      console.log(`  Methods: ${(model.supportedActions || []).join(", ")}`);
    }
  } catch (error) {
    console.error("Listing models failed:", JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

listModels();
