#!/usr/bin/env node

/**
 * Doppler Repository Sync Script
 * 
 * Pulls environment secrets from Doppler and syncs them to local .env files.
 * Can be run locally or in CI/CD via `doppler run`.
 * 
 * Usage:
 *   Local:  doppler run npm run sync:doppler
 *   CI/CD:  doppler run node scripts/sync-repo-ai.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { GoogleGenAI, Type } from "@google/genai";

interface DopplerSecret {
  name: string;
  value: string;
}

interface SyncResult {
  added: string[];
  updated: string[];
  unchanged: string[];
  removed: string[];
  errors: string[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(REPO_ROOT, '.env');
const ENV_BACKUP = path.join(REPO_ROOT, '.env.sync-backup');

/**
 * Fetches current secrets from Doppler
 */
async function fetchDopplerSecrets(): Promise<Map<string, string>> {
  try {
    // Use doppler secrets download with JSON format to get all secrets at once
    const output = execSync('doppler secrets download --format json --no-file', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const secrets = JSON.parse(output);
    const secretMap = new Map<string, string>();

    // Doppler returns a flat object with secret names as keys and values as strings
    if (typeof secrets === 'object') {
      Object.entries(secrets).forEach(([key, value]: [string, any]) => {
        secretMap.set(key, String(value));
      });
    }

    return secretMap;
  } catch (error) {
    const err = error as any;
    throw new Error(`Failed to fetch Doppler secrets: ${err.message}`);
  }
}

/**
 * Parses .env file into key-value pairs
 */
function parseEnvFile(filePath: string): Map<string, string> {
  if (!fs.existsSync(filePath)) {
    return new Map();
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const envMap = new Map<string, string>();

  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      const value = valueParts.join('=').trim();
      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '');
      envMap.set(key.trim(), cleanValue);
    }
  });

  return envMap;
}

/**
 * Writes environment variables to .env file
 */
function writeEnvFile(filePath: string, envMap: Map<string, string>): void {
  const lines: string[] = [];

  // Add header comment
  lines.push('# Auto-synced from Doppler');
  lines.push(`# Last updated: ${new Date().toISOString()}`);
  lines.push('# DO NOT commit this file to version control\n');

  // Sort keys and write to file
  const sortedKeys = Array.from(envMap.keys()).sort();
  sortedKeys.forEach((key) => {
    const value = envMap.get(key)!;
    lines.push(`${key}=${value}`);
  });

  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

/**
 * Compares Doppler secrets with current .env and returns sync summary
 */
function compareSecrets(
  dopplerSecrets: Map<string, string>,
  currentEnv: Map<string, string>
): SyncResult {
  const result: SyncResult = {
    added: [],
    updated: [],
    unchanged: [],
    removed: [],
    errors: [],
  };

  // Exclude Doppler metadata keys
  const excludeKeys = new Set(['DOPPLER_CONFIG', 'DOPPLER_ENVIRONMENT', 'DOPPLER_PROJECT']);

  // Check each Doppler secret
  dopplerSecrets.forEach((dopplerValue, key) => {
    if (excludeKeys.has(key)) {
      return; // Skip Doppler metadata
    }

    const currentValue = currentEnv.get(key);

    if (currentValue === undefined) {
      result.added.push(key);
    } else if (currentValue !== dopplerValue) {
      result.updated.push(key);
    } else {
      result.unchanged.push(key);
    }
  });

  // Check for keys in .env that aren't in Doppler (orphaned keys)
  currentEnv.forEach((_, key) => {
    if (!dopplerSecrets.has(key) && !excludeKeys.has(key)) {
      result.removed.push(key);
    }
  });

  return result;
}

/**
 * Displays sync results in a readable format
 */
function displayResults(result: SyncResult): void {
  console.log('\n📊 Doppler Sync Results:');
  console.log('═'.repeat(50));

  if (result.added.length > 0) {
    console.log(`\n✅ Added (${result.added.length}):`);
    result.added.forEach((key) => console.log(`   + ${key}`));
  }

  if (result.updated.length > 0) {
    console.log(`\n🔄 Updated (${result.updated.length}):`);
    result.updated.forEach((key) => console.log(`   ~ ${key}`));
  }

  if (result.unchanged.length > 0) {
    console.log(`\n⏭️  Unchanged (${result.unchanged.length}):`);
    result.unchanged.slice(0, 3).forEach((key) => console.log(`   = ${key}`));
    if (result.unchanged.length > 3) {
      console.log(`   ... and ${result.unchanged.length - 3} more`);
    }
  }

  if (result.removed.length > 0) {
    console.log(`\n⚠️  Orphaned in .env (${result.removed.length}):`);
    result.removed.forEach((key) => console.log(`   - ${key}`));
  }

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors (${result.errors.length}):`);
    result.errors.forEach((error) => console.log(`   ! ${error}`));
  }

  const totalChanges = result.added.length + result.updated.length + result.removed.length;
  console.log(`\n${totalChanges === 0 ? '✨ All secrets in sync!' : `${totalChanges} changes detected`}`);
  console.log('═'.repeat(50) + '\n');
}

/**
 * Main sync function
 */
async function syncDopplerSecrets(): Promise<void> {
  try {
    console.log('🔄 Syncing Doppler secrets to .env...\n');

    // Fetch from Doppler
    console.log('📥 Fetching secrets from Doppler...');
    const dopplerSecrets = await fetchDopplerSecrets();
    console.log(`   Found ${dopplerSecrets.size} secrets`);

    // Parse current .env
    console.log('📄 Reading current .env...');
    const currentEnv = parseEnvFile(ENV_FILE);
    console.log(`   Found ${currentEnv.size} variables`);

    // Compare and get results
    const result = compareSecrets(dopplerSecrets, currentEnv);

    // Backup current .env if it exists
    if (fs.existsSync(ENV_FILE)) {
      fs.copyFileSync(ENV_FILE, ENV_BACKUP);
      console.log(`💾 Backup created: .env.sync-backup`);
    }

    // Update .env with Doppler secrets
    writeEnvFile(ENV_FILE, dopplerSecrets);
    console.log(`✍️  Updated .env with Doppler secrets`);

    // Display results
    displayResults(result);

    // AI Metadata Sync (New)
    if (dopplerSecrets.has('GEMINI_API_KEY')) {
      await runAiMetadataSync(dopplerSecrets.get('GEMINI_API_KEY')!);
    } else {
      console.log('💡 Tip: Add GEMINI_API_KEY to Doppler to enable AI-powered GitHub metadata syncing.');
    }

    // Exit with appropriate code
    if (result.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    const err = error as Error;
    console.error(`\n❌ Sync failed: ${err.message}`);
    process.exit(1);
  }
}

/**
 * AI Metadata Sync logic (Gemini + GitHub Tags)
 */
async function runAiMetadataSync(apiKey: string) {
  console.log('\n🚀 Starting AI Metadata Sync...');
  
  try {
    const genAI = new GoogleGenAI({ apiKey });
    
    // 1. Collect Project Data
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"));
    let manifestStr = "";
    try {
      manifestStr = fs.readFileSync(path.join(REPO_ROOT, "manifest.yaml"), "utf-8");
    } catch (e) {
      manifestStr = "Manifest not found.";
    }
    
    let metadata = { name: "Plothole", description: "" };
    try {
      metadata = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "metadata.json"), "utf-8"));
    } catch (e) {
      console.warn("metadata.json not found.");
    }
    
    const viewsPath = path.join(REPO_ROOT, "src/components/Views");
    let viewFiles: string[] = [];
    if (fs.existsSync(viewsPath)) {
      viewFiles = fs.readdirSync(viewsPath).filter(f => f.endsWith(".tsx"));
    }

    const context = `
      Project Name: ${metadata.name || pkg.name}
      Current Description: ${metadata.description || pkg.description || "No description"}
      Stats (from manifest):
      ${manifestStr}
      
      Stack: ${Object.keys(pkg.dependencies || {}).join(", ")}
      Views: ${viewFiles.join(", ")}
    `;

    // 2. Ask Gemini for Description & Tags
    // Using a reliable model name from your project settings
    const model = "gemini-1.5-flash"; 

    const prompt = `
      Analyze this project context and generate:
      1. A punchy 1-sentence GitHub description (max 100 characters). Focus on being an AI-powered story analysis and world-building tool.
      2. A comma-separated list of 10-15 GitHub topics (tags). Include mix of tech (react, typescript, sqlite, s3) and creative (writing, fiction, world-building).
      
      Format:
      DESCRIPTION: [text]
      TOPICS: [t1, t2...]
      
      Context:
      ${context}
    `;

    const res = await genAI.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    const text = res.text;

    const descMatch = text.match(/DESCRIPTION:\s*(.*)/);
    const topicsMatch = text.match(/TOPICS:\s*(.*)/);

    const newDescription = descMatch ? descMatch[1].trim().replace(/^"|"$/g, '') : metadata.description;
    const newTopics = topicsMatch 
      ? topicsMatch[1].split(",").map(t => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')) 
      : [];

    console.log(`✨ Suggested Description: "${newDescription}"`);
    console.log(`🏷️  Suggested Topics: ${newTopics.join(", ")}`);

    // 3. Update GitHub via CLI
    if (process.env.GITHUB_ACTIONS || process.env.GH_TOKEN) {
      console.log('📡 Updating GitHub Repository Metadata...');
      execSync(`gh repo edit --description "${newDescription.replace(/"/g, '\\"')}" --topic "${newTopics.join(",")}"`, { stdio: "inherit" });
      console.log('✅ GitHub info successfully synced!');
    } else {
      console.log('ℹ️  Skipping GitHub update (no GH_TOKEN found). For local runs, use "gh auth login".');
    }

  } catch (error) {
    console.error("❌ AI Sync failed:", error instanceof Error ? error.message : error);
  }
}

// Run the sync
syncDopplerSecrets().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
