import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { initDb, getPool } from './src/db.ts';
// @ts-ignore
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { Resend } from 'resend';
import * as Sentry from "@sentry/node";
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { default as simpleGit } from 'simple-git';
import type { SimpleGit } from 'simple-git';
import cors from 'cors';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// S3 Client Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const s3Bucket = process.env.AWS_S3_BUCKET || '';
const isS3Configured = !!(
  process.env.AWS_ACCESS_KEY_ID && 
  process.env.AWS_SECRET_ACCESS_KEY && 
  process.env.AWS_S3_BUCKET &&
  process.env.AWS_REGION
);

console.log(`[S3] Initializing with region: ${process.env.AWS_REGION || 'us-west-2'} (Bucket: ${s3Bucket})`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Multer for local storage
const uploadDir = path.join(__dirname, 'public', 'uploads');
const sourceFilesRootDir = path.join(__dirname, 'public', 'source');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(sourceFilesRootDir)) fs.mkdirSync(sourceFilesRootDir, { recursive: true });

const syncProjectFromS3 = async (projectId: string) => {
  if (!isS3Configured) return;
  const projectDir = path.join(sourceFilesRootDir, projectId);
  if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });

  try {
    const command = new ListObjectsV2Command({
      Bucket: s3Bucket,
      Prefix: `source/${projectId}/`,
    });
    const response = await s3Client.send(command);
    
    for (const obj of response.Contents || []) {
      const filename = obj.Key?.split('/').pop();
      if (!filename) continue;
      
      const filePath = path.join(projectDir, filename);
      if (!fs.existsSync(filePath)) {
        console.log(`Restoring missing file from S3: ${filename}`);
        const getCommand = new GetObjectCommand({
          Bucket: s3Bucket,
          Key: obj.Key,
        });
        const getResponse = await s3Client.send(getCommand);
        if (getResponse.Body) {
          const body = await getResponse.Body.transformToByteArray();
          fs.writeFileSync(filePath, Buffer.from(body));
        }
      }
    }
  } catch (err) {
    console.error(`Failed to sync project ${projectId} from S3:`, err);
  }
};

const getProjectGit = (projectId: string): SimpleGit => {
  const projectDir = path.join(sourceFilesRootDir, projectId);
  if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
  
  // We don't await sync here to keep it non-blocking for Git object creation
  // but in practice, you'd want to ensure sync before operations.
  syncProjectFromS3(projectId).catch(console.error);
  
  return simpleGit(projectDir);
};

// Configure Multer for S3 (general uploads)
const s3Storage = multerS3({
  s3: s3Client,
  bucket: s3Bucket,
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'uploads/' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Helper for local disk storage (needed for Git operations)
const localDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isSourceUpload = (req.originalUrl && req.originalUrl.includes('source-upload')) || (req.url && req.url.includes('source-upload'));
    const projectId = req.body?.projectId;
    
    let dest = uploadDir;
    if (isSourceUpload) {
      dest = projectId ? path.join(sourceFilesRootDir, projectId) : sourceFilesRootDir;
    }
    
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Source Upload needs BOTH local disk and S3
const sourceUpload = multer({
  storage: localDiskStorage, // Save to disk for Git, then we'll upload to S3 manually
  limits: { fileSize: 50 * 1024 * 1024 }
});

const upload = multer({ 
  storage: isS3Configured ? s3Storage : localDiskStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    console.log(`Multer fileFilter - file: ${file.originalname}, mimetype: ${file.mimetype}`);
    cb(null, true);
  }
});

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB
  await initDb();

  app.use(cors());
  app.use(express.json({ limit: '100mb' }));
  app.use('/uploads', express.static(uploadDir));
  app.use('/source-files', express.static(sourceFilesRootDir));
  
  // Local File Upload API (Now S3)
  app.post('/api/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
      console.error('Upload failed: No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Generate a presigned URL for S3 files
      if (isS3Configured && (req.file as any).key) {
        const key = (req.file as any).key;
        try {
          const command = new GetObjectCommand({
            Bucket: s3Bucket,
            Key: key,
          });
          const expiresIn = parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600', 10);
          const url = await getSignedUrl(s3Client, command, { expiresIn });
          console.log('File uploaded to S3. Presigned URL generated:', key);
          return res.json({ url });
        } catch (signErr) {
          console.error('Failed to generate presigned URL:', signErr);
          // Fallback: Construct direct S3 URL if signing fails
          const fallbackUrl = `https://${s3Bucket}.s3.${process.env.AWS_REGION || 'us-west-2'}.amazonaws.com/${key}`;
          console.log('Falling back to direct S3 URL:', fallbackUrl);
          return res.json({ url: fallbackUrl, presigned: false });
        }
      }

      // Fallback to local storage if S3 not configured
      const location = (req.file as any).location;
      console.log('File uploaded successfully. URL:', location || `/uploads/${req.file.filename}`);
      res.json({ url: location || `/uploads/${req.file.filename}` });
    } catch (err) {
      console.error('Error in upload endpoint:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: `Upload processing failed: ${errorMessage}` });
    }
  });

  app.post('/api/source-upload', sourceUpload.single('file'), async (req, res) => {
    try {
      const projectId = req.body.projectId;
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const filename = req.file.filename;
      const projectDir = projectId ? path.join(sourceFilesRootDir, projectId) : sourceFilesRootDir;
      const filePath = path.join(projectDir, filename);
      
      let presignedUrl = null;
      const s3Key = projectId ? `source/${projectId}/${filename}` : `source/${filename}`;

      // Upload to S3 as well if configured
      if (isS3Configured) {
        try {
          const fileStream = fs.createReadStream(filePath);
          await s3Client.send(new PutObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
            Body: fileStream,
            ContentType: req.file.mimetype,
          }));
          console.log(`Successfully uploaded ${filename} to S3: ${s3Key}`);

          // Generate presigned URL
          try {
            const command = new GetObjectCommand({
              Bucket: s3Bucket,
              Key: s3Key,
            });
            const expiresIn = parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600', 10);
            presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
          } catch (signErr) {
            console.error('Failed to generate presigned URL for source-upload:', signErr);
            // Fallback: Construct direct S3 URL if signing fails
            presignedUrl = `https://${s3Bucket}.s3.${process.env.AWS_REGION || 'us-west-2'}.amazonaws.com/${s3Key}`;
            console.log('Using direct S3 URL fallback:', presignedUrl);
          }
        } catch (s3Err) {
          console.error('Failed to upload to S3 during source-upload:', s3Err);
        }
      } else {
        console.log(`Skipping S3 upload for ${filename} as S3 is not configured.`);
      }

      const publicUrl = presignedUrl || (projectId ? `/source-files/${projectId}/${filename}` : `/source-files/${filename}`);
      let extractedText = '';

      // If it's a PDF, extract text on the server using pdf-parse
      if (req.file.mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
        try {
          console.log('Extracting text from PDF:', filename);
          const dataBuffer = fs.readFileSync(filePath);
          
          // Handle both function and object exports
          const parseFn = typeof pdf === 'function' ? pdf : (pdf as any).PDFParse;
          if (typeof parseFn !== 'function') throw new Error('PDF parse function not found in module');
          
          const data = await parseFn(dataBuffer);
          extractedText = data.text;
          console.log(`Successfully extracted ${extractedText.length} chars from PDF`);
        } catch (err) {
          console.error('Server-side PDF extraction failed:', err);
        }
      }

      console.log('Source upload success:', filename, 'Project:', projectId);
      res.json({ 
        url: publicUrl,
        filename: filename,
        extractedText: extractedText
      });
    } catch (err) {
      console.error('Error in source-upload endpoint:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: `Source upload failed: ${errorMessage}` });
    }
  });

  // Sidecar Metadata API
  app.post('/api/source-meta', async (req, res) => {
    const { filename, metadata, projectId, content } = req.body;
    if (!filename || !metadata) return res.status(400).json({ error: 'Filename and metadata required' });

    // Ensure we are only writing to the project directory
    const projectDir = projectId ? path.join(sourceFilesRootDir, projectId) : sourceFilesRootDir;
    const baseName = path.basename(filename);

    // Save Metadata Index (index.json)
    const metaFilename = `${baseName}.index.json`;
    const metaPath = path.join(projectDir, metaFilename);
    let publicMetaUrl = projectId ? `/source-files/${projectId}/${metaFilename}` : `/source-files/${metaFilename}`;

    if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });

    const metaContent = JSON.stringify(metadata, null, 2);
    fs.writeFileSync(metaPath, metaContent);

    // Upload meta to S3
    try {
      const s3Key = projectId ? `source/${projectId}/${metaFilename}` : `source/${metaFilename}`;
      await s3Client.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
        Body: metaContent,
        ContentType: 'application/json',
      }));

      // Generate presigned URL for metadata
      try {
        const command = new GetObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
        });
        const expiresIn = parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600', 10);
        publicMetaUrl = await getSignedUrl(s3Client, command, { expiresIn });
      } catch (err) {
        console.error('Failed to generate presigned URL for metadata:', err);
      }
    } catch (s3Err) {
      console.error('Failed to upload metadata to S3:', s3Err);
    }

    let mdUrl = null;
    // Save Plaintext Sidecar (extracted.md)
    if (content) {
      const mdFilename = `${baseName}.extracted.md`;
      const mdPath = path.join(projectDir, mdFilename);
      fs.writeFileSync(mdPath, content);
      mdUrl = projectId ? `/source-files/${projectId}/${mdFilename}` : `/source-files/${mdFilename}`;

      // Upload MD to S3
      try {
        const s3Key = projectId ? `source/${projectId}/${mdFilename}` : `source/${mdFilename}`;
        await s3Client.send(new PutObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
          Body: content,
          ContentType: 'text/markdown',
        }));

        // Generate presigned URL for markdown
        try {
          const command = new GetObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
          });
          const expiresIn = parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600', 10);
          mdUrl = await getSignedUrl(s3Client, command, { expiresIn });
        } catch (err) {
          console.error('Failed to generate presigned URL for markdown:', err);
        }
      } catch (s3Err) {
        console.error('Failed to upload extracted MD to S3:', s3Err);
      }
    }

    res.json({ success: true, url: publicMetaUrl, mdUrl });
  });

  app.get('/api/source-files/:projectId', async (req, res) => {
    const { projectId } = req.params;
    
    // Attempt to list from S3 for the most up-to-date view
    try {
      const command = new ListObjectsV2Command({
        Bucket: s3Bucket,
        Prefix: `source/${projectId}/`,
      });
      const response = await s3Client.send(command);
      
      const files = (response.Contents || []).map(obj => {
        const filename = obj.Key?.split('/').pop() || '';
        return {
          name: filename,
          size: obj.Size,
          mtime: obj.LastModified,
          url: `/source-files/${projectId}/${filename}` // Still proxying via our server for consistency
        };
      });
      
      // Also ensure local disk is in sync for Git
      if (files.length > 0) {
        const projectDir = path.join(sourceFilesRootDir, projectId);
        if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
        // This is a lazy sync - we might want to download missing files here
      }

      res.json({ files });
    } catch (err) {
      console.error('S3 list failed, falling back to local disk:', err);
      const projectDir = path.join(sourceFilesRootDir, projectId);
      if (!fs.existsSync(projectDir)) {
        return res.json({ files: [] });
      }

      try {
        const files = fs.readdirSync(projectDir).map(file => {
          const stats = fs.statSync(path.join(projectDir, file));
          return {
            name: file,
            size: stats.size,
            mtime: stats.mtime,
            url: `/source-files/${projectId}/${file}`
          };
        });
        res.json({ files });
      } catch (innerErr) {
        res.status(500).json({ error: 'Failed to list files' });
      }
    }
  });

  app.get('/api/source-meta/:projectId/:filename', (req, res) => {
    const { projectId, filename } = req.params;
    const baseName = path.basename(filename);
    const filePath = path.join(sourceFilesRootDir, projectId, `${baseName}.meta.json`);
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      res.json(JSON.parse(data));
    } else {
      res.status(404).json({ error: 'No sidecar found' });
    }
  });

  app.post('/api/validate-link', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
      // Use a standard fetch with a timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'User-Agent': 'PlotholeBot/1.0' }
      });
      clearTimeout(timeout);
      res.json({ valid: response.ok, status: response.status });
    } catch (e) {
      res.json({ valid: false, error: 'Network failure or timeout' });
    }
  });

  // Git API Endpoints
  app.post('/api/git/init', async (req, res) => {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'Project ID required' });
    
    try {
      const git = getProjectGit(projectId);
      await git.init();
      res.json({ success: true, message: 'Git initialized' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/git/commit', async (req, res) => {
    const { projectId, message, files } = req.body;
    if (!projectId || !message) return res.status(400).json({ error: 'Project ID and message required' });

    try {
      const projectDir = path.join(sourceFilesRootDir, projectId);
      if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });

      // Save files to the project directory before committing
      if (files && Array.isArray(files)) {
        files.forEach((file: { path: string, content: string }) => {
          const filePath = path.join(projectDir, file.path);
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, file.content);
        });
      }

      const git = getProjectGit(projectId);
      await git.add('.');
      const result = await git.commit(message);
      res.json({ success: true, result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/git/log/:projectId', async (req, res) => {
    const { projectId } = req.params;
    try {
      const git = getProjectGit(projectId);
      const log = await git.log();
      res.json(log);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/git/diff/:projectId/:commitHash', async (req, res) => {
    const { projectId, commitHash } = req.params;
    try {
      const git = getProjectGit(projectId);
      const diff = await git.show([commitHash]);
      res.json({ diff });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/git/status', async (req, res) => {
    const { projectId } = req.body;
    try {
      const git = getProjectGit(projectId);
      const status = await git.status();
      res.json(status);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/cleanup', async (req: any, res) => {
    const { activeImageUrls } = req.body; // List of all URLs currently in use by any project
    if (!activeImageUrls || !Array.isArray(activeImageUrls)) {
      return res.status(400).json({ error: 'Invalid activeImageUrls list' });
    }

    try {
      const files = fs.readdirSync(uploadDir);
      let deletedCount = 0;
      
      files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        const fileUrl = `/uploads/${file}`;
        
        // If file is not in active list AND is older than 1 hour (buffer)
        if (!activeImageUrls.includes(fileUrl)) {
          const stats = fs.statSync(filePath);
          const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
          
          if (ageInHours > 1) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
      });
      
      res.json({ success: true, deletedCount });
    } catch (err) {
      res.status(500).json({ error: 'Cleanup failed' });
    }
  });

  // Health check endpoint (for Render/Uptime monitors to keep instance awake)
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // Clerk Middleware
  const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY || 
                              process.env.VITE_CLERK_PUBLISHABLE_KEY || 
                              process.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY || 
                              process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (clerkSecretKey || clerkPublishableKey) {
    // Ensure the SDK picks up the keys correctly
    if (clerkPublishableKey) process.env.CLERK_PUBLISHABLE_KEY = clerkPublishableKey;
    if (clerkSecretKey) process.env.CLERK_SECRET_KEY = clerkSecretKey;
    
    app.use(ClerkExpressWithAuth());
  }

  // API Routes
  app.get('/api/config', (req: express.Request, res: express.Response) => {
    console.log(`[Heartbeat] Ping from ${req.ip} at ${new Date().toLocaleTimeString()}`);
    res.json({
      hasGeminiKey: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
      hasDb: !!(process.env.DATABASE_URL),
      hasClerk: !!(process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY),
      env: process.env.NODE_ENV || 'development',
      serverTime: new Date().toISOString(),
      status: 'healthy'
    });
  });

  app.get('/api/network-info', (req, res) => {
    console.log(`[API] Network info requested from ${req.ip}`);
    res.json({
      ip: getLocalIp(),
      port: PORT
    });
  });

  app.get('/api/version', (req, res) => {
    const { execSync } = require('child_process');
    const fs = require('fs');
    try {
      const commitHash = execSync('git rev-parse --short HEAD', { 
        cwd: __dirname,
        encoding: 'utf-8' 
      }).trim();
      
      // Get mtime of server.ts as a "source version"
      const stats = fs.statSync(__filename);
      const sourceHash = Math.floor(stats.mtimeMs).toString(16).slice(-7);

      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json({ 
        commit: commitHash,
        sourceHash: sourceHash
      });
    } catch (err) {
      console.error('Failed to get version info:', err);
      res.json({ commit: 'unknown', sourceHash: 'unknown' });
    }
  });

  app.get('/api/aws-status', async (req, res) => {
    try {
      if (!isS3Configured) {
        return res.json({
          configured: false,
          region: process.env.AWS_REGION || 'us-west-2',
          bucket: s3Bucket || 'Not configured',
          error: 'S3 credentials or bucket name missing in .env'
        });
      }

      // Quick check if we can list objects (verifies credentials/bucket access)
      const command = new ListObjectsV2Command({
        Bucket: s3Bucket,
        MaxKeys: 1
      });
      await s3Client.send(command);

      res.json({
        configured: true,
        region: process.env.AWS_REGION || 'us-west-2',
        bucket: s3Bucket,
        connected: true
      });
    } catch (err) {
      console.error('AWS status check failed:', err);
      res.json({
        configured: true,
        region: process.env.AWS_REGION || 'us-west-2',
        bucket: s3Bucket,
        connected: false,
        error: err instanceof Error ? err.message : 'Unknown AWS error'
      });
    }
  });

  // Generate presigned URL for any S3 object
  app.post('/api/presigned-url', async (req, res) => {
    try {
      if (!isS3Configured) {
        return res.status(400).json({ 
          error: 'S3 is not configured. Set AWS credentials in .env' 
        });
      }

      const { key } = req.body;
      if (!key) {
        return res.status(400).json({ error: 'S3 key is required' });
      }

      const command = new GetObjectCommand({
        Bucket: s3Bucket,
        Key: key,
      });

      const expiresIn = parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600', 10);
      const url = await getSignedUrl(s3Client, command, { expiresIn });

      res.json({ url });
    } catch (err) {
      console.error('Failed to generate presigned URL:', err);
      res.status(500).json({ 
        error: 'Failed to generate presigned URL',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  });

  app.get('/api/debug-storage', async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });
    try {
      const projects = await pool.query('SELECT id, user_id, title FROM projects');
      const users = await pool.query('SELECT id, email FROM users');
      res.json({ projects: projects.rows, users: users.rows });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Protected API Routes
  app.get('/api/projects', async (req: any, res) => {
    const userId = req.auth?.userId || 'user-1';
    console.log(`[API] Fetch projects request from user: ${userId}`);
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });

    try {
      const result = await pool.query('SELECT data FROM projects WHERE user_id = $1 ORDER BY last_modified DESC', [userId]);
      console.log(`[API] Found ${result.rows.length} projects for user: ${userId}`);
      res.json(result.rows.map(row => row.data));
    } catch (err) {
      console.error(`[API] ERROR fetching projects for ${userId}:`, err);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  app.post('/api/projects', async (req: any, res) => {
    const userId = req.auth?.userId || 'user-1';
    console.log(`[API] Save project request from user: ${userId}`);
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });

    const project = req.body;
    console.log(`[API] Saving project: ${project.id} (${project.title})`);
    
    try {
      // Ensure user exists in our local table
      await pool.query('INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [userId, 'user@example.com']); 

      const result = await pool.query(
        'INSERT INTO projects (id, user_id, title, data, last_modified) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET data = $4, title = $3, last_modified = $5',
        [project.id, userId, project.title, project, Date.now()]
      );
      
      console.log(`[API] Project ${project.id} saved successfully to Postgres. Rows affected: ${result.rowCount}`);
      res.json({ success: true });
    } catch (err) {
      console.error(`[API] ERROR saving project ${project.id}:`, err);
      res.status(500).json({ error: 'Failed to save project' });
    }
  });

  app.delete('/api/projects/:id', async (req: any, res) => {
    const userId = req.auth?.userId || 'user-1';
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });

    try {
      await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // Global Notes
  app.get('/api/notes', async (req: any, res) => {
    const userId = req.auth?.userId || 'user-1';
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });

    try {
      const result = await pool.query('SELECT data FROM global_notes WHERE user_id = $1 ORDER BY timestamp DESC', [userId]);
      res.json(result.rows.map(row => row.data));
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  });

  app.post('/api/notes', async (req: any, res) => {
    const userId = req.auth?.userId || 'user-1';
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });

    const note = req.body;
    const now = Date.now();
    try {
      await pool.query(
        'INSERT INTO global_notes (id, user_id, content, tags, data, timestamp) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET content = $3, tags = $4, data = $5, timestamp = $6',
        [note.id, userId, note.content, note.tags, note, now]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save note' });
    }
  });

  // App Globals (Settings, Prompts, etc.)
  app.get('/api/globals/:id', async (req: any, res) => {
    const userId = req.auth?.userId || 'user-1';
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });

    try {
      const result = await pool.query('SELECT data FROM app_globals WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
      if (result.rows.length > 0) {
        res.json(result.rows[0].data);
      } else {
        res.status(404).json({ error: 'Global not found' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch global' });
    }
  });

  app.post('/api/globals/:id', async (req: any, res) => {
    const userId = req.auth?.userId || 'user-1';
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });

    const data = req.body;
    const now = Date.now();
    try {
      await pool.query(
        'INSERT INTO app_globals (id, user_id, data, last_modified) VALUES ($1, $2, $3, $4) ON CONFLICT (id, user_id) DO UPDATE SET data = $3, last_modified = $4',
        [req.params.id, userId, data, now]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save global' });
    }
  });

  app.get('/test', (req, res) => {
    res.send('Server is working');
  });

  app.post('/api/backup-email', async (req: any, res) => {
    const userId = req.auth?.userId || 'user-1';
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { projectTitle, wordCount, hash, backupData } = req.body;
    if (!resend) return res.status(503).json({ error: 'Resend not configured' });

    try {
      const email = await resend.emails.send({
        from: 'Plothole Backups <backups@resend.dev>',
        to: 'alittler86@gmail.com',
        subject: `[Milestone] Backup: ${projectTitle} [${hash?.slice(0, 8)}] (${wordCount} words)`,
        html: `<p>Automated backup for project: <strong>${projectTitle}</strong></p><p>Hash: <code>${hash}</code></p><p>Current word count: ${wordCount}</p><p>The encrypted .plothole file is attached (simulated for now, would be a base64 attachment in production).</p>`
      });
      res.json({ success: true, resendId: (email.data as any)?.id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to send backup email' });
    }
  });

  app.get('/api/verify-backup/:resendId', async (req: any, res) => {
    // In a real app, you'd use resend.emails.get(req.params.resendId)
    // and check the 'status' property.
    res.json({ status: 'delivered' });
  });

  // Username management
  app.post('/api/user/username', async (req: any, res) => {
    if (!req.auth?.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const { username } = req.body;
    if (!username || !/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 alphanumeric characters' });
    }

    try {
      const pool = getPool();
      if (!pool) return res.status(500).json({ error: 'Database unavailable' });
      
      await pool.query(
        'UPDATE users SET username = $1 WHERE id = $2',
        [username, req.auth.userId]
      );
      res.json({ success: true });
    } catch (err: any) {
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Username already taken' });
      }
      console.error(err);
      res.status(500).json({ error: 'Failed to update username' });
    }
  });

  app.get('/api/user/username', async (req: any, res) => {
    if (!req.auth?.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
      const pool = getPool();
      if (!pool) return res.status(500).json({ error: 'Database unavailable' });
      
      const result = await pool.query(
        'SELECT username FROM users WHERE id = $1',
        [req.auth.userId]
      );
      res.json({ username: result.rows[0]?.username || null });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch username' });
    }
  });

  // Public wiki endpoints (no auth required)
  app.get('/api/wiki/:username/:bookName', async (req, res) => {
    const { username, bookName } = req.params;

    try {
      const pool = getPool();
      if (!pool) return res.status(500).json({ error: 'Database unavailable' });

      // Match against slugified title: replace non-alphanumeric with _, trim _, and compare case-insensitively
      const result = await pool.query(
        `SELECT p.id, p.title, p.data, p.is_wiki_public, p.enable_wiki, u.username, u.name
         FROM projects p
         JOIN users u ON p.user_id = u.id
         WHERE u.username = $1 
           AND (
             p.title ILIKE $2 OR 
             trim(both '_' from regexp_replace(p.title, '[^a-zA-Z0-9]+', '_', 'g')) ILIKE $2
           )
           AND p.is_wiki_public = true AND p.enable_wiki = true`,
        [username, bookName]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Book not found or not public' });
      }

      const project = result.rows[0];
      const settings = project.data.wikiSettings || {
        includeCharacters: true,
        includeLocations: true,
        includeTimeline: true,
        includeLore: true,
        includeArtifacts: true,
        includeManuscript: false
      };

      res.json({
        title: project.title,
        author: project.data.author || project.name,
        synopsis: project.data.synopsis || '',
        characters: settings.includeCharacters !== false ? (project.data.characters || []) : [],
        worldBuilding: [
          ...(settings.includeLocations !== false ? (project.data.locations || []) : []),
          ...(settings.includeLore !== false ? (project.data.lore || []) : []),
          ...(settings.includeArtifacts !== false ? (project.data.artifacts || []) : [])
        ],
        timeline: settings.includeTimeline !== false ? (project.data.timeline || []) : [],
        manuscript: settings.includeManuscript === true ? (project.data.chapters || []) : []
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch wiki data' });
    }
  });

  app.get('/api/wiki/:username', async (req, res) => {
    const { username } = req.params;
    
    try {
      const pool = getPool();
      if (!pool) return res.status(500).json({ error: 'Database unavailable' });
      
      const result = await pool.query(
        `SELECT u.username, u.name, p.id, p.title, p.data
         FROM users u
         LEFT JOIN projects p ON u.id = p.user_id AND p.is_wiki_public = true AND p.enable_wiki = true
         WHERE u.username = $1`,
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = result.rows[0];
      const books = result.rows
        .filter(r => r.id)
        .map(r => ({ 
          id: r.id, 
          title: r.title,
          synopsis: (r.data?.synopsis || 'No synopsis provided') as string
        }));
      
      res.json({
        username: userData.username,
        author: userData.name,
        books
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // Fetch wiki settings for a project
  app.get('/api/projects/:projectId/wiki-settings', async (req: any, res) => {
    const { projectId } = req.params;
    
    if (!req.auth?.userId) {
      console.log(`[Wiki] GET settings unauthorized for project ${projectId}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      const pool = getPool();
      if (!pool) {
        console.error(`[Wiki] Database unavailable for project ${projectId}`);
        return res.status(500).json({ error: 'Database unavailable' });
      }
      
      // Verify ownership
      const project = await pool.query(
        'SELECT p.is_wiki_public, p.enable_wiki, p.data, u.username FROM projects p JOIN users u ON p.user_id = u.id WHERE p.id = $1 AND p.user_id = $2',
        [projectId, req.auth.userId]
      );
      
      if (project.rows.length === 0) {
        console.log(`[Wiki] Project not found: ${projectId} for user ${req.auth.userId}`);
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({
        is_wiki_public: project.rows[0].is_wiki_public || false,
        enable_wiki: project.rows[0].enable_wiki !== false,
        username: project.rows[0].username,
        wikiSettings: project.rows[0].data?.wikiSettings || null
      });
    } catch (err) {
      console.error(`[Wiki] Error fetching settings for project ${projectId}:`, err);
      res.status(500).json({ error: 'Failed to fetch wiki settings' });
    }
  });

  // Update wiki visibility for a project
  app.post('/api/projects/:projectId/wiki-settings', async (req: any, res) => {
    const { projectId } = req.params;
    const { is_wiki_public, enable_wiki, wikiSettings } = req.body;
    
    if (!req.auth?.userId) {
      console.log(`[Wiki] POST settings unauthorized for project ${projectId}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const pool = getPool();
      if (!pool) {
        console.error(`[Wiki] Database unavailable for project ${projectId}`);
        return res.status(500).json({ error: 'Database unavailable' });
      }
      
      // Verify ownership and get current data
      const projectResult = await pool.query(
        'SELECT user_id, data FROM projects WHERE id = $1',
        [projectId]
      );
      
      const project = projectResult.rows[0];
      if (!project) return res.status(404).json({ error: 'Project not found' });

      if (project.user_id !== req.auth.userId) {
        console.log(`[Wiki] User ${req.auth.userId} not authorized to edit project ${projectId}`);
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Merge wikiSettings into the JSONB data
      const updatedData = {
        ...project.data,
        wikiSettings: wikiSettings || project.data.wikiSettings
      };

      await pool.query(
        'UPDATE projects SET is_wiki_public = $1, enable_wiki = $2, data = $3 WHERE id = $4',
        [is_wiki_public, enable_wiki, updatedData, projectId]
      );
      
      console.log(`[Wiki] Updated settings for project ${projectId}: wiki_public=${is_wiki_public}, wiki_enabled=${enable_wiki}`);
      res.json({ success: true });
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.error(`[Wiki] Error updating settings for project ${projectId}:`, errorMsg);
      console.error(`[Wiki] Full error:`, err);
      res.status(500).json({ error: `Failed to update wiki settings: ${errorMsg}` });
    }
  });

  // Vite middleware for development only
  let vite: any = null;
  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Serve static assets from dist/ in production (before catch-all route)
  const distDir = process.env.NODE_ENV === 'production' 
    ? path.join(process.cwd(), 'dist')
    : path.resolve(__dirname, 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { 
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
        if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
      }
    }));
  }

  app.get('*', async (req, res, next) => {
    const url = req.originalUrl;

    try {
      let template;
      let isProd = process.env.NODE_ENV === 'production';
      
      if (!isProd && vite) {
        // In development, let Vite handle the HTML transformation
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
      } else {
        // In production, serve the built index.html from dist
        const distPath = path.resolve(__dirname, 'dist', 'index.html');
        if (fs.existsSync(distPath)) {
          template = fs.readFileSync(distPath, 'utf-8');
        } else {
          template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        }
      }

      // Inject the Clerk and Gemini Publishable Keys into the HTML
      const clerkKey = process.env.CLERK_PUBLISHABLE_KEY ||
                       process.env.VITE_CLERK_PUBLISHABLE_KEY || 
                       process.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY ||
                       process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 
                       process.env.VITE_CLERK_PUBLISH || 
                       '';
      const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
      
      const injection = `
        <script>
          window.CLERK_PUBLISHABLE_KEY = ${JSON.stringify(clerkKey)};
          window.GEMINI_API_KEY = ${JSON.stringify(geminiKey)};
          window._env_ = {
            VITE_CLERK_PUBLISHABLE_KEY: ${JSON.stringify(clerkKey)},
            VITE_GEMINI_API_KEY: ${JSON.stringify(geminiKey)}
          };
        </script>
      `;
      template = template.replace('</head>', `${injection}</head>`);

      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
        vite.ssrFixStacktrace(e as Error);
      }
      next(e);
    }
  });

  // Sentry error handler must be before any other error middleware and after all controllers
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
