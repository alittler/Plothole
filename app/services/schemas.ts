import { z } from 'zod';

export const CharacterSchema = z.object({
  name: z.string().min(1),
  traits: z.preprocess((val) => val || [], z.array(z.string())).default([]),
  motivation: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  physical_description: z.string().optional().nullable(),
  affiliation: z.string().optional().nullable(),
  aliases: z.preprocess((val) => val || [], z.array(z.string())).default([]),
  tier: z.preprocess((val) => Number(val) || 2, z.number().min(1).max(3)).default(2),
  type: z.preprocess((val) => val || 'Character', z.string()).default('Character'),
  role: z.string().optional().nullable(),
  job: z.string().optional().nullable()
});

export const LocationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.preprocess((val) => val || 'Location', z.string()).default('Location')
});

export const EventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  charactersInvolved: z.preprocess((val) => val || [], z.array(z.string())).default([]),
  type: z.preprocess((val) => val || 'Event', z.string()).default('Event')
});

export const NarrativeExtractionSchema = z.object({
  characters: z.array(CharacterSchema).default([]),
  locations: z.array(LocationSchema).default([]),
  events: z.array(EventSchema).default([]),
  plotPoints: z.array(z.object({
    title: z.string().min(1),
    summary: z.string().optional().nullable(),
    timeline: z.string().optional().nullable()
  })).default([])
});

export type CharacterData = z.infer<typeof CharacterSchema>;
export type LocationData = z.infer<typeof LocationSchema>;
export type EventData = z.infer<typeof EventSchema>;
export type NarrativeExtraction = z.infer<typeof NarrativeExtractionSchema>;
