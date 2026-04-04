import { Client, Storage, InputFile } from 'node-appwrite';

const endpoint = process.env.APPWRITE_ENDPOINT || '';
const projectId = process.env.APPWRITE_PROJECT_ID || '';
const apiKey = process.env.APPWRITE_API_KEY || '';

if (!endpoint || !projectId || !apiKey) {
  console.warn("APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, or APPWRITE_API_KEY not found. Cloud storage features will be disabled.");
}

export const client = (endpoint && projectId && apiKey) ? 
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey) : 
  null;

const s = client ? new Storage(client) : null;
export { s as storage };

/**
 * Upload a file to Appwrite and return a public preview/view URL.
 */
export const uploadToAppwrite = async (bucketId: string, filename: string, buffer: Buffer) => {
  if (!s) throw new Error("Appwrite storage not initialized.");

  // We use the same ID as the filename to keep it consistent
  // Appwrite file IDs must be alphanumeric or underscores/hyphens, max 36 chars
  const fileId = filename.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 36);

  try {
    const file = await s.createFile(
      bucketId,
      fileId,
      InputFile.fromBuffer(buffer, filename)
    );

    // Construct public URL
    // Format: [endpoint]/storage/buckets/[bucketId]/files/[fileId]/view?project=[projectId]
    return `${endpoint}/storage/buckets/${bucketId}/files/${file.$id}/view?project=${projectId}`;
  } catch (err: any) {
    // If file already exists (code 409), just return the URL for it
    if (err.code === 409) {
      return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
    }
    throw err;
  }
};
