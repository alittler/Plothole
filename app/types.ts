export enum ViewType {
  BOOKSHELF = 'Bookshelf',
  DASHBOARD = 'Dashboard',
  CHARACTERS = 'Characters',
  TIMELINE = 'Timeline',
  BOARD = 'Board',
  TABLE = 'Table',
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
  CELESTIAL = 'Celestial',
  CALENDAR2 = 'Calendar2',
  CODEX_HUB = 'CodexHub',
  PLOT_HUB = 'PlotHub'
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
  source?: 'manual' | 'ai' | 'ai_generated';
  images?: { url: string }[];
  firstMentionOffset?: number;
  lastMentionOffset?: number;

  // Physical and biographical details (from AI analysis)
  physical_description?: string;
  physicalFeatures?: string; // Height, weight, build, distinctive marks
  style?: string; // Clothing, appearance style
  strengths?: string; // Character strengths
  weaknesses?: string; // Character weaknesses
  birthday?: string; // Birth date

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
  tier?: 1 | 2 | 3;
  aliases?: string[];
  affiliation?: string;
  traits?: string[];
  motivation?: string;
  description: string;
  physical_description?: string;
  source: 'manual' | 'ai' | 'ai_generated';
  field_notes?: FieldNote[];

  // Legacy fields (for backwards compatibility)
  job?: string;
  images?: { url: string; caption?: string }[];
  species?: string;
  goals?: string;
  associatedLocationId?: string;
  lastMentionOffset?: number;
  firstMentionOffset?: number;
  conflict?: string;
  primary_trait?: string;
  location_id?: string;

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
  affiliation_legacy?: string;
  knowsAbout?: string[];
  x?: number;
  y?: number;
  parentId?: string;
  isLocked?: boolean;
}

// Field notes for rich metadata
export interface FieldNote {
  label: string;
  value: string;
  tag?: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  type?: string;
  mapImage?: string;
  source?: 'manual' | 'ai' | 'ai_generated';
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
  first_mention_offset?: number;
  field_notes?: FieldNote[];
}

export interface Artifact {
  id: string;
  name: string;
  type?: string;
  description: string;
  imageUrl?: string;
  source?: 'manual' | 'ai' | 'ai_generated';
  first_mention_offset?: number;
  field_notes?: FieldNote[];
}

export interface TimelineEvent {
  id: string;
  date?: string; // Legacy field, mapping to startDate if ISO
  month?: number; // 1-indexed
  day?: number;   // 1-indexed
  year?: number;  // Numeric year override
  title: string;
  description: string;
  charactersInvolved?: string[]; // Maps to attendees
  location?: string;
  source?: 'manual' | 'ai' | 'ai_generated';
  isSoftAnchor?: boolean;
  first_mention_offset?: number;
  field_notes?: FieldNote[];

  // Schema.org/Event Compatibility
  startDate?: string; // ISO-8601
  endDate?: string;   // ISO-8601
  eventStatus?: string;
  attendees?: string[];
  duration?: string; // ISO-8601 duration
  typicalAgeRange?: string;
}

export interface LoreEntry {
  id: string;
  term: string;
  type?: 'faction' | 'magic_system' | 'cosmology' | 'creature' | 'language' | 'religion' | 'law' | 'technology' | 'cultural_practice' | 'other' | string;
  tier?: 'background' | 'minor' | 'moderate' | 'major' | 'foundational' | string;
  associated_factions?: string[];
  related_terms?: string[];
  description: string;
  source?: 'manual' | 'ai' | 'ai_generated';
  first_mention_offset?: number;
  field_notes?: FieldNote[];

  // Legacy fields
  definition?: string;
  category?: string;
  tags?: string[];
  prefLabel?: string;
  altLabel?: string[];
  hiddenLabel?: string[];
  broader?: string[];
  narrower?: string[];
  related?: string[];
  scopeNote?: string;
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

export interface Note {
  id: string;
  content: string;
  tags: string[];
  timestamp?: number;
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
  shortName?: string;
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

