import "dotenv/config";

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("No OPENROUTER_API_KEY found");
    return;
  }

  console.log("Testing OpenRouter Image Generation...");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // model: "black-forest-labs/flux-schnell",
        model: "openai/dall-e-3", // let's test if DALL-E 3 works on openrouter
        messages: [
          {
            role: "user",
            content: "A detailed portrait of a fantasy wizard with a long white beard and a blue hat.",
          }
        ],
        // this is how OpenRouter docs suggest requesting images
        modalities: ["image"],
      })
    });

    const data = await response.json();
    console.log("Response Status:", response.status);
    console.log("Response Data:", JSON.stringify(data, null, 2));

  } catch (error) {
    console.error("Error:", error);
  }
}

main();
