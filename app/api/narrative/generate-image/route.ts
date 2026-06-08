import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getUserId } from '@/app/api/auth';

export const runtime = 'nodejs';

// Generate a simple SVG placeholder image based on character name
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
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color}dd;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#grad)"/>
      <circle cx="256" cy="200" r="80" fill="rgba(255,255,255,0.2)"/>
      <text x="256" y="320" font-size="120" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial">
        ${initials}
      </text>
      <text x="256" y="420" font-size="48" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial">
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

    console.log(`[ImageGen] Generating image for character: ${characterName} (${characterId})`);
    
    // Generate a placeholder image for now
    // In production, you can replace this with a real image generation service
    try {
      const svgImage = generatePlaceholderImage(characterName, characterId);
      const svgBuffer = Buffer.from(svgImage, 'utf-8');
      const filename = `characters/${userId}/${characterId}-${Date.now()}.svg`;
      
      const blob = await put(filename, svgBuffer, {
        access: 'public',
        contentType: 'image/svg+xml',
      });

      console.log(`[ImageGen] Successfully generated placeholder image for ${characterName}`);
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
