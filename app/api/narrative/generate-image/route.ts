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

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const stabilityKey = process.env.STABILITY_API_KEY;

    if (!openrouterKey && !stabilityKey) {
      return NextResponse.json({ 
        error: 'Image generation not configured. Set OPENROUTER_API_KEY or STABILITY_API_KEY.' 
      }, { status: 500 });
    }

    console.log(`[ImageGen] Generating image for character: ${characterName} (${characterId})`);
    
    let lastError = null;

    // Try Stability AI first (if key is available)
    if (stabilityKey) {
      try {
        console.log(`[ImageGen] Trying Stability AI (SDXL)`);
        const response = await fetch('https://api.stability.ai/v1/text-to-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stabilityKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: prompt,
            steps: 20,
            width: 512,
            height: 512,
            samples: 1,
            cfg_scale: 7.0,
            sampler: 'k_euler',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[ImageGen] Stability AI failed:`, errorText);
          lastError = errorText;
        } else {
          const data = await response.json();
          if (data.artifacts && data.artifacts[0]?.base64) {
            const imageBuffer = Buffer.from(data.artifacts[0].base64, 'base64');
            const filename = `characters/${userId}/${characterId}-${Date.now()}.png`;
            
            const blob = await put(filename, imageBuffer, {
              access: 'public',
              contentType: 'image/png',
            });

            return NextResponse.json({ 
              success: true, 
              url: blob.url,
              model: 'stability/sdxl'
            });
          }
        }
      } catch (err) {
        console.error(`[ImageGen] Error with Stability AI:`, err);
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    // Fallback: Try OpenRouter with proper image models
    if (openrouterKey) {
      // Note: OpenRouter chat completion endpoint doesn't support image generation directly
      // For now, we'll return an error with guidance
      console.log(`[ImageGen] OpenRouter key available but chat-completions doesn't support image generation`);
      lastError = 'OpenRouter chat-completions does not support image generation. Please configure STABILITY_API_KEY for image generation.';
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
