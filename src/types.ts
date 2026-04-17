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
  SEMANTIC_EDITOR = 'SemanticEditor',
  STORY_ARCHITECT = 'StoryArchitect',
  CODEX = 'Codex',
  CARD_CATALOGUE = 'CardCatalogue',
  WORLD_HUB = 'WorldHub',
  WORKSPACE_HUB = 'WorkspaceHub',
  SYSTEM_HUB = 'SystemHub',
  RESEARCH = 'Research',
  BESTIARY = 'Bestiary',
  ATLAS2 = 'Atlas2',
  CELESTIAL = 'Celestial'
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
  job?: string; // Maps to jobTitle
  nickname?: string; // Maps to additionalName
  age?: string;
  birthplace?: string; // Maps to birthPlace
  residence?: string; // Maps to homeLocation
  traits?: string[];
  source?: 'manual' | 'ai';
  images?: { url: string }[];
  firstMentionOffset?: number;
  lastMentionOffset?: number;

  // Schema.org/Person Extension Fields
  givenName?: string;
  familyName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
  jobTitle?: string;
  birthDate?: string;
  deathDate?: string;
  gender?: string;
  nationality?: string;
  affiliation?: string;
  knowsAbout?: string[];
  birthPlace?: string; // Legacy mapping
  homeLocation?: string; // Legacy mapping

  // Event / Timeline data
  startDate?: string;
  endDate?: string;
  eventStatus?: string;
  attendees?: any[];
  duration?: string;

  // Dublin Core / Bibliographic data
  dc_creator?: string;
  dc_publisher?: string;
  dc_title?: string;
  dc_date?: string;
  bibtex_type?: string;
  bibtex_journal?: string;
  bibtex_volume?: string;
  bibtex_number?: string;
  bibtex_pages?: string;

  // SKOS Compatibility
  prefLabel?: string;
  altLabel?: string[];
  broader?: string[];
  narrower?: string[];
  related?: string[];
  scopeNote?: string;
  
  // Generic / Tier 3
  description?: string;
  fieldNotes?: { label: string; value: string }[]; 
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
  vault_origin?: string;
  counts: {
    entities: number;
    tier1: number;
    tier2: number;
    tier3: number;
    assets: number;
    word_count: number;
  };
  referenced_notes?: Array<{
    origin_id: string;
    content: string;
    sync_status: 'synced' | 'diverged' | 'local';
    last_vault_sync: string;
    note_type: 'global' | 'ephemeral';
    tags: string[];
    anchor_target: string | null;
  }>;
}

export interface LoreEntry {
  id: string;
  term: string; // Maps to prefLabel
  definition: string; // Maps to definition/note
  category: string;
  tags?: string[];
  source?: 'manual' | 'ai';

  // SKOS (Simple Knowledge Organization System) Compatibility
  prefLabel?: string;
  altLabel?: string[]; // Synonyms/Aliases
  hiddenLabel?: string[];
  broader?: string[]; // Parent concepts (IDs)
  narrower?: string[]; // Child concepts (IDs)
  related?: string[]; // Related concepts (IDs)
  scopeNote?: string;
}

export interface Source {
  id: string;
  name: string; // Maps to dc:title
  content: string;
  type: string; // Maps to dc:type
  timestamp: number; // Maps to dc:date
  isAnalyzing?: boolean;
  guide?: any;
  url?: string; // Maps to dc:identifier
  author?: string; // Maps to dc:creator / bibtex:author
  citation?: string;
  filename?: string;
  
  // Dublin Core (DCMI) Compatibility
  dc_title?: string;
  dc_creator?: string;
  dc_subject?: string;
  dc_description?: string;
  dc_publisher?: string;
  dc_contributor?: string;
  dc_date?: string;
  dc_type?: string;
  dc_format?: string;
  dc_identifier?: string;
  dc_source?: string;
  dc_language?: string;
  dc_relation?: string;
  dc_coverage?: string;
  dc_rights?: string;

  // BibTeX Compatibility
  bibtex_key?: string;
  bibtex_type?: 'article' | 'book' | 'booklet' | 'conference' | 'inbook' | 'incollection' | 'inproceedings' | 'manual' | 'mastersthesis' | 'misc' | 'phdthesis' | 'proceedings' | 'techreport' | 'unpublished';
  bibtex_journal?: string;
  bibtex_year?: string;
  bibtex_volume?: string;
  bibtex_number?: string;
  bibtex_pages?: string;
  bibtex_month?: string;
  bibtex_note?: string;
  bibtex_isbn?: string;
  bibtex_issn?: string;
  bibtex_doi?: string;
  
  // Academic Citation Fields (Legacy Sync)
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
  shortName?: string;
  author: string;
  summary: string;
  lastModified: number;
  coverImage?: string;
  
  // Legacy fields (kept for migration/UI compatibility)
  characters: Character[];
  locations: Location[];
  artifacts?: Artifact[];
  lore?: LoreEntry[];
  sources?: Source[];
  codexSources?: {id: string; name: string; content: string}[];
  timeline: TimelineEvent[];
  relationships: Relationship[];
  chapters?: Chapter[];
  notes: Note[];
  ideas?: Idea[];
  inspirations?: Inspiration[];
  themes: string[];
  proseDocuments?: ProseDocument[];
  corkboardNotes?: ProseDocument[]; // Separate collection for corkboard snippets
  semanticDocuments?: SemanticDocument[];
  userToolboxLinks?: ToolboxLink[];
  
  // Research Hub fields
  researchSources?: {id: string; name: string; type: string; uploadDate: number; size: number; extractionStatus: string; notes?: string}[];
  researchNotes?: {id: string; title: string; content: string; sourceIds: string[]; scriptureCitations: string[]; tags: string[]; createdAt: number; updatedAt: number}[];
  
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
  backupSettings?: BackupSettings;
  integrityHash?: string;
  latestManuscriptText?: string;
  manuscriptDraft?: string;
  lastProcessedManuscriptSha?: string;
  lastProcessedPromptSha?: string;
  aiContextLimit?: number;
  aiDeadThreads?: any[];
  changeLog?: any[];
  notepadCanvas?: {
    nodes: any[];
    edges: any[];
  };
  continuityErrors?: ContinuityError[];

  wikiSettings?: {
    includeCharacters?: boolean;
    includeLocations?: boolean;
    includeTimeline?: boolean;
    includeLore?: boolean;
    includeArtifacts?: boolean;
    includeManuscript?: boolean;
  };

  // Map settings
  rootMapImage?: string;
  isRealWorldMap?: boolean;
  mapScale?: number;
  mapUnit?: string;
  mapDefaultView?: any;
  paths?: MapPath[];
}

export interface MapPath {
  id: string;
  name: string;
  points: { x: number; y: number; locationId?: string }[];
  isRealWorld: boolean;
  distance: number;
  unit: string;
  color?: string;
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
  images?: { url: string; caption?: string }[];
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
  location_id?: string;
  tier?: number; // 1 = Core, 2 = Supporting, 3 = Background

  // Physical and biographical details (from AI analysis)
  physicalFeatures?: string; // Height, weight, build, distinctive marks
  style?: string; // Clothing, appearance style
  strengths?: string; // Character strengths
  weaknesses?: string; // Character weaknesses
  nickname?: string; // Alternate names/nicknames
  birthday?: string; // Birth date
  age?: string; // Age or age range

  // Schema.org/Person Compatibility
  givenName?: string;
  familyName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
  jobTitle?: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  homeLocation?: string;
  gender?: string;
  nationality?: string;
  affiliation?: string;
  knowsAbout?: string[];
  fieldNotes?: { label: string; value: string }[];
  
  // Map placement fields
  x?: number;
  y?: number;
  parentId?: string;
  isLocked?: boolean;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  type: string;
  mapImage?: string;
  source?: 'manual' | 'ai';
  address?: string;
  icon?: string;
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
  imageUrl?: string;
  source?: 'manual' | 'ai';
}

export interface TimelineEvent {
  id: string;
  date: string; // Legacy field, mapping to startDate if ISO
  uei?: number;
  title: string;
  description: string;
  charactersInvolved: string[]; // Maps to attendees
  location: string;
  source?: 'manual' | 'ai';
  isSoftAnchor?: boolean;

  // Schema.org/Event Compatibility
  startDate?: string; // ISO-8601
  endDate?: string;   // ISO-8601
  eventStatus?: string;
  attendees?: string[];
  duration?: string; // ISO-8601 duration
  typicalAgeRange?: string;
}

export interface Note {
  id: string;
  content: string;
  tags: string[];
  timestamp: number;
  isCanon?: boolean;
  expandedContent?: string;
  metaSummary?: string;
  note_type?: 'global' | 'ephemeral';
  anchor_target?: string;
  created?: string;
  modified?: string;
}

export interface Inspiration {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  tags: string[];
  timestamp: number;
}

export interface ProseDocument {
  id: string;
  title: string;
  content: string;
  lastModified: number;
}

export interface Relationship {
  id: string;
  sourceId: string; // Node A
  targetId: string; // Node B
  type: string;     // The edge label / predicate
  description?: string;
  
  // Standard Graph Metadata (JGF/RDF)
  predicate?: string; // Standardized URI or slug for the relationship
  weight?: number;    // Strength of connection (0.0 to 1.0)
  directed?: boolean; // Whether the relationship is one-way
  metadata?: Record<string, any>;
}

export interface CalendarSystem {
  id: string;
  name: string;
  months: any[];
  eras: any[];
  weekDays?: string[];
  daysPerWeek?: number;
  hoursPerDay?: number;
  currentEpochDay?: number;
}

export interface Commit {
  id: string;
  timestamp: number;
  hash: string;
  message: string;
  snapshot?: Chapter[];
  diff?: string;
}

export type Language = string;

export interface Plotline {
  id: string;
  title: string;
  color: string;
}

export interface MatrixCell {
  id: string;
  content: string;
  eventId?: string;
  plotlineId?: string;
}

export interface CalendarMonth {
  id: string;
  name: string;
  days: number;
}

export interface BackupStatus {
  id: string;
  timestamp: number;
  status: 'pending' | 'delivered' | 'failed';
  wordCount?: number;
  hash?: string;
  resendId?: string;
}

export type BackupFrequency = 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface BackupSettings {
  frequency: BackupFrequency;
  lastBackupTime?: number;
  nextBackupTime?: number;
  enabled: boolean;
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
  coverImage?: string;
  origin?: 'cloud' | 'local';
}

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: 'admin' | 'editor';
  themeColor: string;
  lastActive?: number;
  preferences?: {
    themeMode: 'light' | 'dark';
    fontSize: 'sm' | 'md' | 'lg';
    fontFamily: 'sans' | 'serif' | 'mono';
    landingPage: ViewType;
    aiVerbosity: 'minimal' | 'balanced' | 'detailed';
    colorfulIcons: boolean;
    semanticSearchEnabled: boolean;
    reducedMotion?: boolean;
    mapLanguage?: string;
  };
}

export interface AppSettings {
  appName: string;
  aiCharacterLimit?: number;
  adminEmails?: string[];
  sidebarOrder?: ViewType[];
  bottomNavOrder?: ViewType[];
  defaultToolboxLinks?: ToolboxLink[];
}

export interface AppPrompts {
  GENERAL_AND_CHARACTERS: string;
  PLOT_MATRIX_ANALYSIS: string;
  AI_MODEL: string;
  NOTE_ENHANCEMENT: string;
  PROCESS_RAW_NOTES: string;
  TIMELINE: string;
  LOCATIONS: string;
  ARTIFACTS: string;
  LORE: string;
  STRUCTURAL_ANALYSIS: string;
  THEMES: string;
  RELATIONSHIPS: string;
  SOFT_ANCHORS: string;
  SENTIMENT: string;
  PLOT_AUDIT: string;
  THEME_EXTRACTION: string;
  CONLANG_GEN: string;
  PROJECT_QA: string;
  [key: string]: string | undefined;
}

export interface ToolboxLink {
  id: string;
  label: string;
  url: string;
  category: string;
  description?: string;
}

export interface Idea {
  id: string;
  content: string;
  tags: string[];
  timestamp: number;
  isCanon?: boolean;
}

export interface ChangeLogEntry {
  id: string;
  timestamp: number;
  entityType: string;
  entityName: string;
  entityId: string;
  action: string;
}

export interface SemanticDocument {
  id: string;
  title: string;
  content: string;
  lastModified: number;
}

export interface ManuscriptAnalysisResponse {
  title?: string;
  summary: string;
  themes: string[];
  characters: any[];
  minorCharacters?: any[];
  locations: any[];
  timeline: any[];
  artifacts: any[];
  lore: any[];
  relationships?: any[];
  coverDescription?: string;
  referenceUrls?: string[];
}

export interface AnalysisOptions {
  extractCharacters?: boolean;
  extractTimeline?: boolean;
  extractLocations?: boolean;
  extractArtifacts?: boolean;
  extractLore?: boolean;
}

export interface ContinuityError {
  id: string;
  type: 'character' | 'location' | 'timeline' | 'artifact' | 'lore' | 'general';
  severity: 'low' | 'medium' | 'high';
  message: string;
  context: string; // The text that triggered the error
  entityIds?: string[]; // Related entity IDs
}

export interface EntitySpan {
  entityId: string;
  entityName: string;
  type: 'character' | 'location' | 'artifact' | 'lore';
  start: number;
  end: number;
  snippet: string;
}
