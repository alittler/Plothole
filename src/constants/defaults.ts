import { AppPrompts, AppSettings } from '../types';

export const DEFAULT_APP_PROMPTS: AppPrompts = {
  GENERAL_AND_CHARACTERS: '',
  PLOT_MATRIX_ANALYSIS: '',
  AI_MODEL: 'gemini-2.0-flash-exp',
  NOTE_ENHANCEMENT: '',
  PROCESS_RAW_NOTES: '',
  TIMELINE: '',
  LOCATIONS: '',
  ARTIFACTS: '',
  LORE: '',
  STRUCTURAL_ANALYSIS: '',
  THEMES: '',
  RELATIONSHIPS: '',
  SOFT_ANCHORS: '',
  SENTIMENT: '',
  PLOT_AUDIT: '',
  THEME_EXTRACTION: '',
  CONLANG_GEN: '',
  PROJECT_QA: '',
  extractionPuzzle: [
    {
      id: 'characters',
      category: 'characters',
      label: 'Characters',
      enabled: true,
      prompt: `Extract all CHARACTERS from the manuscript. Return as JSON with this exact structure:
{
  "characters": [
    {
      "name": "Character Name",
      "role": "protagonist/antagonist/supporting/minor",
      "tier": 1 or 2 or 3,
      "physical_description": "Physical appearance only: height, build, distinctive features, clothing style",
      "description": "Personality, background, and story role",
      "traits": ["trait1", "trait2", "trait3"],
      "motivation": "Character's primary motivation",
      "aliases": ["alternate name", "nickname"],
      "affiliation": "Faction or group they belong to"
    }
  ]
}`
    },
    {
      id: 'locations',
      category: 'locations',
      label: 'Locations',
      enabled: true,
      prompt: `Extract all LOCATIONS from the manuscript. Return as JSON with this exact structure:
{
  "locations": [
    {
      "name": "Location Name",
      "type": "city/building/region/wilderness/other",
      "description": "Description of the location",
      "inhabitants": ["person1", "group1"],
      "controlling_faction": "Who controls this location"
    }
  ]
}`
    },
    {
      id: 'timeline_events',
      category: 'timeline_events',
      label: 'Timeline Events',
      enabled: true,
      prompt: `Extract all EVENTS and PLOT POINTS from the manuscript. Return as JSON with this exact structure:
{
  "timeline_events": [
    {
      "title": "Event Name",
      "event_type": "battle/political/personal/discovery/death/birth/ceremony/travel/revelation/other",
      "significance": "minor/major/pivotal",
      "description": "What happened",
      "date": "Timeline indicator if available",
      "participants": ["character1", "character2"],
      "location": "Location name if relevant",
      "is_flashback": false
    }
  ]
}`
    },
    {
      id: 'artifacts',
      category: 'artifacts',
      label: 'Artifacts',
      enabled: true,
      prompt: `Extract all ARTIFACTS, ITEMS, and OBJECTS of significance from the manuscript. Return as JSON with this exact structure:
{
  "artifacts": [
    {
      "name": "Artifact Name",
      "type": "weapon/armor/tool/document/relic/container/vehicle/consumable/other",
      "significance": "minor/major/pivotal",
      "description": "Appearance and properties",
      "current_owner": "Owner name if known",
      "location": "Current location if known"
    }
  ]
}`
    },
    {
      id: 'lore',
      category: 'lore',
      label: 'Lore & Worldbuilding',
      enabled: true,
      prompt: `Extract all LORE, WORLDBUILDING CONCEPTS, and SYSTEMS from the manuscript. Return as JSON with this exact structure:
{
  "lore": [
    {
      "term": "Concept Name",
      "type": "faction/magic_system/cosmology/creature_species/language/religion/law/technology/cultural_practice/other",
      "tier": "background/minor/moderate/major/foundational",
      "description": "What this concept is and how it works",
      "associated_factions": ["faction1", "faction2"],
      "related_terms": ["related_concept1", "related_concept2"]
    }
  ]
}`
    },
    {
      id: 'relationships',
      category: 'relationships',
      label: 'Relationships',
      enabled: true,
      prompt: `Extract all CHARACTER RELATIONSHIPS from the manuscript. Return as JSON with this exact structure:
{
  "relationships": [
    {
      "character_a": "Character Name 1",
      "character_b": "Character Name 2",
      "relationship_type": "sibling/parent/ally/rival/mentor/romantic/enemy/acquaintance/unknown",
      "direction": "mutual/a_to_b/b_to_a",
      "trust_level": 7,
      "status": "active/strained/severed/latent/hostile/resolved",
      "description": "How they interact and their dynamic"
    }
  ]
}`
    }
  ]
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appName: 'Plothole — Your Story, Decoded',
  adminEmails: ['alittler86@gmail.com'],
  narrativeChunkSize: 2000,
  enableBackupPreview: false,
  defaultToolboxLinks: [
    {
      id: 'demo-demographics',
      label: 'Fantasy Demographics Generator',
      url: 'https://donjon.bin.sh/fantasy/demographics/',
      category: 'World Building',
      description: 'Generate realistic demographic data for fantasy settlements'
    },
    {
      id: 'demo-magic-gen',
      label: 'Magic Generator',
      url: 'https://www.litrpgadventures.com/ai-tools/magic-generator/',
      category: 'World Building',
      description: 'Create unique magic systems and spells'
    },
    {
      id: 'demo-onelook',
      label: 'OneLook Dictionary',
      url: 'https://www.onelook.com/',
      category: 'Language',
      description: 'Search across multiple dictionaries simultaneously'
    },
    {
      id: 'demo-ogham',
      label: 'Ogham',
      url: 'https://ogham.co/',
      category: 'Language',
      description: 'Ancient Irish alphabet and writing system'
    },
    {
      id: 'demo-ipa',
      label: 'IPA Reader',
      url: 'https://ipa-reader.com/',
      category: 'Language',
      description: 'Pronunciation helper using International Phonetic Alphabet'
    },
    {
      id: 'demo-vulgarlang',
      label: 'Vulgar',
      url: 'https://www.vulgarlang.com/',
      category: 'Language',
      description: 'Create constructed and fictional languages'
    }
  ]
};
