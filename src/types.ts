export enum ViewType {
  BOOKSHELF = 'Bookshelf',
  DASHBOARD = 'Dashboard',
  CHARACTERS = 'Characters',
  TIMELINE = 'Timeline',
  BOARD = 'Board',
  TABLE = 'Table',
  CALENDAR = 'Calendar',
  GALLERY = 'Gallery',
  NOTEPAD = 'Notepad',
  MAP = 'Map',
  LOCATIONS = 'Locations',
  ADMIN = 'Admin',
  SETTINGS = 'Settings',
  INVENTORY = 'Inventory',
  ENCYCLOPEDIA = 'Encyclopedia',
  PLOT_ANALYSIS = 'PlotAnalysis',
  PROCESSOR = 'Processor',
  TOOLBOX = 'Toolbox',
  SOURCE_READER = 'SourceReader',
  MATRIX = 'Matrix',
  DICTIONARY = 'Dictionary',
  RESEARCH = 'Research',
  SEMANTIC_EDITOR = 'SemanticEditor',
  STORY_ARCHITECT = 'StoryArchitect',
  CODEX = 'Codex'
}

export const APP_DATA_VERSION = 12;

// ==========================================
// MODULAR TIERED ARCHITECTURE TYPES
// ==========================================

export type EntityTier = 1 | 2 | 3;

export interface HierarchicalEntity {
  id: string;
  name: string;
  tier: EntityTier;
  species: string;
  type: 'Character' | 'Location' | 'Item' | 'Event' | 'Lore' | string;
  
  // Tier 1 (Core)
  motivation?: string;
  conflict?: string;
  aliases?: string[];
  
  // Tier 2 (Supporting)
  primary_trait?: string;
  location_id?: string;
  role?: string;
  job?: string;
  nickname?: string;
  age?: string;
  birthplace?: string;
  residence?: string;
  traits?: string[];
  source?: 'manual' | 'ai';
  images?: { url: string }[];
  firstMentionOffset?: number;
  lastMentionOffset?: number;
  
  // Generic / Tier 3
  description?: string;
  metadata?: Record<string, any>;
}

export interface AssetMetadata {
  filename: string;
  description: string;
  entity_id?: string;
}

export interface ProjectManifest {
  id: string;
  title: string;
  author: string;
  version: string;
  created_at: string;
  last_modified: string;
  summary: string;
  counts: {
    entities: number;
    tier1: number;
    tier2: number;
    tier3: number;
    assets: number;
    word_count: number;
  };
}

export interface LoreEntry {
  id: string;
  term: string;
  definition: string;
  category: string;
  source?: 'manual' | 'ai';
}

export interface Source {
  id: string;
  name: string;
  content: string;
  type: string;
  timestamp: number;
  isAnalyzing?: boolean;
  guide?: any;
  url?: string;
  author?: string;
  citation?: string;
  filename?: string;
  
  // Academic Citation Fields
  publisher?: string;
  publicationYear?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  accessDate?: string;
  isBroken?: boolean;
}

export interface ProjectData {
  id: string;
  title: string;
  author: string;
  summary: string;
  lastModified: number;
  
  // Legacy fields (kept for migration/UI compatibility)
  characters: Character[];
  locations: Location[];
  artifacts?: Artifact[];
  lore?: LoreEntry[];
  sources?: Source[];
  timeline: TimelineEvent[];
  relationships: Relationship[];
  chapters?: Chapter[];
  notes: Note[];
  themes: string[];
  
  // Modular Tiered Architecture fields
  entities: HierarchicalEntity[];
  manuscript: string; // The baseline text
  history_diff: string; // The diff ledger
  assets: AssetMetadata[];
  manifest?: ProjectManifest;

  // System fields
  wordCount?: number;
  charCount?: number;
  activeCalendarId?: string;
  calendars: CalendarSystem[];
  commits?: Commit[];
  backups?: BackupStatus[];
  integrityHash?: string;
  latestManuscriptText?: string;

  // Map settings
  rootMapImage?: string;
  isRealWorldMap?: boolean;
  mapScale?: number;
  mapUnit?: string;
  mapDefaultView?: any;
}

// Keep existing helper interfaces for now
export interface Scene {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  uei?: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  status: 'Draft' | 'Revised' | 'Final';
  lastModified: number;
  scenes: Scene[];
  wordCount: number;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  job: string;
  description: string;
  traits: string[];
  species?: string;
  goals?: string;
  aliases?: string[];
  associatedLocationId?: string;
  firstMentionOffset?: number;
  lastMentionOffset?: number;
  source?: 'manual' | 'ai';
  motivation?: string;
  conflict?: string;
  primary_trait?: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  type: string;
  mapImage?: string;
  source?: 'manual' | 'ai';
  x?: number;
  y?: number;
  prevX?: number;
  prevY?: number;
  matchedX?: number;
  matchedY?: number;
  parentId?: string;
  mapId?: string;
  isLocked?: boolean;
  isRealWorld?: boolean;
  shortId?: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  description: string;
  source?: 'manual' | 'ai';
}

export interface TimelineEvent {
  id: string;
  date: string;
  uei?: number;
  title: string;
  description: string;
  charactersInvolved: string[];
  location: string;
  source?: 'manual' | 'ai';
}

export interface Note {
  id: string;
  content: string;
  tags: string[];
  timestamp: number;
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  description?: string;
}

export interface CalendarSystem {
  id: string;
  name: string;
  months: any[];
  eras: any[];
}

export interface Commit {
  id: string;
  timestamp: number;
  hash: string;
  message: string;
}

export interface BackupStatus {
  id: string;
  timestamp: number;
  status: 'pending' | 'delivered' | 'failed';
}

export interface ProjectMetadata {
  id: string;
  title: string;
  author: string;
  summary: string;
  lastModified: number;
  characterCount: number;
  locationCount: number;
  commitCount: number;
  backupCount: number;
  wordCount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor';
  themeColor: string;
}

export interface AppSettings {
  appName: string;
  aiCharacterLimit: number;
}

export interface AppPrompts {
  GENERAL_AND_CHARACTERS: string;
}

export interface ToolboxLink {
  id: string;
  label: string;
  url: string;
  category: string;
}
