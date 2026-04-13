import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No GEMINI_API_KEY found in .env");
    process.exit(1);
  }

  const genAI = new GoogleGenAI({ apiKey });
  const modelName = "gemini-2.5-flash"; // Testing the model we just set

  console.log(`Testing Gemini API with model: ${modelName}...`);
  try {
    const response = await genAI.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: "Say 'Hello, I am working!' if you can read this." }] }]
    });
    console.log("Success! Response text:", response.text);
  } catch (error) {
    console.error("Gemini API call failed:");
    if (error && typeof error === 'object' && 'message' in error) {
      console.error("Message:", error.message);
    }
    console.error("Full error details:", JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

testGemini();
