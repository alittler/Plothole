import { ProjectData } from '../types';
import { generateSHA256, generateId } from './storageService';

const SERVERLESS_DISABLED_MESSAGE =
  'Git-based manuscript versioning is temporarily disabled in the Vercel serverless build. Use project saves and Blob-backed snapshots instead.';

const disabledResponse = async () => ({
  success: false,
  disabled: true,
  message: SERVERLESS_DISABLED_MESSAGE,
});

/**
 * Git-backed project versioning is disabled in the serverless deployment.
 */
export const initGitForProject = async (_projectId: string) => {
  console.warn('[Versioning] initGitForProject disabled:', SERVERLESS_DISABLED_MESSAGE);
  return disabledResponse();
};

/**
 * Git-backed commits are disabled in the serverless deployment.
 */
export const commitToGit = async (
  _projectId: string,
  _message: string,
  _files?: { path: string; content: string }[]
) => {
  console.warn('[Versioning] commitToGit disabled:', SERVERLESS_DISABLED_MESSAGE);
  return {
    ...(await disabledResponse()),
    hash: `disabled-${generateId(8)}`,
  };
};

/**
 * Git history is disabled in the serverless deployment.
 */
export const getGitLog = async (_projectId: string) => {
  console.warn('[Versioning] getGitLog disabled:', SERVERLESS_DISABLED_MESSAGE);
  return [];
};

/**
 * Git diff is disabled in the serverless deployment.
 */
export const getGitDiff = async (_projectId: string, _commitHash: string) => {
  console.warn('[Versioning] getGitDiff disabled:', SERVERLESS_DISABLED_MESSAGE);
  return {
    success: false,
    disabled: true,
    diff: '',
    message: SERVERLESS_DISABLED_MESSAGE,
  };
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
