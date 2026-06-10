export enum ViewType {
  BOOKSHELF = 'Bookshelf',
  DASHBOARD = 'Dashboard',
  MANUSCRIPT_ANALYZER = 'ManuscriptAnalyzer',
  NOTEPAD = 'Notepad',
  CHARACTERS = 'Characters',
  MAP = 'Map',
  TIMELINE = 'Timeline',
  NARRATIVE_ARCHITECT = 'NarrativeArchitect',
  CODEX_HUB = 'CodexHub',
  PLOT_HUB = 'PlotHub',
  WORLD_HUB = 'WorldHub',
  RESEARCH = 'Research',
  OUTLINE = 'Outline',
  TOOLBOX = 'Toolbox',
  SETTINGS = 'Settings',
  ADMIN = 'Admin',
  // Legacy/Migration views from app/types.ts
  BOARD = 'Board',
  TABLE = 'Table',
  LOCATIONS = 'Locations',
  INVENTORY = 'Inventory',
  ENCYCLOPEDIA = 'Encyclopedia',
  PLOT_ANALYSIS = 'PlotAnalysis',
  PROCESSOR = 'Processor',
  SOURCE_READER = 'SourceReader',
  MATRIX = 'Matrix',
  DICTIONARY = 'Dictionary',
  SEMANTIC_EDITOR = 'SemanticEditor',
  STORY_ARCHITECT = 'StoryArchitect',
  CODEX = 'Codex',
  CARD_CATALOGUE = 'CardCatalogue',
  WORKSPACE_HUB = 'WorkspaceHub',
  SYSTEM_HUB = 'SystemHub',
  BESTIARY = 'Bestiary',
  CELESTIAL = 'Celestial',
  CALENDAR2 = 'Calendar2'
}

export const APP_DATA_VERSION = 12;

export type EntityTier = 1 | 2 | 3;

export interface HierarchicalEntity {
  id: string;
  name: string;
  tier: EntityTier;
  species: string;
  type: 'Character' | 'Location' | 'Item' | 'Event' | 'Lore' | string;
  motivation?: string;
  conflict?: string;
  aliases?: string[];
  primary_trait?: string;
  location_id?: string;
  role?: string;
  job?: string;
  nickname?: string;
  age?: string;
  birthplace?: string;
  residence?: string;
  traits?: string[];
  source?: 'manual' | 'ai' | 'ai_generated';
  images?: { url: string }[];
  firstMentionOffset?: number;
  lastMentionOffset?: number;
  physical_description?: string;
  physicalFeatures?: string;
  style?: string;
  strengths?: string;
  weaknesses?: string;
  birthday?: string;
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
  birthPlace?: string;
  homeLocation?: string;
  startDate?: string;
  endDate?: string;
  eventStatus?: string;
  attendees?: any[];
  duration?: string;
  dc_creator?: string;
  dc_publisher?: string;
  dc_title?: string;
  dc_date?: string;
  bibtex_type?: string;
  bibtex_journal?: string;
  bibtex_volume?: string;
  bibtex_number?: string;
  bibtex_pages?: string;
  prefLabel?: string;
  altLabel?: string[];
  broader?: string[];
  narrower?: string[];
  related?: string[];
  scopeNote?: string;
  description?: string;
  fieldNotes?: { label: string; value: string }[];
  metadata?: Record<string, any>;
}

export interface CatalogEntity {
  id: string;
  type: string;
  name: string;
  description?: string;
  tier?: EntityTier;
  [key: string]: any;
}

export interface EntityCatalog {
  id: string;
  projectId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  entities: CatalogEntity[];
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
  bibtex_key?: string;
  bibtex_type?: string;
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
  publisher?: string;
  publicationYear?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  accessDate?: string;
  isBroken?: boolean;
}

export interface ManuscriptDraft {
  id: string;
  name: string;
  content: string;
  timestamp: number;
  wordCount: number;
}

export interface ProjectData {
  id: string;
  title: string;
  shortName?: string;
  author: string;
  summary: string;
  lastModified: number;
  coverImage?: string;
  coverColor?: string;
  origin?: 'cloud' | 'local';
  characters: Character[];
  locations: Location[];
  artifacts?: Artifact[];
  lore?: LoreEntry[];
  sources?: Source[];
  codexSources?: { id: string; name: string; content: string }[];
  timeline: TimelineEvent[];
  relationships: Relationship[];
  chapters?: Chapter[];
  notes: Note[];
  ideas?: Idea[];
  inspirations?: Inspiration[];
  themes: string[];
  proseDocuments?: ProseDocument[];
  corkboardNotes?: ProseDocument[];
  semanticDocuments?: SemanticDocument[];
  userToolboxLinks?: ToolboxLink[];
  researchSources?: { id: string; name: string; type: string; uploadDate: number; size: number; extractionStatus: string; notes?: string }[];
  researchNotes?: { id: string; title: string; content: string; sourceIds: string[]; scriptureCitations: string[]; tags: string[]; createdAt: number; updatedAt: number }[];
  projectNotes?: { id: string; content: string; timestamp: number; category: 'edit' | 'character' | 'general' }[];
  entities: HierarchicalEntity[];
  manuscript: string;
  manuscriptDrafts?: ManuscriptDraft[];
  history_diff: string;
  assets: AssetMetadata[];
  manifest?: ProjectManifest;
  catalogs?: EntityCatalog[];
  sandboxCards?: any[];
  wordCount?: number;
  charCount?: number;
  commits?: Commit[];
  backups?: BackupStatus[];
  backupSettings?: BackupSettings;
  integrityHash?: string;
  latestManuscriptText?: string;
  lastProcessedManuscriptSha?: string;
  lastProcessedPromptSha?: string;
  aiContextLimit?: number;
  aiDeadThreads?: any[];
  changeLog?: any[];
  notepadCanvas?: { nodes: any[]; edges: any[]; };
  continuityErrors?: ContinuityError[];
  latestAnalysisResult?: string;
  customAnalysisPrompt?: string;
  rootMapImage?: string;
  isRealWorldMap?: boolean;
  mapScale?: number;
  mapUnit?: string;
  mapDefaultView?: any;
  paths?: MapPath[];
  calendarConfig?: CalendarConfig;
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

export interface FieldNote {
  label: string;
  value: string;
  tag?: string;
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
  description?: string;
  physical_description?: string;
  source?: 'manual' | 'ai' | 'ai_generated';
  first_mention_offset?: number;
  field_notes?: FieldNote[];
  job?: string;
  images?: { url: string; caption?: string }[];
  species?: string;
  goals?: string;
  associatedLocationId?: string;
  lastMentionOffset?: number;
  conflict?: string;
  primary_trait?: string;
  location_id?: string;
  physicalFeatures?: string;
  style?: string;
  strengths?: string;
  weaknesses?: string;
  nickname?: string;
  birthday?: string;
  age?: string;
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

export interface Location {
  id: string;
  name: string;
  description?: string;
  type?: string;
  scale?: string;
  parent_location_id?: string;
  controlling_faction?: string;
  inhabitants?: string[];
  x?: number;
  y?: number;
  is_locked?: boolean;
  source?: 'manual' | 'ai' | 'ai_generated';
  first_mention_offset?: number;
  field_notes?: FieldNote[];
  mapImage?: string;
  address?: string;
  icon?: string;
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

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  event_type?: string;
  significance?: string;
  real_world_sort_key?: number;
  is_flashback?: boolean;
  location_id?: string;
  participants?: string[];
  source?: 'manual' | 'ai' | 'ai_generated';
  first_mention_offset?: number;
  field_notes?: FieldNote[];
  date?: string;
  month?: number; // 1-indexed
  day?: number;   // 1-indexed
  year?: number;  // Numeric year override
  charactersInvolved?: string[];
  location?: string;
  isSoftAnchor?: boolean;
  startDate?: string;
  endDate?: string;
  eventStatus?: string;
  attendees?: string[];
  duration?: string;
  typicalAgeRange?: string;
}

export interface Artifact {
  id: string;
  name: string;
  description?: string;
  type?: string;
  significance?: string;
  current_owner_id?: string;
  location_id?: string;
  source?: 'manual' | 'ai' | 'ai_generated';
  first_mention_offset?: number;
  field_notes?: FieldNote[];
  imageUrl?: string;
}

export interface LoreEntry {
  id: string;
  term: string;
  description?: string;
  type?: string;
  tier?: string;
  associated_factions?: string[];
  related_terms?: string[];
  source?: 'manual' | 'ai' | 'ai_generated';
  first_mention_offset?: number;
  field_notes?: FieldNote[];
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
  sourceId: string;
  targetId: string;
  type: string;
  description?: string;
  predicate?: string;
  weight?: number;
  directed?: boolean;
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
    mapLanguage?: string;
  };
}

export interface AppSettings {
  appName: string;
  aiCharacterLimit?: number;
  narrativeChunkSize?: number;
  enableBackupPreview?: boolean;
  adminEmails?: string[];
  sidebarOrder?: ViewType[];
  bottomNavOrder?: ViewType[];
  defaultToolboxLinks?: ToolboxLink[];
}

export interface PromptPiece {
  id: string;
  category: 'characters' | 'locations' | 'timeline_events' | 'artifacts' | 'lore' | 'relationships';
  label: string;
  prompt: string;
  enabled: boolean;
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
  extractionPuzzle?: PromptPiece[];
  [key: string]: string | PromptPiece[] | undefined;
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
  context: string;
  entityIds?: string[];
}

export interface EntitySpan {
  entityId: string;
  entityName: string;
  type: 'character' | 'location' | 'artifact' | 'lore';
  start: number;
  end: number;
  snippet: string;
}

export interface CalendarConfig {
  year_len: number;
  events: Record<string, string[]>;
  n_months: number;
  months: string[];
  month_len: Record<string, number>;
  week_len: number;
  weekdays: string[];
  n_moons: number;
  moons: string[];
  lunar_cyc: Record<string, number>;
  lunar_shf: Record<string, number>;
  year: number;
  first_day: number;
  notes: Record<string, string>;
}

export const defaultCalendarConfig: CalendarConfig = {
  year_len: 365,
  events: { "1-1": ["New Year"] },
  n_months: 12,
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  month_len: {
    "January": 31, "February": 28, "March": 31, "April": 30, "May": 31, "June": 30,
    "July": 31, "August": 31, "September": 30, "October": 31, "November": 30, "December": 31
  },
  week_len: 7,
  weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  n_moons: 1,
  moons: ["Luna"],
  lunar_cyc: { "Luna": 29.53 },
  lunar_shf: { "Luna": 20 },
  year: 1,
  first_day: 0,
  notes: { "1-1": "A new beginning" }
};
