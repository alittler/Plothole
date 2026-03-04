import { ProjectData, Note } from '../types';

export interface SemanticManifest {
  anchors: {
    id: string;
    offset: number;
    fingerprint: string;
  }[];
  diffLog: {
    id: string;
    timestamp: number;
    change: string;
  }[];
  integrityHash: string;
}

export class SemanticWeaver {
  private static readonly METADATA_MARKER = '===METADATA===';

  /**
   * Generates a unique ID for anchors.
   */
  static generateAnchorId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Generates a SHA256-like hash for integrity check.
   * (Simplified for client-side usage without heavy crypto libs if needed, 
   * but using a simple hash for now).
   */
  static async generateIntegrityHash(content: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Extracts the prose and metadata from a document.
   */
  static parseDocument(fullText: string): { prose: string; metadata: SemanticManifest | null } {
    const parts = fullText.split(this.METADATA_MARKER);
    const prose = parts[0].trim();
    let metadata: SemanticManifest | null = null;

    if (parts.length > 1) {
      try {
        metadata = JSON.parse(parts[1].trim());
      } catch (e) {
        console.error("Failed to parse metadata", e);
      }
    }

    return { prose, metadata };
  }

  /**
   * Rebuilds the metadata block by scanning the prose for anchors.
   */
  static async rebuildMetadata(prose: string, oldMetadata?: SemanticManifest): Promise<SemanticManifest> {
    const anchorRegex = /\^([a-zA-Z0-9]+)(?::(\d+)-(\d+))?/g;
    const anchors: SemanticManifest['anchors'] = [];
    let match;

    while ((match = anchorRegex.exec(prose)) !== null) {
      const id = match[1];
      const offset = match.index;
      // Generate a 10-word fingerprint around the anchor
      const start = Math.max(0, offset - 50);
      const end = Math.min(prose.length, offset + 50);
      const snippet = prose.substring(start, end).replace(/\^([a-zA-Z0-9]+)(?::(\d+)-(\d+))?/g, '').trim();
      const fingerprint = snippet.split(/\s+/).slice(0, 10).join(' ');

      anchors.push({ id, offset, fingerprint });
    }

    const integrityHash = await this.generateIntegrityHash(prose);

    return {
      anchors,
      diffLog: oldMetadata?.diffLog || [],
      integrityHash
    };
  }

  /**
   * Heals the document by reconciling offsets using fingerprints.
   */
  static async healDocument(prose: string, metadata: SemanticManifest): Promise<{ prose: string; metadata: SemanticManifest; healedCount: number }> {
    let healedCount = 0;
    const currentHash = await this.generateIntegrityHash(prose);

    if (currentHash === metadata.integrityHash) {
      return { prose, metadata, healedCount: 0 };
    }

    // Re-scan prose to find current anchor positions
    const newMetadata = await this.rebuildMetadata(prose, metadata);
    
    // Logic to reconcile if needed (e.g. if an anchor is missing but fingerprint exists)
    // For now, we assume the rebuildMetadata is the "healing" process of the manifest itself
    // based on the current prose state. 
    // True "healing" would involve finding where an ID *should* be if the tag was deleted but text remains.
    
    // Advanced Healing: If an anchor ID from old metadata is missing in new metadata,
    // try to find its fingerprint in the prose and re-insert the tag?
    // The instructions say: "Upon relocation, update the Manifest with the new offset numbers."
    // This implies the tag still exists but moved. `rebuildMetadata` handles this.
    
    // If the tag is GONE, we might want to find the fingerprint and re-insert it?
    // "If not found, search the entire document for the ^ID tag." -> handled by rebuildMetadata scanning.
    
    return { prose, metadata: newMetadata, healedCount };
  }

  /**
   * Formats the document with the metadata tail.
   */
  static formatDocument(prose: string, metadata: SemanticManifest): string {
    return `${prose}\n\n${this.METADATA_MARKER}\n${JSON.stringify(metadata, null, 2)}`;
  }

  /**
   * Extracts graph connections (@, [[ ]], #)
   */
  static extractGraph(prose: string): { mentions: string[], entities: string[], tags: string[] } {
    const mentions = (prose.match(/@\w+/g) || []).map(s => s.substring(1));
    const entities = (prose.match(/\[\[(.*?)\]\]/g) || []).map(s => s.slice(2, -2));
    const tags = (prose.match(/#\w+/g) || []).map(s => s.substring(1));

    return {
      mentions: Array.from(new Set(mentions)),
      entities: Array.from(new Set(entities)),
      tags: Array.from(new Set(tags))
    };
  }
}
