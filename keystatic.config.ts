import { collection, config, fields } from '@keystatic/core';

const characterFields = {
  id: fields.slug({ name: { label: 'ID' } }),
  name: fields.text({ label: 'Character Name', validation: { isRequired: true } }),
  species: fields.text({ label: 'Species/Race' }),
  tier: fields.select({
    label: 'Character Tier',
    description: 'Tier 1: Core protagonist/antagonist, Tier 2: Supporting, Tier 3: Background',
    options: [
      { label: 'Tier 1 (Core)', value: '1' },
      { label: 'Tier 2 (Supporting)', value: '2' },
      { label: 'Tier 3 (Background)', value: '3' },
    ],
    defaultValue: '2',
  }),
  role: fields.text({ label: 'Role/Title' }),
  description: fields.textarea({ label: 'Physical Description' }),
  
  // Tier 1 (Core)
  motivation: fields.textarea({ label: 'Motivation' }),
  conflict: fields.textarea({ label: 'Central Conflict' }),
  aliases: fields.array(fields.text({ label: 'Alias' }), {
    label: 'Known Aliases',
    itemLabel: (props) => props.value,
  }),
  
  // Tier 2 (Supporting)
  traits: fields.array(fields.text({ label: 'Trait' }), {
    label: 'Personality Traits',
    itemLabel: (props) => props.value,
  }),
  primary_trait: fields.text({ label: 'Primary Trait' }),
  job: fields.text({ label: 'Job/Occupation' }),
  age: fields.text({ label: 'Age' }),
  birthplace: fields.text({ label: 'Birthplace' }),
  residence: fields.text({ label: 'Current Residence' }),
  location_id: fields.text({ label: 'Associated Location ID' }),
  
  // Schema.org extensions
  givenName: fields.text({ label: 'Given Name' }),
  familyName: fields.text({ label: 'Family Name' }),
  gender: fields.text({ label: 'Gender' }),
  nationality: fields.text({ label: 'Nationality' }),
  affiliation: fields.text({ label: 'Affiliations/Organizations' }),
  
  // Metadata
  firstMentionOffset: fields.integer({ label: 'First Mention Offset (chars)' }),
  lastMentionOffset: fields.integer({ label: 'Last Mention Offset (chars)' }),
  source: fields.select({
    label: 'Source',
    options: [
      { label: 'Manual Entry', value: 'manual' },
      { label: 'AI Generated', value: 'ai' },
    ],
    defaultValue: 'manual',
  }),
};

const locationFields = {
  id: fields.slug({ name: { label: 'ID' } }),
  name: fields.text({ label: 'Location Name', validation: { isRequired: true } }),
  type: fields.text({ label: 'Type (City, Region, Building, etc)' }),
  tier: fields.select({
    label: 'Location Tier',
    options: [
      { label: 'Tier 1 (Core)', value: '1' },
      { label: 'Tier 2 (Supporting)', value: '2' },
      { label: 'Tier 3 (Background)', value: '3' },
    ],
    defaultValue: '2',
  }),
  description: fields.textarea({ label: 'Description' }),
  
  // Location-specific fields
  climate: fields.text({ label: 'Climate' }),
  population: fields.text({ label: 'Population' }),
  government: fields.text({ label: 'Government Type' }),
  culture: fields.text({ label: 'Culture/Society' }),
  inhabitants: fields.array(fields.text({ label: 'Inhabitant ID' }), {
    label: 'Notable Inhabitants',
    itemLabel: (props) => props.value,
  }),
  
  // Coordinates/Geography
  latitude: fields.number({ label: 'Latitude' }),
  longitude: fields.number({ label: 'Longitude' }),
  
  source: fields.select({
    label: 'Source',
    options: [
      { label: 'Manual Entry', value: 'manual' },
      { label: 'AI Generated', value: 'ai' },
    ],
    defaultValue: 'manual',
  }),
};

const itemFields = {
  id: fields.slug({ name: { label: 'ID' } }),
  name: fields.text({ label: 'Item Name', validation: { isRequired: true } }),
  type: fields.text({ label: 'Item Type (Weapon, Artifact, etc)' }),
  tier: fields.select({
    label: 'Item Tier',
    options: [
      { label: 'Tier 1 (Core)', value: '1' },
      { label: 'Tier 2 (Supporting)', value: '2' },
      { label: 'Tier 3 (Background)', value: '3' },
    ],
    defaultValue: '2',
  }),
  description: fields.textarea({ label: 'Description' }),
  
  // Item properties
  origin: fields.text({ label: 'Origin/Creator' }),
  powers: fields.textarea({ label: 'Powers/Abilities' }),
  owner: fields.text({ label: 'Current Owner ID' }),
  location: fields.text({ label: 'Current Location' }),
  
  source: fields.select({
    label: 'Source',
    options: [
      { label: 'Manual Entry', value: 'manual' },
      { label: 'AI Generated', value: 'ai' },
    ],
    defaultValue: 'manual',
  }),
};

const eventFields = {
  id: fields.slug({ name: { label: 'ID' } }),
  name: fields.text({ label: 'Event Name', validation: { isRequired: true } }),
  type: fields.text({ label: 'Event Type' }),
  tier: fields.select({
    label: 'Event Tier',
    options: [
      { label: 'Tier 1 (Core)', value: '1' },
      { label: 'Tier 2 (Supporting)', value: '2' },
      { label: 'Tier 3 (Background)', value: '3' },
    ],
    defaultValue: '2',
  }),
  description: fields.textarea({ label: 'Description' }),
  
  // Event timeline
  startDate: fields.text({ label: 'Start Date' }),
  endDate: fields.text({ label: 'End Date' }),
  duration: fields.text({ label: 'Duration' }),
  
  // Event details
  location_id: fields.text({ label: 'Location ID' }),
  attendees: fields.array(fields.text({ label: 'Attendee ID' }), {
    label: 'Attendees',
    itemLabel: (props) => props.value,
  }),
  consequences: fields.textarea({ label: 'Consequences/Impact' }),
  
  source: fields.select({
    label: 'Source',
    options: [
      { label: 'Manual Entry', value: 'manual' },
      { label: 'AI Generated', value: 'ai' },
    ],
    defaultValue: 'manual',
  }),
};

const loreFields = {
  id: fields.slug({ name: { label: 'ID' } }),
  name: fields.text({ label: 'Lore/Concept Name', validation: { isRequired: true } }),
  category: fields.text({ label: 'Category (Magic, Religion, History, etc)' }),
  tier: fields.select({
    label: 'Lore Tier',
    options: [
      { label: 'Tier 1 (Core)', value: '1' },
      { label: 'Tier 2 (Supporting)', value: '2' },
      { label: 'Tier 3 (Background)', value: '3' },
    ],
    defaultValue: '2',
  }),
  description: fields.textarea({ label: 'Description' }),
  
  // Lore properties
  origin: fields.textarea({ label: 'Origin/History' }),
  significance: fields.textarea({ label: 'Significance to Story' }),
  relatedConcepts: fields.array(fields.text({ label: 'Related Concept' }), {
    label: 'Related Concepts',
    itemLabel: (props) => props.value,
  }),
  
  source: fields.select({
    label: 'Source',
    options: [
      { label: 'Manual Entry', value: 'manual' },
      { label: 'AI Generated', value: 'ai' },
    ],
    defaultValue: 'manual',
  }),
};

const relationshipFields = {
  id: fields.slug({ name: { label: 'ID' } }),
  entityA: fields.text({ label: 'First Entity ID', validation: { isRequired: true } }),
  entityB: fields.text({ label: 'Second Entity ID', validation: { isRequired: true } }),
  relationship: fields.text({ label: 'Relationship Type', validation: { isRequired: true } }),
  description: fields.textarea({ label: 'Relationship Description' }),
  bidirectional: fields.checkbox({ label: 'Is Bidirectional?' }),
};

export default config({
  collections: {
    characters: collection({
      label: 'Characters',
      slugField: 'name',
      path: '.keystatic/characters/*',
      format: { data: 'yaml' },
      schema: characterFields,
    }),
    locations: collection({
      label: 'Locations',
      slugField: 'name',
      path: '.keystatic/locations/*',
      format: { data: 'yaml' },
      schema: locationFields,
    }),
    items: collection({
      label: 'Items & Artifacts',
      slugField: 'name',
      path: '.keystatic/items/*',
      format: { data: 'yaml' },
      schema: itemFields,
    }),
    events: collection({
      label: 'Events & Timeline',
      slugField: 'name',
      path: '.keystatic/events/*',
      format: { data: 'yaml' },
      schema: eventFields,
    }),
    lore: collection({
      label: 'Lore & Worldbuilding',
      slugField: 'name',
      path: '.keystatic/lore/*',
      format: { data: 'yaml' },
      schema: loreFields,
    }),
    relationships: collection({
      label: 'Relationships',
      slugField: 'entityA',
      path: '.keystatic/relationships/*',
      format: { data: 'yaml' },
      schema: relationshipFields,
    }),
  },
});
