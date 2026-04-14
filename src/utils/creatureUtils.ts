import { HierarchicalEntity, ProjectData } from '../types';
import creaturesData from '@alittler/creatures';
import { generateId } from '../services/storageService';

export interface CreatureData {
  id: number;
  name: string;
  category: string;
  alignment: string;
  lat: number;
  lon: number;
  lore: string;
}

export const getAlignmentColor = (alignment: string): string => {
  const normalized = alignment.toLowerCase().trim();
  switch (normalized) {
    case 'benevolent': return '#10b981'; // Green (emerald-500)
    case 'malicious': return '#ef4444'; // Red (rose-500)
    case 'ambivalent': return '#f59e0b'; // Amber (amber-500)
    case 'neutral': return '#64748b'; // Slate (slate-500)
    default: return '#64748b';
  }
};

export const getCategoryColor = (category: string): string => {
  const normalized = category.toLowerCase().trim();
  switch (normalized) {
    case 'dragons': return '#ef4444'; // Red (rose-500)
    case 'anthromorphic':
    case 'anthropomorphic': return '#8b5cf6'; // Purple (violet-500)
    case 'zoomorphic': return '#10b981'; // Green (emerald-500)
    case 'hybrids of human and animal': return '#f59e0b'; // Amber (amber-500)
    case 'hybrid animals': return '#3b82f6'; // Blue (blue-500)
    default: return '#64748b'; // Slate (slate-500)
  }
};

export const getCreatureIconUrl = (category: string): string => {
  const normalizedCategory = category.toLowerCase().trim();
  switch (normalizedCategory) {
    case 'dragons': return '/assets/map-icons/dragon.png';
    case 'hybrid animals': return '/assets/map-icons/chimera.png';
    case 'hybrids of human and animal': return '/assets/map-icons/minotaur.png';
    case 'anthromorphic':
    case 'anthropomorphic': return '/assets/map-icons/cyclops.png';
    case 'zoomorphic': return '/assets/map-icons/bear.png';
    default: return '';
  }
};

export const getCreatureIconHtml = (category: string, alignment: string, size: number = 32): string => {
  const bgColor = getCategoryColor(category);
  const borderColor = getAlignmentColor(alignment);
  const iconUrl = getCreatureIconUrl(category);
  const innerSize = Math.round(size * 0.65);
  
  const iconContent = iconUrl 
    ? `<img src="${iconUrl}" style="width: ${innerSize}px; height: ${innerSize}px; object-fit: contain; filter: brightness(0) invert(1);" />`
    : `<span style="font-size: ${Math.round(size * 0.5)}px;">👹</span>`;

  return `<div style="background-color: ${bgColor}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;">
    ${iconContent}
  </div>`;
};

/**
 * Auto-generate bestiary entries for all creatures in the @alittler/creatures package.
 * Only creates entries for creatures that don't already exist in the project.
 */
export function ensureCreatureBestiaryEntries(projectData: ProjectData): ProjectData {
  if (!projectData.entities) {
    projectData.entities = [];
  }

  const creatures = creaturesData as CreatureData[];
  const existingCreatures = new Set(
    projectData.entities
      .filter(e => e.type === 'Creature' || e.type === 'Beast')
      .map(e => e.name.toLowerCase())
  );

  const newEntities: HierarchicalEntity[] = [];

  creatures.forEach(creature => {
    if (!existingCreatures.has(creature.name.toLowerCase())) {
      const newEntity: HierarchicalEntity = {
        id: `creature-${generateId()}`,
        name: creature.name,
        type: 'Creature',
        tier: 1,
        species: creature.category,
        description: creature.lore,
        source: 'manual',
        metadata: {
          creatureId: creature.id,
          category: creature.category,
          alignment: creature.alignment,
          latitude: creature.lat,
          longitude: creature.lon,
        },
      };
      newEntities.push(newEntity);
    }
  });

  if (newEntities.length > 0) {
    projectData.entities = [...projectData.entities, ...newEntities];
  }

  return projectData;
}

/**
 * Find a bestiary entry that matches a creature by name.
 */
export function findBestiaryEntryForCreature(
  projectData: ProjectData,
  creatureName: string
): HierarchicalEntity | undefined {
  return projectData.entities?.find(
    e => (e.type === 'Creature' || e.type === 'Beast') &&
    e.name.toLowerCase() === creatureName.toLowerCase()
  );
}

/**
 * Get creature data by name from the creatures package.
 */
export function getCreatureData(creatureName: string): CreatureData | undefined {
  return (creaturesData as CreatureData[]).find(
    c => c.name.toLowerCase() === creatureName.toLowerCase()
  );
}

