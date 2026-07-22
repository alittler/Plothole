import { ResearchSource, AtlasMapState } from '../types';

/**
 * Computes a fast deterministic SHA-256 string for content tracking.
 */
export async function computeSHA256(text: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const msgUint8 = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn("crypto.subtle digest unavailable, using fallback hash", e);
  }
  // Fallback hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'sha256_' + Math.abs(hash).toString(16).padStart(16, '0') + '_' + text.length;
}

/**
 * Synchronous simple SHA string generator for fast UI renders
 */
export function getFastSourceSHA(source: ResearchSource): string {
  if (source.sha) return source.sha;
  const raw = `${source.id}-${source.title}-${source.content}-${source.addedAt}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'sha_' + Math.abs(hash).toString(16).padStart(12, '0');
}

/**
 * Formats key takeaways from custom array or extracts bullet points from text content
 */
export function extractKeyTakeaways(source: ResearchSource): string[] {
  if (source.keyTakeaways && source.keyTakeaways.length > 0) {
    return source.keyTakeaways.filter(t => t.trim().length > 0);
  }

  const content = source.content || '';
  if (!content.trim()) {
    return ["No key takeaways recorded."];
  }

  // Attempt to split by lines or bullet points
  const lines = content
    .split(/\n+/)
    .map(l => l.replace(/^[-*•\d.\s]+/, '').trim())
    .filter(l => l.length > 10);

  if (lines.length > 0) {
    return lines.slice(0, 5); // Pick top 5 sentences/bullets
  }

  // Fallback: chunk first 200 chars
  return [content.slice(0, 180) + (content.length > 180 ? '...' : '')];
}

/**
 * Builds a single compiled Markdown document strictly adhering to the requested schema:
 * 
 * # Research Notes
 * 
 * ## Source: [Source Title]
 * - **URL:** [Source URL]
 * - **Date Added:** [Timestamp]
 * - **SHA:** [SHA]
 * ### Key Takeaways
 * - Point 1
 * - Point 2
 * ### Full Content
 * [Paste content here]
 * 
 * ## Source: [Next Source]
 */
export function buildSingleFileMarkdown(
  sources: ResearchSource[], 
  notebookName: string = "Research Notebook",
  atlasState?: AtlasMapState
): string {
  let md = `# Research Notes\n`;
  md += `<!-- Notebook: ${notebookName} | Total Sources: ${sources.length} | Generated: ${new Date().toISOString()} -->\n\n`;

  if (!sources || sources.length === 0) {
    md += `*(No research sources or notes currently in this notebook.)*\n\n`;
  } else {
    sources.forEach((source) => {
      const shaTag = getFastSourceSHA(source);
      const takeaways = extractKeyTakeaways(source);
      const dateStr = source.addedAt ? new Date(source.addedAt).toLocaleString() : new Date().toLocaleString();
      const urlStr = source.url ? source.url.trim() : (source.type === 'file' ? (source.fileName || 'Uploaded File') : 'N/A');

      md += `## Source: ${source.title || 'Untitled Source'}\n`;
      md += `- **URL:** ${urlStr}\n`;
      md += `- **Date Added:** ${dateStr}\n`;
      md += `- **SHA:** ${shaTag}\n`;
      md += `### Key Takeaways\n`;
      takeaways.forEach((point) => {
        md += `- ${point}\n`;
      });
      md += `### Full Content\n`;
      md += `${source.content ? source.content.trim() : '(No content)'}\n\n`;
    });
  }

  if (atlasState && atlasState.locations.length > 0) {
    md += `# Fantasy Atlas Map Data\n`;
    md += `## Map Title: ${atlasState.mapTitle || 'Custom Fantasy World'}\n`;
    md += `- **Dimensions:** ${atlasState.imageWidth}px x ${atlasState.imageHeight}px\n`;
    md += `- **Total Landmarks:** ${atlasState.locations.length}\n`;
    md += `- **Last Updated:** ${atlasState.updatedAt || new Date().toISOString()}\n\n`;

    atlasState.locations.forEach((loc) => {
      md += `### Location: ${loc.name} [${loc.category}]\n`;
      md += `- **Category:** ${loc.category}\n`;
      md += `- **Icon:** ${loc.icon}\n`;
      md += `- **Coordinates (Flat Grid):** X: ${loc.x.toFixed(1)}, Y: ${loc.y.toFixed(1)}\n`;
      md += `- **Date Added:** ${loc.addedAt ? new Date(loc.addedAt).toLocaleString() : 'N/A'}\n`;
      md += `#### Description\n`;
      md += `${loc.description || 'No detailed description.'}\n\n`;
    });

    md += `\`\`\`json\n`;
    md += JSON.stringify({ atlas: atlasState }, null, 2);
    md += `\n\`\`\`\n`;
  }

  return md;
}
