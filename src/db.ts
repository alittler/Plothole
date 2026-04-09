import pg from 'pg';
const { Pool } = pg;

let pool: pg.Pool | null = null;

export const getPool = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn("DATABASE_URL not found. Database features will be disabled.");
      return null;
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : {
        rejectUnauthorized: false // Required for Neon and RDS with self-signed/provider certs
      },
      // Add connection timeout - 5 seconds max wait for a connection
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
};

export const initDb = async () => {
  const p = getPool();
  if (!p) return;

  try {
    console.log("⏳ Initializing database...");
    
    // Create a timeout promise that rejects after 8 seconds
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database init timeout')), 8000)
    );

    // Wrap the query in a timeout
    const initPromise = (async () => {
      // Basic tables
      await p.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          username TEXT UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          data JSONB NOT NULL,
          is_wiki_public BOOLEAN DEFAULT false,
          enable_wiki BOOLEAN DEFAULT true,
          last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS global_notes (
          id TEXT PRIMARY KEY,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          tags TEXT[],
          data JSONB,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Add wiki columns to projects table if they don't exist
      try {
        await p.query(`
          ALTER TABLE projects
          ADD COLUMN IF NOT EXISTS is_wiki_public BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS enable_wiki BOOLEAN DEFAULT true;
        `);
      } catch (err: any) {
        if (err.code !== '42701') {
          console.warn("Note: Could not add wiki columns to projects:", err.message);
        }
      }

      // Add username column to users table if it doesn't exist
      try {
        await p.query(`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
        `);
      } catch (err: any) {
        if (err.code !== '42701') {
          console.warn("Note: Could not add username column to users:", err.message);
        }
      }

      // App Globals table
      await p.query(`
        CREATE TABLE IF NOT EXISTS app_globals (
          id TEXT NOT NULL,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          data JSONB NOT NULL,
          last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id, user_id)
        );
      `);
    })();

    // Race between init and timeout
    await Promise.race([initPromise, timeoutPromise]);
    console.log("✅ Database tables initialized");
  } catch (err: any) {
    console.warn("⚠️  Database init failed (continuing without DB):", err.message);
  }
};
