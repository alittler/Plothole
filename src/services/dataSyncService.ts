/**
 * Service to sync AI-generated manuscript data to the `/data/` filesystem
 * This makes the data accessible through the Data Editor
 */

export interface DataSyncPayload {
  characters?: Array<{
    id?: string;
    name: string;
    role?: string;
    job?: string;
    description?: string;
    physicalFeatures?: string;
    traits?: string[];
    age?: string | number;
    [key: string]: any;
  }>;
  locations?: Array<{
    id?: string;
    name: string;
    description?: string;
    type?: string;
    [key: string]: any;
  }>;
  events?: Array<{
    id?: string;
    title: string;
    description?: string;
    date?: string;
    [key: string]: any;
  }>;
  artifacts?: Array<{
    id?: string;
    name: string;
    description?: string;
    type?: string;
    [key: string]: any;
  }>;
  lore?: Array<{
    id?: string;
    term: string;
    definition?: string;
    category?: string;
    [key: string]: any;
  }>;
}

/**
 * Save AI-generated data to the Data Editor filesystem
 */
export const syncDataToEditor = async (payload: DataSyncPayload): Promise<void> => {
  try {
    // Save characters
    if (payload.characters && payload.characters.length > 0) {
      for (const character of payload.characters) {
        await saveDataFile('characters', character);
      }
    }

    // Save locations
    if (payload.locations && payload.locations.length > 0) {
      for (const location of payload.locations) {
        await saveDataFile('locations', location);
      }
    }

    // Save events
    if (payload.events && payload.events.length > 0) {
      for (const event of payload.events) {
        await saveDataFile('events', event);
      }
    }

    // Save artifacts/items
    if (payload.artifacts && payload.artifacts.length > 0) {
      for (const artifact of payload.artifacts) {
        await saveDataFile('items', artifact);
      }
    }

    // Save lore
    if (payload.lore && payload.lore.length > 0) {
      for (const item of payload.lore) {
        await saveDataFile('lore', item);
      }
    }
  } catch (error) {
    console.error('[DataSync] Error syncing data to editor:', error);
    throw error;
  }
};

/**
 * Save a single data item to the Data Editor
 */
async function saveDataFile(category: string, item: any): Promise<void> {
  // Generate filename from name, term, or title
  const name = item.name || item.term || item.title || 'unknown';
  const filename = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}.json`;

  try {
    const response = await fetch('/api/data/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, filename, content: item })
    });

    if (!response.ok) {
      throw new Error(`Failed to save ${name}: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`[DataSync] Error saving ${category}/${filename}:`, error);
    throw error;
  }
}
