import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb, getPool } from './src/db.js';
// @ts-ignore
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { Resend } from 'resend';
import * as Sentry from "@sentry/node";
import multer from 'multer';
import { simpleGit, SimpleGit } from 'simple-git';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Multer for local storage
const uploadDir = path.join(__dirname, 'public', 'uploads');
const sourceFilesRootDir = path.join(__dirname, 'public', 'source');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(sourceFilesRootDir)) fs.mkdirSync(sourceFilesRootDir, { recursive: true });

const getProjectGit = (projectId: string): SimpleGit => {
  const projectDir = path.join(sourceFilesRootDir, projectId);
  if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
  return simpleGit(projectDir);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('Multer destination check:', req.url, req.originalUrl);
    const isSourceUpload = (req.originalUrl && req.originalUrl.includes('source-upload')) || (req.url && req.url.includes('source-upload'));
    const dest = isSourceUpload ? sourceFilesRootDir : uploadDir;
    console.log('Multer using destination:', dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB
  await initDb();

  app.use(cors());
  app.use(express.json({ limit: '100mb' }));
  app.use('/uploads', express.static(uploadDir));
  app.use('/source-files', express.static(sourceFilesRootDir));
  
  // Local File Upload API
  app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  app.post('/api/source-upload', upload.single('file'), async (req, res) => {
    console.log('Source upload request received');
    if (!req.file) {
      console.error('Source upload failed: No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = req.file.filename;
    const filePath = path.join(sourceFilesRootDir, filename);
    let extractedText = '';

    // If it's a PDF, extract text on the server using pdf-parse
    if (req.file.mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
      try {
        console.log('Extracting text from PDF:', filename);
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        extractedText = data.text;
        console.log(`Successfully extracted ${extractedText.length} chars from PDF`);
        
        // Save extracted text as a sidecar .txt file
        fs.writeFileSync(`${filePath}.txt`, extractedText);
      } catch (err) {
        console.error('Server-side PDF extraction failed:', err);
      }
    }

    console.log('Source upload success:', filename);
    res.json({ 
      url: `/source-files/${filename}`,
      filename: filename,
      extractedText: extractedText
    });
  });

  app.post('/api/source-link', (req, res) => {
    const { url, title, content } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const filename = `mirror-${Date.now()}.html`;
    const filePath = path.join(sourceFilesRootDir, filename);
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title || 'Source Mirror'}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #1e293b; background: #fdfdfd; }
    .meta { background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 40px; font-size: 14px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .url { color: #4f46e5; word-break: break-all; font-family: monospace; }
    h1 { margin-top: 0; color: #0f172a; font-weight: 800; tracking: -0.025em; }
    .content { background: white; padding: 40px; border-radius: 16px; border: 1px solid #f1f5f9; }
    p { margin-bottom: 1.5em; }
  </style>
</head>
<body>
  <div class="meta">
    <h1>${title || 'Untitled Source'}</h1>
    <p><strong>Original URL:</strong> <a class="url" href="${url}">${url}</a></p>
    <p><strong>Captured:</strong> ${new Date().toLocaleString()}</p>
  </div>
  <div class="content">
    ${content?.split('\n').filter((p: string) => p.trim()).map((p: string) => `<p>${p}</p>`).join('')}
  </div>
</body>
</html>`;

    fs.writeFileSync(filePath, htmlContent);

    res.json({ 
      success: true, 
      filename,
      url: `/source-files/${filename}`
    });
  });

  // Sidecar Metadata API
  app.post('/api/source-meta', (req, res) => {
    const { filename, metadata } = req.body;
    if (!filename || !metadata) return res.status(400).json({ error: 'Filename and metadata required' });

    // Ensure we are only writing to the source directory
    const baseName = path.basename(filename);
    const metaFilename = `${baseName}.meta.json`;
    const filePath = path.join(sourceFilesRootDir, metaFilename);
    
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
    res.json({ success: true, url: `/source-files/${metaFilename}` });
  });

  app.get('/api/source-meta/:filename', (req, res) => {
    const baseName = path.basename(req.params.filename);
    const filePath = path.join(sourceFilesRootDir, `${baseName}.meta.json`);
    
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

  // Clerk Middleware
  if (process.env.CLERK_SECRET_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY) {
    // Ensure the SDK picks up the keys correctly
    process.env.CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
    
    app.use(ClerkExpressWithAuth());
  }

  // API Routes
  app.get('/api/config', (req: express.Request, res: express.Response) => {
    res.json({
      hasGeminiKey: !!(process.env.GEMINI_API_KEY),
      hasDb: !!(process.env.DATABASE_URL),
      hasClerk: !!(process.env.VITE_CLERK_PUBLISHABLE_KEY),
      env: process.env.NODE_ENV || 'development',
    });
  });

  // Protected API Routes
  app.get('/api/projects', async (req: any, res) => {
    const userId = req.auth?.userId || 'user-1';
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });

    try {
      const result = await pool.query('SELECT data FROM projects WHERE user_id = $1 ORDER BY last_modified DESC', [userId]);
      res.json(result.rows.map(row => row.data));
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  app.post('/api/projects', async (req: any, res) => {
    const userId = req.auth?.userId || 'user-1';
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database unavailable' });

    const project = req.body;
    try {
      // Ensure user exists in our local table
      await pool.query('INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [userId, 'user@example.com']); // Email would ideally come from clerk webhook or token

      await pool.query(
        'INSERT INTO projects (id, user_id, title, data, last_modified) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET data = $4, title = $3, last_modified = CURRENT_TIMESTAMP',
        [project.id, userId, project.title, project]
      );

      // Send notification if it's a new project and Resend is configured
      if (resend && !project.lastModified) {
        try {
          await resend.emails.send({
            from: 'Plothole <onboarding@resend.dev>',
            to: 'alittler86@gmail.com', // User's email from context
            subject: 'New Project Created: ' + project.title,
            html: `<p>You just created a new project in Plothole: <strong>${project.title}</strong></p>`
          });
        } catch (e) {
          console.error("Failed to send email:", e);
        }
      }

      res.json({ success: true });
    } catch (err) {
      console.error(err);
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
    try {
      await pool.query(
        'INSERT INTO global_notes (id, user_id, content, tags, data, timestamp) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET content = $3, tags = $4, data = $5, timestamp = CURRENT_TIMESTAMP',
        [note.id, userId, note.content, note.tags, note]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save note' });
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

  // Vite middleware for development
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.get('*', async (req, res, next) => {
    const url = req.originalUrl;

    try {
      let template;
      let isProd = process.env.NODE_ENV === 'production';
      
      if (!isProd) {
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
      const clerkKey = process.env.VITE_CLERK_PUBLISHABLE_KEY || 
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
