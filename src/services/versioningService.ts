import { ProjectData, Commit, Note, Chapter } from '../types';
import { generateSHA256, generateId } from './storageService';

/**
 * Initializes a Git repository for the project on the server.
 */
export const initGitForProject = async (projectId: string) => {
  const resp = await fetch('/api/git/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId })
  });
  return await resp.json();
};

/**
 * Performs a Git commit on the server.
 * Can optionally include files to be written to the working tree before committing.
 */
export const commitToGit = async (
  projectId: string, 
  message: string, 
  files?: { path: string, content: string }[]
) => {
  const resp = await fetch('/api/git/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, message, files })
  });
  return await resp.json();
};

/**
 * Retrieves the Git log for a project.
 */
export const getGitLog = async (projectId: string) => {
  const resp = await fetch(`/api/git/log/${projectId}`);
  return await resp.json();
};

/**
 * Retrieves a diff/patch for a specific commit.
 */
export const getGitDiff = async (projectId: string, commitHash: string) => {
  const resp = await fetch(`/api/git/diff/${projectId}/${commitHash}`);
  return await resp.json();
};

/**
 * Legacy compatibility: Validates the integrity of the project data using SHA-256.
 */
export const validateIntegrity = async (projectData: ProjectData): Promise<boolean> => {
  if (!projectData.integrityHash) return true;
  const manuscriptText = projectData.chapters?.map(c => c.content).join('\n\n') || '';
  const currentHash = await generateSHA256(manuscriptText);
  return currentHash === projectData.integrityHash;
};

/**
 * Legacy compatibility: Generates a project-wide integrity hash.
 */
export const updateIntegrityHash = async (projectData: ProjectData): Promise<string> => {
  const manuscriptText = projectData.chapters?.map(c => c.content).join('\n\n') || '';
  return await generateSHA256(manuscriptText);
};
