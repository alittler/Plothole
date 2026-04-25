import { z } from 'zod';

export const CharacterSchema = z.object({
  name: z.string().min(1),
  traits: z.array(z.string()).default([]),
  motivation: z.string().optional(),
  description: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  tier: z.number().min(1).max(3).default(2),
  type: z.literal('Character').default('Character')
});

export const LocationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.literal('Location').default('Location')
});

export const EventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().optional(),
  charactersInvolved: z.array(z.string()).default([]),
  type: z.literal('Event').default('Event')
});

export const NarrativeExtractionSchema = z.object({
  characters: z.array(CharacterSchema).default([]),
  locations: z.array(LocationSchema).default([]),
  events: z.array(EventSchema).default([])
});

export type CharacterData = z.infer<typeof CharacterSchema>;
export type LocationData = z.infer<typeof LocationSchema>;
export type EventData = z.infer<typeof EventSchema>;
export type NarrativeExtraction = z.infer<typeof NarrativeExtractionSchema>;
