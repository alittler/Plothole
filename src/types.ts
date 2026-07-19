export interface CharacterCore {
  name: string;
  nickname: string | null;
  role: string;
  species: string;
  living_status: 'Alive' | 'Dead' | 'Missing' | 'Unknown' | 'Undead' | 'Non-biological';
}

export interface CharacterRelationship {
  name: string;
  relation: string;
}

export interface CharacterContent {
  description: string;
  goals: string[];
  relationships: CharacterRelationship[];
  quotes: string[];
}

export interface CharacterMetadata {
  first_appearance: string | null;
  tags: string[];
  notes: string | null;
  is_real_person?: boolean;
  wikipedia_url?: string;
  wikipedia_title?: string;
}

export interface CharacterProfile {
  core: CharacterCore;
  content: CharacterContent;
  custom_fields: Record<string, string>;
  metadata: CharacterMetadata;
  gallery?: string[];
}

export interface TermReplacement {
  from: string;
  to: string;
  timestamp: string;
  originalCount: number;
  currentCount: number;
}

export interface Blueprint {
  sha: string;
  first_processed: string;
  last_edited: string;
  characters: CharacterProfile[];
  manuscript_sha?: string;
  manuscript_title?: string;
  manuscript_author?: string;
  manuscript_text?: string;
  manuscripts_history?: Array<{
    sha: string;
    date: string;
    title: string;
    author: string;
    text?: string;
    tokens?: { promptTokens: number; completionTokens: number; totalTokens: number };
    optimization?: {
      originalLength: number;
      optimizedLength: number;
      charSavings: number;
      estimatedTokenSavings: number;
      wasOptimized: boolean;
      modelUsed: string;
    };
  }>;
  blueprint_notes?: string;
  term_replacements?: TermReplacement[];
}

export interface SidecarLog {
  timestamp: string;
  action: string;
  details: string;
}

export interface AnalysisResponse {
  success: boolean;
  characters?: CharacterProfile[];
  error?: string;
  tokens?: { promptTokens: number; completionTokens: number; totalTokens: number };
  optimization?: {
    originalLength: number;
    optimizedLength: number;
    charSavings: number;
    estimatedTokenSavings: number;
    wasOptimized: boolean;
    modelUsed: string;
  };
}
