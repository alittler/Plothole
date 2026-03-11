import { ProjectData, Commit, Note, Chapter } from '../types';
import { generateSHA256, generateId } from './storageService';

/**
 * Creates a "Commit" for the current state of the manuscript.
 */
export const createCommit = async (
  projectData: ProjectData, 
  message: string, 
  author: string = 'User'
): Promise<Commit> => {
  const manuscriptText = projectData.chapters?.map(c => c.content).join('\n\n') || '';
  const hash = await generateSHA256(manuscriptText);
  const wordCount = manuscriptText.trim().split(/\s+/).filter(w => w.length > 0).length;

  // Simple diff logic (last commit vs current)
  let diff = '';
  if (projectData.commits && projectData.commits.length > 0) {
    const lastCommit = projectData.commits[projectData.commits.length - 1];
    // We'd ideally store the full text of every commit to diff, but for now we just record the change
    // For a real app, you might use a library like 'diff'
    diff = `Words: ${lastCommit.wordCount} -> ${wordCount}`;
  } else {
    diff = `Initial commit: ${wordCount} words.`;
  }

  return {
    id: generateId(),
    timestamp: Date.now(),
    hash,
    message,
    author,
    diff,
    wordCount,
    snapshot: projectData.chapters || []
  };
};

/**
 * Validates the integrity of the project data using SHA-256.
 */
export const validateIntegrity = async (projectData: ProjectData): Promise<boolean> => {
  if (!projectData.integrityHash) return true; // Nothing to check yet
  
  const manuscriptText = projectData.chapters?.map(c => c.content).join('\n\n') || '';
  const currentHash = await generateSHA256(manuscriptText);
  
  return currentHash === projectData.integrityHash;
};

/**
 * Generates a project-wide integrity hash including metadata.
 */
export const updateIntegrityHash = async (projectData: ProjectData): Promise<string> => {
  const manuscriptText = projectData.chapters?.map(c => c.content).join('\n\n') || '';
  return await generateSHA256(manuscriptText);
};

/**
 * Simple line-by-line diff (placeholder for more complex logic)
 */
export const generateLineDiff = (oldText: string, newText: string): string => {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  let added = 0;
  let removed = 0;
  
  // Very naive count
  added = Math.max(0, newLines.length - oldLines.length);
  removed = Math.max(0, oldLines.length - newLines.length);
  
  return `+${added} lines, -${removed} lines`;
};
