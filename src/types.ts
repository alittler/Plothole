export enum ViewType {
  BOOKSHELF = 'Bookshelf',
  DASHBOARD = 'Dashboard',
  CHARACTERS = 'Characters',
  TIMELINE = 'Timeline',
  BOARD = 'Board',
  TABLE = 'Table',
  CALENDAR = 'Calendar',
  GALLERY = 'Gallery',
  NOTES = 'Notes',
  MAP = 'Map',
  LOCATIONS = 'Locations',
  ADMIN = 'Admin',
  SETTINGS = 'Settings',
  INVENTORY = 'Inventory',
  ENCYCLOPEDIA = 'Encyclopedia',
  PLOT_ANALYSIS = 'PlotAnalysis',
  MANUSCRIPT = 'Manuscript',
  PROCESSOR = 'Processor',
  TOOLBOX = 'Toolbox',
  SOURCE_READER = 'SourceReader',
  MATRIX = 'Matrix',
  DICTIONARY = 'Dictionary',
  STENO_RESEARCH = 'StenoResearch',
  SEMANTIC_EDITOR = 'SemanticEditor'
}

export const APP_DATA_VERSION = 11;

export interface Scene {
  id: string;
  title: string;
  content: string;
  wordCount: number;
}

/**
 * Consolidated Chapter interface to support both hierarchical structure (NovelSplitter)
 * and flat drafting content (ManuscriptView).
 */
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

export interface Act {
  id: string;
  title: string;
  chapters: Chapter[];
  wordCount: number;
}

export interface ManuscriptStructure {
  acts: Act[];
  totalWords: number;
  config: {
    actPattern: string;
    chapterPattern: string;
    scenePattern: string;
  };
}

export interface AppPrompts {
  GENERAL_AND_CHARACTERS: string;
  PLOT_MATRIX_ANALYSIS: string;
  TIMELINE: string;
  LOCATIONS: string;
  ARTIFACTS: string;
  LORE: string;
  NOTE_ENHANCEMENT: string;
  PROCESS_RAW_NOTES: string;
  STRUCTURAL_ANALYSIS: string;
  SENTIMENT: string;
  RELATIONSHIPS: string;
  PROJECT_QA: string;
  MISSPELLINGS_SCAN: string;
  TOOLBOX_URL_ANALYSIS: string;
  GENERATE_CONLANG_WORD: string;
  CONNECT_NOTES: string;
  AI_MODEL: string;
}

export interface Plotline {
  id: string;
  title: string;
  color: string;
  description?: string;
}

export interface MatrixCell {
  eventId: string;
  plotlineId: string;
  content: string;
}

export interface ToolboxLink {
  id: string;
  label: string;
  url: string;
  category: string;
  description?: string;
}

export interface CharacterMisspelling {
  word: string;
  context: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  traits: string[];
  species?: string;
  family?: string;
  archetype?: string;
  imageUrl?: string; 
  aliases?: string[];
  associatedLocationId?: string;
  source?: 'manual' | 'ai';
  misspellings?: CharacterMisspelling[];
  isMinor?: boolean;
  livingStatus?: string;
  goals?: string;
}

export interface LexiconEntry {
  id: string;
  original: string;
  translation: string;
  partOfSpeech?: string;
  definition?: string;
  notes?: string;
}

export interface Language {
  id: string;
  name: string;
  description: string;
  phonology?: string;
  aiParameters?: string;
  lexicon: LexiconEntry[];
}

export interface ArchetypeDefinition {
  name: string;
  description: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: string; 
  description: string;
  possessorId?: string; 
  history?: string;
  significance?: string;
  source?: 'manual' | 'ai';
}

export interface Source {
  id: string;
  title: string;
  url?: string;
  content: string;
  type: 'pdf' | 'web' | 'text' | 'youtube';
  summary?: string;
  tags: string[];
  dateAdded: number;
  author?: string;
  citation?: string;
}

export type LoreCategory = 'General' | 'Faction' | 'Religion' | 'Magic' | 'Species' | 'Language' | 'Tradition' | 'Culture' | 'Dictionary' | 'Encyclopedia';

export interface LoreEntry {
  id: string;
  term: string;
  definition: string;
  category: LoreCategory; 
  relatedIds?: string[]; 
  source?: 'manual' | 'ai';
  metadata?: Record<string, string>; 
}

export interface PlotBeat {
  id: string;
  beatName: string; 
  description: string;
  timelineEventId?: string; 
  confidence?: number; 
}

export interface PlotHole {
  id: string;
  description: string;
  severity: 'Minor' | 'Major' | 'Critical';
  suggestion?: string;
}

export interface SentimentPoint {
  timelineEventId: string;
  score: number; 
  label: string; 
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string; 
  description?: string;
}

export interface TimelineEvent {
  id: string;
  date: string; 
  title: string;
  description: string;
  charactersInvolved: string[];
  location: string;
  source?: 'manual' | 'ai';
}

export interface Inspiration {
  id: string;
  type: 'image' | 'link' | 'note';
  content: string; 
  title?: string;
  timestamp: number;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  type: string;
  parentId?: string; 
  mapImage?: string; 
  isRealWorld?: boolean; 
  x?: number; 
  y?: number; 
  lat?: number; 
  lng?: number; 
  mapScale?: number; 
  mapUnit?: string; 
  inspirations?: Inspiration[];
  source?: 'manual' | 'ai';
}

export interface Note {
  id: string;
  content: string;
  tags: string[];
  expandedContent?: string;
  metaSummary?: string;
  aiAnalysis?: string;
  timestamp: number;
  imageUrl?: string;
  isCanon?: boolean;
  isDead?: boolean;
  isSavedInLedger?: boolean;
}

export interface CalendarMonth {
  id: string;
  name: string;
  days: number;
}

export interface CalendarEra {
  id: string;
  name: string;
  abbreviation: string; 
  startYear: number;
  endYear?: number;
}

export interface CalendarSystem {
  id: string;
  name: string;
  description?: string;
  weekDays: string[]; 
  months: CalendarMonth[];
  eras: CalendarEra[];
  currentDate?: { year: number; monthIndex: number; day: number };
}

export interface ChangeLogEntry {
  id: string;
  timestamp: number;
  entityType: 'Character' | 'Location' | 'Timeline' | 'Note' | 'Settings' | 'Relationship' | 'Artifact' | 'Lore' | 'Chapter' | 'Plotline';
  entityName: string;
  action: 'Created' | 'Updated' | 'Deleted';
  details?: string;
}

export interface ManuscriptHistoryEntry {
  id: string;
  filename: string;
  timestamp: number;
  content: string;
}

export interface AnalysisOptions {
  extractCharacters: boolean;
  extractTimeline: boolean;
  extractLocations: boolean;
  extractArtifacts: boolean;
  extractLore: boolean;
}

export interface LedgerEntry {
  id: string;
  content: string;
  timestamp: number;
  tags: string[];
}

export interface SemanticDocument {
  id: string;
  title: string;
  content: string;
  lastModified: number;
}

export interface Idea {
  id: string;
  content: string;
  tags: string[];
  isCanon: boolean;
  timestamp: number;
}

export interface ProjectData {
  id: string;
  lastModified: number;
  title: string;
  shortName?: string;
  author?: string;
  version?: string; 
  summary: string;
  coverDescription?: string;
  characters: Character[];
  minorCharacters?: string[];
  relationships: Relationship[];
  timeline: TimelineEvent[];
  locations: Location[];
  artifacts?: Artifact[];
  lore?: LoreEntry[];
  chapters?: Chapter[];
  plotBeats?: PlotBeat[];
  plotHoles?: PlotHole[]; 
  sentimentArc?: SentimentPoint[];
  notes: Note[];
  ideas?: Note[];
  themes: string[];
  ledger?: Note[];

  manuscriptHistory?: ManuscriptHistoryEntry[];
  latestManuscriptText?: string;
  manuscriptLastUploaded?: number;
  manuscriptOriginalFilename?: string;
  manuscriptFileCreated?: number;

  archetypeDefinitions?: ArchetypeDefinition[];
  aiContextLimit?: number; 
  characterLimit?: number; // threshold for full cards

  rootMapImage?: string; 
  mapScale?: number;
  mapUnit?: string;
  mapTabOrder?: string[]; 
  navOrder?: ViewType[];

  calendars: CalendarSystem[];
  activeCalendarId?: string;

  portraitStyle?: string;
  coverImage?: string; 

  changeLog?: ChangeLogEntry[];
  hiddenViews?: ViewType[];
  adminToolboxLinks?: ToolboxLink[];

  plotlines?: Plotline[];
  matrixCells?: MatrixCell[];

  languages?: Language[];

  semanticDocuments?: SemanticDocument[];

  isSampleProject?: boolean;
}

export interface ProjectMetadata {
  id: string;
  title: string;
  shortName?: string;
  author?: string;
  summary: string;
  coverDescription?: string;
  lastModified: number;
  characterCount: number;
  locationCount: number;
  wordCount?: number;
  portraitStyle?: string; 
  coverImage?: string; 
  characters?: { id: string; name: string; role: string; description?: string }[];
  locations?: { id: string; name: string; type: string; description?: string }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  backupEmail?: string;
  role: 'admin' | 'editor';
  lastActive: number;
  themeColor: string;
  avatarUrl?: string;
  preferences?: {
    themeMode?: 'light' | 'dark';
    fontSize?: 'sm' | 'md' | 'lg';
    fontFamily?: 'sans' | 'serif';
    landingPage?: ViewType;
    aiVerbosity?: 'concise' | 'detailed';
    colorfulIcons?: boolean;
    reducedMotion?: boolean;
    showAutoSaveIndicator?: boolean;
    semanticSearchEnabled?: boolean;
  };
}

export interface BackupFile {
  version: number;
  timestamp: number;
  source: string;
  projectData?: ProjectData;
  allProjects?: ProjectData[];
  globalNotes?: Note[];
}

/**
 * Fix: Use full types for properties that include IDs generated by the AI service.
 */
export interface ManuscriptAnalysisResponse {
  title: string;
  summary: string;
  coverDescription: string;
  characters: Character[];
  minorCharacters: string[];
  timeline: TimelineEvent[];
  locations: Location[];
  themes: string[];
  artifacts: Artifact[];
  lore: LoreEntry[];
  urls: string[];
}
