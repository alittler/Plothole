import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getUserId } from '@/app/api/auth';
import { getImageGenerationConfig } from '@/src/lib/toolsConfig';

export const runtime = 'nodejs';

// Generate a simple SVG placeholder image as fallback
function generatePlaceholderImage(characterName: string, characterId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A8E6CF'
  ];
  
  const hash = characterId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = colors[hash % colors.length];
  const initials = characterName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const svg = `
    <svg width="1024" height="576" viewBox="0 0 1024 576" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color}dd;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1024" height="576" fill="url(#grad)"/>
      <circle cx="512" cy="240" r="100" fill="rgba(255,255,255,0.2)"/>
      <text x="512" y="380" font-size="160" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial">
        ${initials}
      </text>
      <text x="512" y="500" font-size="64" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial">
        ${characterName}
      </text>
    </svg>
  `;

  return svg;
}

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

    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (apiKey) {
      console.log(`[ImageGen] Requesting OpenRouter image for: ${characterName}`);
      
      try {
        const imageConfig = getImageGenerationConfig();
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://plothole.ai', // Optional
            'X-Title': 'Plothole' // Optional
          },
          body: JSON.stringify({
            model: imageConfig.model,
            messages: [
              {
                role: "user",
                content: prompt
              }
            ],
            modalities: ["image"],
            image_config: {
              aspect_ratio: imageConfig.aspectRatio
            }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const imageObj = data.choices?.[0]?.message?.images?.[0];
          
          if (imageObj?.image_url?.url) {
            const imageUrl = imageObj.image_url.url;
            const imageConfig = getImageGenerationConfig();
            console.log(`[ImageGen] OpenRouter returned image URL (starts with: ${imageUrl.substring(0, 30)})`);

            // If it's a data URI, we should save it to Vercel Blob to have a persistent URL
            if (imageUrl.startsWith('data:')) {
              const [header, base64Data] = imageUrl.split(',');
              const contentType = header.split(':')[1].split(';')[0];
              const extension = contentType.split('/')[1] || 'png';
              const buffer = Buffer.from(base64Data, 'base64');
              
              const filename = `characters/${userId}/${characterId}-${Date.now()}.${extension}`;
              const blob = await put(filename, buffer, {
                access: 'public',
                contentType: contentType,
              });

              return NextResponse.json({ 
                success: true, 
                url: blob.url,
                model: imageConfig.model
              });
            }

            // If it's already a regular URL, just return it
            return NextResponse.json({ 
              success: true, 
              url: imageUrl,
              model: imageConfig.model
            });
          }
        } else {
          const errorText = await response.text();
          console.error(`[ImageGen] OpenRouter error (${response.status}):`, errorText);
        }
      } catch (err) {
        console.error(`[ImageGen] Failed to call OpenRouter:`, err);
      }
    }

    // Fallback: Generate a placeholder image
    console.log(`[ImageGen] Using fallback placeholder for ${characterName}`);
    try {
      const svgImage = generatePlaceholderImage(characterName, characterId);
      const svgBuffer = Buffer.from(svgImage, 'utf-8');
      const filename = `characters/${userId}/${characterId}-${Date.now()}.svg`;
      
      const blob = await put(filename, svgBuffer, {
        access: 'public',
        contentType: 'image/svg+xml',
      });

      return NextResponse.json({ 
        success: true, 
        url: blob.url,
        model: 'placeholder-svg',
        isPlaceholder: true
      });
    } catch (err) {
      console.error(`[ImageGen] Error creating placeholder image:`, err);
      return NextResponse.json({ 
        error: 'Failed to create character image', 
        details: err instanceof Error ? err.message : String(err)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[ImageGen] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
