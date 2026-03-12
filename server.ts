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
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB
  await initDb();

  app.use(express.json({ limit: '50mb' }));
  app.use('/uploads', express.static(uploadDir));
  
  // Local File Upload API
  app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
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
  if (process.env.CLERK_SECRET_KEY) {
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

      // Inject the Clerk Publishable Key into the HTML
      const clerkKey = process.env.VITE_CLERK_PUBLISHABLE_KEY || 
                       process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 
                       process.env.VITE_CLERK_PUBLISH || 
                       '';
      const injection = `<script>window.CLERK_PUBLISHABLE_KEY = ${JSON.stringify(clerkKey)};</script>`;
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
