import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No GEMINI_API_KEY found in .env");
    process.exit(1);
  }

  const genAI = new GoogleGenAI({ apiKey });
  
  try {
    const modelsResult = await genAI.models.list();
    console.log("Available models and their supported methods:");
    for (const model of modelsResult) {
      console.log(`- Name: ${model.name}`);
      console.log(`  Methods: ${model.supportedMethods.join(", ")}`);
    }
  } catch (error) {
    console.error("Listing models failed:", JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

listModels();
