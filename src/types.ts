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
  sidecar_logs?: SidecarLog[];
}

export interface SidecarLog {
  timestamp: string;
  action: string;
  details: string;
}

export interface ResearchSource {
  id: string;
  type: 'text' | 'url' | 'file';
  title: string;
  content: string; // Copied text, file content extraction, website content or transcript description
  url?: string;     // Website/YouTube URL
  fileName?: string; // Uploaded file name
  fileType?: string; // MIME type of file
  addedAt: string;
  sha?: string;      // SHA hash for AI version tracking
  keyTakeaways?: string[]; // Bulleted takeaways for AI processing
}

export interface ResearchNotebook {
  id: string;
  name: string;
  sources: ResearchSource[];
  createdAt: string;
  lastEdited: string;
}

export interface AtlasLocation {
  id: string;
  name: string;
  category: 'Cities' | 'Dungeons' | 'Roads' | 'Landmarks' | 'Ruins' | 'Outposts' | 'Taverns';
  icon: 'castle' | 'tent' | 'dragon' | 'skull' | 'map-pin' | 'anchor' | 'shield' | 'tree' | 'sparkles' | 'compass';
  x: number; // lat in Simple CRS (0 to imageHeight)
  y: number; // lng in Simple CRS (0 to imageWidth)
  description: string;
  tags?: string[];
  addedAt: string;
}

export interface AtlasPathPoint {
  x: number;
  y: number;
  name?: string;
}

export interface AtlasPath {
  id: string;
  name: string;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
  waypoints: AtlasPathPoint[];
  description?: string;
  category?: string;
  visible: boolean;
  createdAt: string;
}

export interface AtlasMapState {
  id: string;
  mapTitle: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  locations: AtlasLocation[];
  paths?: AtlasPath[];
  activeCategories: string[];
  center: [number, number];
  zoom: number;
  updatedAt: string;
}

export interface SystemUser {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'editor' | 'user';
  grantedAt: string;
  lastActive?: string;
}

export interface BackupCodeRecord {
  id: string;
  code: string;
  description: string;
  created: string;
  type: 'dossier' | 'notebook' | 'atlas' | 'gmail_backup' | 'system';
  payloadSnippet: string;
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

export interface OracleSourceCitation {
  id: string;
  tier: 'primary_manuscript' | 'secondary_dossier' | 'tertiary_note' | 'tertiary_atlas';
  title: string;
  sourceTypeLabel: string;
  snippet: string;
  chapter?: string;
  characterName?: string;
  contradictionAlert?: string;
}

export interface OracleMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: OracleSourceCitation[];
  contradictions?: string[];
  tokens?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface OracleQueryRequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  manuscriptText?: string;
  manuscriptTitle?: string;
  activeChapterFilter?: string;
  characters?: CharacterProfile[];
  notebooks?: ResearchNotebook[];
  atlasState?: AtlasMapState | null;
}

export interface ExtractedWikiTag {
  tag: string;
  name: string;
  type: 'Character' | 'Location' | 'Book' | 'Custom' | string;
  entity_id: string | number | null;
  status: 'linked' | 'unlinked';
}

export interface StenopadNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pageNumber: number;
  extractedTags?: ExtractedWikiTag[];
  paperStyle?: 'cream_lined' | 'yellow_legal' | 'grid_white' | 'vintage_aged';
}


