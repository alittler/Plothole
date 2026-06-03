import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const videoId = getYoutubeVideoId(url);
    if (!videoId) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });

    const transcriptResponse = await fetch(`https://youtubetotranscript.com/transcript?v=${videoId}`);
    const transcriptText = await transcriptResponse.text();

    if (transcriptText.includes("<!DOCTYPE html>") || transcriptText.length < 50) {
      return NextResponse.json({ 
        error: 'Could not fetch transcript. The video may have captions disabled or restricted.',
        videoId 
      }, { status: 404 });
    }

    return NextResponse.json({ transcript: transcriptText, videoId });
  } catch (error: any) {
    console.error('[Transcript API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 });
  }
}

function getYoutubeVideoId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}
