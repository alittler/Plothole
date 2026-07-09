import JSZip from 'jszip';
import YAML from 'js-yaml';

const TEMPLATE_STORAGE_KEY = 'plothole_character_template';
const DEFAULT_TEMPLATE = `version: "1.0.0"
layout:
  - tab: "Core"
    fields:
      - { key: "name", type: "title" }
      - { key: "role", type: "subtitle" }
  - tab: "Details"
    fields:
      - { key: "description", type: "text" }
`;

export interface CharacterTemplateData {
  yaml: string;
  lastModified: number;
}

export interface ManifestData {
  package_id: string;
  version: string;
  character_name: string;
  last_updated: string;
  integrity_hash: string;
  files: {
    data: string;
    layout: string;
  };
}

// Get the global template from localStorage
export const getGlobalTemplate = (): string => {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATE;
  const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
  return stored ? stored : DEFAULT_TEMPLATE;
};

// Save the global template to localStorage
export const saveGlobalTemplate = (yaml: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TEMPLATE_STORAGE_KEY, yaml);
};

// Reset to default template
export const resetGlobalTemplate = (): string => {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATE;
  localStorage.setItem(TEMPLATE_STORAGE_KEY, DEFAULT_TEMPLATE);
  return DEFAULT_TEMPLATE;
};

// Calculate SHA-256 hash (browser-compatible)
export const calculateHash = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Create a .phole package
export const createPHolePackage = async (
  dataJson: Record<string, any>,
  renderingYaml: string,
  characterName: string,
  packageId: string = 'plothole.character.v1',
  version: string = '1.0.0'
): Promise<Blob> => {
  const zip = new JSZip();

  // Prepare files
  const dataText = JSON.stringify(dataJson, null, 2);
  const dataHash = await calculateHash(dataText);

  const manifest: ManifestData = {
    package_id: packageId,
    version,
    character_name: characterName,
    last_updated: new Date().toISOString(),
    integrity_hash: dataHash,
    files: {
      data: 'data.json',
      layout: 'rendering.yaml',
    },
  };

  // Add files to ZIP
  zip.file('data.json', dataText);
  zip.file('rendering.yaml', renderingYaml);
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Generate the ZIP blob
  return await zip.generateAsync({ type: 'blob' });
};

// Parse a .phole package
export const parsePHolePackage = async (file: File): Promise<{
  manifest: ManifestData;
  rendering: string;
  data: Record<string, any>;
}> => {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);

  const manifestFile = contents.file('manifest.json');
  const renderingFile = contents.file('rendering.yaml');
  const dataFile = contents.file('data.json');

  if (!manifestFile || !renderingFile || !dataFile) {
    throw new Error('Missing required files in .phole package');
  }

  const manifest: ManifestData = JSON.parse(await manifestFile.async('text'));
  const rendering = await renderingFile.async('text');
  const data: Record<string, any> = JSON.parse(await dataFile.async('text'));

  return { manifest, rendering, data };
};

// Validate template YAML structure
export const validateTemplate = (yaml: string): { valid: boolean; error?: string } => {
  try {
    const parsed = YAML.load(yaml) as any;
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Template must be a valid YAML object' };
    }
    if (!parsed.layout || !Array.isArray(parsed.layout)) {
      return { valid: false, error: 'Template must have a "layout" array' };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Invalid YAML: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
};

// Generate a blank character object based on the template schema
export const generateBlankCharacter = (templateYaml: string): Record<string, any> => {
  try {
    const parsed = YAML.load(templateYaml) as any;
    const layout = parsed?.layout || [];
    const character: Record<string, any> = {};

    // Iterate through all fields in all tabs
    layout.forEach((tab: any) => {
      if (tab.fields && Array.isArray(tab.fields)) {
        tab.fields.forEach((field: any) => {
          const key = field.key;
          const type = field.type;

          // Initialize field based on type
          if (type === 'list' || type === 'tags' || type === 'bullet_points') {
            character[key] = [];
          } else if (type === 'number') {
            character[key] = 0;
          } else if (type === 'date') {
            character[key] = new Date().toISOString().split('T')[0];
          } else {
            character[key] = '';
          }
        });
      }
    });

    return character;
  } catch (err) {
    return { name: 'New Character' };
  }
};
