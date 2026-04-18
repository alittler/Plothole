import fs from 'fs';
import path from 'path';
import YAML from 'js-yaml';
import { HierarchicalEntity, ProjectData } from '../types';

const DECAP_DIR = '.decap';

interface DecapEntity {
  id: string;
  name: string;
  type?: string;
  tier?: '1' | '2' | '3';
  description?: string;
  [key: string]: any;
}

/**
 * Read all entities from Decap CMS collections
 */
export async function readDecapEntities(): Promise<HierarchicalEntity[]> {
  const entities: HierarchicalEntity[] = [];
  
  const collections = ['characters', 'locations', 'items', 'events', 'lore'];
  
  for (const collection of collections) {
    const collectionPath = path.join(process.cwd(), DECAP_DIR, collection);
    
    if (!fs.existsSync(collectionPath)) {
      continue;
    }
    
    const files = fs.readdirSync(collectionPath).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    
    for (const file of files) {
      try {
        const filePath = path.join(collectionPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = YAML.load(content) as DecapEntity;
        
        const entity: HierarchicalEntity = {
          id: data.id,
          name: data.name,
          type: getEntityType(collection, data),
          tier: (parseInt(data.tier || '2') as EntityTier),
          species: data.species,
          
          // Copy all fields
          ...data,
        };
        
        entities.push(entity);
      } catch (err) {
        console.error(`Error reading Decap file ${file}:`, err);
      }
    }
  }
  
  return entities;
}

/**
 * Write entities to Decap CMS YAML files
 */
export async function writeDecapEntities(entities: HierarchicalEntity[]): Promise<void> {
  // Group entities by type
  const groups: { [key: string]: HierarchicalEntity[] } = {
    Character: [],
    Location: [],
    Item: [],
    Event: [],
    Lore: [],
  };
  
  for (const entity of entities) {
    const type = entity.type || 'Lore';
    if (!groups[type]) groups[type] = [];
    groups[type].push(entity);
  }
  
  // Write each group to its collection
  const typeToCollection: { [key: string]: string } = {
    Character: 'characters',
    Location: 'locations',
    Item: 'items',
    Event: 'events',
    Lore: 'lore',
  };
  
  for (const [type, collectionEntities] of Object.entries(groups)) {
    const collection = typeToCollection[type];
    if (!collection) continue;
    
    const collectionPath = path.join(process.cwd(), DECAP_DIR, collection);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(collectionPath)) {
      fs.mkdirSync(collectionPath, { recursive: true });
    }
    
    for (const entity of collectionEntities) {
      try {
        const filename = `${entity.id}.yaml`;
        const filePath = path.join(collectionPath, filename);
        
        // Remove internal fields
        const { ...data } = entity;
        const yaml = YAML.dump(data, { indent: 2 });
        
        fs.writeFileSync(filePath, yaml, 'utf-8');
      } catch (err) {
        console.error(`Error writing entity ${entity.id}:`, err);
      }
    }
  }
}

/**
 * Sync Decap CMS entities to ProjectData
 */
export async function syncDecapToProject(projectData: ProjectData): Promise<ProjectData> {
  try {
    const entities = await readDecapEntities();
    return {
      ...projectData,
      entities,
    };
  } catch (err) {
    console.error('Error syncing Decap to project:', err);
    return projectData;
  }
}

/**
 * Sync ProjectData entities to Decap CMS
 */
export async function syncProjectToDecap(projectData: ProjectData): Promise<void> {
  try {
    if (projectData.entities && projectData.entities.length > 0) {
      await writeDecapEntities(projectData.entities);
    }
  } catch (err) {
    console.error('Error syncing project to Decap:', err);
  }
}

/**
 * Get entity type from collection name
 */
function getEntityType(collection: string, data: DecapEntity): string {
  const typeMap: { [key: string]: string } = {
    characters: 'Character',
    locations: 'Location',
    items: 'Item',
    events: 'Event',
    lore: 'Lore',
  };
  
  return typeMap[collection] || data.type || 'Lore';
}

/**
 * Initialize Decap CMS directories if they don't exist
 */
export function initializeDecapDirs(): void {
  const collections = ['characters', 'locations', 'items', 'events', 'lore', 'relationships'];
  
  for (const collection of collections) {
    const dir = path.join(process.cwd(), DECAP_DIR, collection);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

type EntityTier = 1 | 2 | 3;
