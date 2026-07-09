import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });
import { GoogleGenAI } from "@google/genai";

async function testModel(modelName: string, genAI: GoogleGenAI) {
  console.log(`Testing model: ${modelName}...`);
  try {
    const response = await genAI.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: "Say 'Hello, " + modelName + " is working!' if you can read this." }] }]
    });
    console.log(`Success with ${modelName}! Response:`, response.text);
    return true;
  } catch (error: any) {
    console.error(`Failed with ${modelName}:`, error.message || error);
    return false;
  }
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No GEMINI_API_KEY found");
    return;
  }
  const genAI = new GoogleGenAI({ apiKey });
  
  await testModel("gemini-2.5-flash", genAI);
  await testModel("gemini-2.0-flash-lite", genAI);
  await testModel("gemini-2.0-flash", genAI);
}
main();
