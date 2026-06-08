import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getUserId } from '@/app/api/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, characterId, characterName } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured (OPENROUTER_API_KEY or GEMINI_API_KEY)' }, { status: 500 });
    }

    console.log(`[ImageGen] Generating image for character: ${characterName} (${characterId})`);
    
    // Attempt image generation via OpenRouter
    // We try a few models that are known for image generation
    const modelsToTry = ['openai/dall-e-3', 'black-forest-labs/flux-1.1-pro', 'stabilityai/stable-diffusion-xl'];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[ImageGen] Trying model: ${model}`);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://plothole.click',
            'X-Title': 'Plothole - Character Image Generation',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt }
                ]
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[ImageGen] Model ${model} failed:`, errorText);
          lastError = errorText;
          continue;
        }

        const data = await response.json();
        console.log(`[ImageGen] API Response for ${model}:`, JSON.stringify(data).substring(0, 200));

        // OpenRouter image models might return the URL in different places
        // 1. In the message content (as a URL)
        // 2. In a 'url' field at the top level
        // 3. In a 'data' array (OpenAI style)
        const imageUrl = 
          (data.choices?.[0]?.message?.content?.match(/https?:\/\/\S+\.(?:png|jpg|jpeg|webp)\S*/i)?.[0]) ||
          data.choices?.[0]?.message?.content || 
          data.url || 
          (data.data && data.data[0]?.url);

        if (imageUrl && imageUrl.startsWith('http')) {
          // Download the image and re-upload to Vercel Blob for persistence
          const imageRes = await fetch(imageUrl);
          if (!imageRes.ok) throw new Error(`Failed to download image from ${imageUrl}`);
          
          const imageBlob = await imageRes.blob();
          const filename = `characters/${userId}/${characterId}-${Date.now()}.webp`;
          
          const blob = await put(filename, imageBlob, {
            access: 'public',
            contentType: 'image/webp',
          });

          return NextResponse.json({ 
            success: true, 
            url: blob.url,
            model: model
          });
        }
      } catch (err) {
        console.error(`[ImageGen] Error with model ${model}:`, err);
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return NextResponse.json({ 
      error: 'All image generation models failed', 
      details: lastError 
    }, { status: 502 });
  } catch (error) {
    console.error('[ImageGen] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
