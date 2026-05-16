# Express.js to Next.js Routes Migration Map

**Total Routes: 37**

This document maps all Express.js routes from `server.ts` to their Next.js API route equivalents.

---

## Route Mapping Table

| # | HTTP Method | Path | Auth Required | Handler Signature | Key Dependencies | Special Handling | Next.js Path |
|---|---|---|---|---|---|---|---|
| 1 | POST | `/api/upload` | No | `file: Express.Multer.File` | multer, S3, presigned URLs | File upload, S3 sync, presigned URL generation | `app/api/upload/route.ts` |
| 2 | POST | `/api/source-upload` | No | `file: Express.Multer.File, projectId: string` | multer, S3, pdf-parse, processFolder | Disk + S3 upload, PDF text extraction, async sidecar pipeline | `app/api/source-upload/route.ts` |
| 3 | POST | `/api/source-meta` | No | `filename, metadata, projectId, content` | S3, fs, getSignedUrl | Metadata + markdown sidecar, S3 upload | `app/api/source-meta/route.ts` |
| 4 | GET | `/api/source-files/:projectId` | No | `projectId: string` | S3 ListObjectsV2, fs, path | Hybrid S3/disk listing with fallback | `app/api/source-files/[projectId]/route.ts` |
| 5 | GET | `/api/source-meta/:projectId/:filename` | No | `projectId, filename: string` | fs, path | Local disk read only | `app/api/source-meta/[projectId]/[filename]/route.ts` |
| 6 | POST | `/api/validate-link` | No | `url: string` | fetch API, AbortController (timeout) | Network request with 5s timeout, HEAD method | `app/api/validate-link/route.ts` |
| 7 | POST | `/api/git/init` | No | `projectId: string` | simple-git, fs, path | Git initialization | `app/api/git/init/route.ts` |
| 8 | POST | `/api/git/commit` | No | `projectId, message, files[]` | simple-git, fs, path | Git commit with file writes | `app/api/git/commit/route.ts` |
| 9 | GET | `/api/git/log/:projectId` | No | `projectId: string` | simple-git | Git log retrieval | `app/api/git/log/[projectId]/route.ts` |
| 10 | GET | `/api/git/diff/:projectId/:commitHash` | No | `projectId, commitHash: string` | simple-git | Git diff for specific commit | `app/api/git/diff/[projectId]/[commitHash]/route.ts` |
| 11 | POST | `/api/git/status` | No | `projectId: string` | simple-git | Git status check | `app/api/git/status/route.ts` |
| 12 | POST | `/api/cleanup` | No | `activeImageUrls: string[]` | fs, path | File system cleanup (orphaned uploads) | `app/api/cleanup/route.ts` |
| 13 | GET | `/health` | No | No params | None | Simple health check | `app/api/health/route.ts` |
| 14 | GET | `/api/config` | No | No params | env vars | Configuration/heartbeat endpoint | `app/api/config/route.ts` |
| 15 | GET | `/api/network-info` | No | No params | os.networkInterfaces() | Local IP and port info | `app/api/network-info/route.ts` |
| 16 | GET | `/api/bible/:reference` | No | `reference: string, translation?: string` | fetch (external API) | External API call to bible-api.com | `app/api/bible/[reference]/route.ts` |
| 17 | GET | `/api/version` | No | No params | child_process.execSync, fs | Git commit hash + source hash | `app/api/version/route.ts` |
| 18 | GET | `/api/aws-status` | No | No params | S3Client (ListObjectsV2) | S3 connectivity check | `app/api/aws-status/route.ts` |
| 19 | POST | `/api/presigned-url` | No | `key: string` | S3, getSignedUrl | Generate presigned URL for any S3 key | `app/api/presigned-url/route.ts` |
| 20 | GET | `/api/debug-storage` | No | No params | Database pool | Debug endpoint (list projects/users) | `app/api/debug-storage/route.ts` |
| 21 | GET | `/api/projects` | **Yes (JWT)** | No params | Database pool, userId from JWT | Fetch user's projects | `app/api/projects/route.ts` |
| 22 | POST | `/api/projects` | **Yes (JWT)** | `project: Project` | Database pool, userId from JWT | Create/update project | `app/api/projects/route.ts` |
| 23 | DELETE | `/api/projects/:id` | **Yes (JWT)** | `id: string` | Database pool, userId from JWT | Delete project (ownership check) | `app/api/projects/[id]/route.ts` |
| 24 | GET | `/api/notes` | **Yes (JWT)** | No params | Database pool, userId from JWT | Fetch user's global notes | `app/api/notes/route.ts` |
| 25 | POST | `/api/notes` | **Yes (JWT)** | `note: Note` | Database pool, userId from JWT | Create/update global note | `app/api/notes/route.ts` |
| 26 | GET | `/api/globals/:id` | **Yes (JWT)** | `id: string` | Database pool, userId from JWT | Fetch app global (settings/prompts) with defaults | `app/api/globals/[id]/route.ts` |
| 27 | POST | `/api/globals/:id` | **Yes (JWT)** | `id: string, data: any` | Database pool, userId from JWT | Update app global | `app/api/globals/[id]/route.ts` |
| 28 | GET | `/test` | No | No params | None | Test endpoint | `app/api/test/route.ts` |
| 29 | POST | `/api/backup-email` | **Yes (JWT)** | `projectTitle, wordCount, hash, backupData` | Resend API, Database pool, userId from JWT | Send backup email notification | `app/api/backup-email/route.ts` |
| 30 | GET | `/api/verify-backup/:resendId` | No | `resendId: string` | Resend API (future: check delivery) | Mock endpoint - placeholder for real implementation | `app/api/verify-backup/[resendId]/route.ts` |
| 31 | POST | `/api/send-test-email` | **Yes (JWT)** | `projectId, userEmail` | Resend API, userId from JWT | Test email for backup notifications | `app/api/send-test-email/route.ts` |
| 32 | POST | `/api/test-backup` | **Yes (JWT)** | `projectId: string` | Database pool, Resend API, crypto.createHash, userId from JWT | Create test backup + send email | `app/api/test-backup/route.ts` |
| 33 | POST | `/api/resend-backup/:backupId` | **Yes (JWT)** | `backupId, projectId: string` | Database pool, Resend API, userId from JWT | Retry failed backup email | `app/api/resend-backup/[backupId]/route.ts` |
| 34 | POST | `/api/user/username` | **Yes (JWT)** | `username: string` | Database pool, userId from JWT | Set/update username with validation & uniqueness | `app/api/user/username/route.ts` |
| 35 | GET | `/api/user/username` | **Yes (JWT)** | No params | Database pool, userId from JWT | Get user's username | `app/api/user/username/route.ts` |
| 36 | GET | `/api/wiki/:username/:bookName` | No | `username, bookName: string` | Database pool | Fetch wiki page (public + enabled only) | `app/api/wiki/[username]/[bookName]/route.ts` |
| 37 | GET | `/api/wiki/:username` | No | `username: string` | Database pool | List user's public wiki books | `app/api/wiki/[username]/route.ts` |
| 38 | GET | `/api/projects/:projectId/wiki-settings` | **Yes (JWT)** | `projectId: string` | Database pool, userId from JWT | Fetch wiki visibility settings | `app/api/projects/[projectId]/wiki-settings/route.ts` |
| 39 | POST | `/api/projects/:projectId/wiki-settings` | **Yes (JWT)** | `projectId, is_wiki_public, enable_wiki, wikiSettings` | Database pool, userId from JWT | Update wiki visibility + settings | `app/api/projects/[projectId]/wiki-settings/route.ts` |

---

## Special Considerations for Migration

### 1. **Multer File Uploads**
   - Routes #1, #2 use multer middleware
   - **Next.js Issue**: Multer is NOT compatible with Next.js API routes out of the box
   - **Solution**: 
     - Use `next-connect` middleware or custom `apiHandler` wrapper
     - Or migrate to Vercel Blob, AWS S3 client libraries directly, or `formidable`
     - Consider using `busboy` for streaming multipart parsing

### 2. **Middleware Chain**
   - Express middleware (`cors`, `express.json`, `express-oauth2-jwt-bearer`) needs conversion
   - **Solution**: 
     - Implement custom JWT verification in each protected route
     - CORS headers can be set per-route or in `next.config.ts`
     - Use `next-connect` to replicate middleware pattern

### 3. **File System Operations**
   - Routes #1-5, #12 perform local disk I/O
   - **Next.js Constraint**: Cannot write to disk in serverless (Vercel)
   - **Solution**: Move to S3 for all file storage, remove local disk persistence

### 4. **Long-Running Operations**
   - Route #2 triggers async `processFolder()` via `setImmediate`
   - **Solution**: Use `waitUntil()` in Next.js (if on Vercel) or move to background job queue

### 5. **Simple-Git (Git Operations)**
   - Routes #7-11 perform git operations on local disk
   - **Next.js Constraint**: Serverless environments cannot maintain git repos
   - **Solution**: Move git logic to a separate sidecar service, or use API to GitHub/Gitea

### 6. **Database Connections**
   - All protected routes use `getPool()` (PostgreSQL via node-postgres)
   - **Solution**: Keep same connection pooling, ensure env vars are set in Next.js

### 7. **Static Files & SPA Fallback**
   - Routes #1421-1448: Vite dev server + SPA fallback
   - **Next.js**: Automatic with built-in routing; remove this logic

### 8. **Auth0 JWT Verification**
   - Route 645-648: `express-oauth2-jwt-bearer` middleware
   - **Solution**: Replace with `getSession()` from `@auth0/nextjs-auth0` or verify JWT manually

### 9. **Query Parameters**
   - Route #16 uses query params: `translation` 
   - **Next.js**: Access via `req.nextUrl.searchParams` in API routes

### 10. **Environment-Specific Logic**
   - Check `process.env.NODE_ENV` for dev/prod logic
   - **Next.js**: Keep same pattern; use `.env.local` for local vars

---

## Authentication Implementation Notes

### JWT Verification
The original uses Auth0 with `express-oauth2-jwt-bearer`. Replace with:

```typescript
// Option 1: Manual JWT verification (lightweight)
import { jwtVerify } from 'jose';
const secret = new TextEncoder().encode(process.env.AUTH0_SECRET!);

// Option 2: Auth0 SDK
import { getSession } from '@auth0/nextjs-auth0';

// Option 3: JWT library (e.g., jsonwebtoken)
import jwt from 'jsonwebtoken';
```

**Protected Routes** (require JWT in Authorization header):
- Routes: #21, #22, #23, #24, #25, #26, #27, #29, #31, #32, #33, #34, #35, #38, #39

**Public Routes** (no auth):
- Routes: #1-20, #28, #30, #36, #37

---

## Database Queries Summary

### Tables Used:
- `projects` (id, user_id, title, data, last_modified, is_wiki_public, enable_wiki)
- `users` (id, email, username, name)
- `global_notes` (id, user_id, content, tags, data, timestamp)
- `app_globals` (id, user_id, data, last_modified)

### Query Patterns:
- **Ownership checks**: WHERE `user_id = $1` (protect user data)
- **Upserts**: `ON CONFLICT ... DO UPDATE SET` (projects, notes, globals, username)
- **Unique constraints**: `username` field (catches duplicates with UNIQUE violation code `23505`)
- **Joins**: projects ↔ users for wiki endpoints

---

## Environment Variables Required

```env
# Auth0
AUTH0_ISSUER_BASE_URL=https://dev-t0pa1ah6r1n2wc4a.us.auth0.com/
AUTH0_AUDIENCE=https://dev-t0pa1ah6r1n2wc4a.us.auth0.com/api/v2/
AUTH0_SECRET=<your-secret>

# AWS S3
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_S3_BUCKET=<bucket>
PRESIGNED_URL_EXPIRY=3600

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Gemini API
GEMINI_API_KEY=<key>
VITE_GEMINI_API_KEY=<key>

# Email
RESEND_API_KEY=<key>

# Sentry (optional)
SENTRY_DSN=<dsn>

# Node
NODE_ENV=development
```

---

## Migration Priority (Recommended Order)

### Phase 1: Public Utility Routes (Lowest Risk)
1. Routes #13-20 (health, config, network, bible, version, aws-status, presigned-url, debug)

### Phase 2: Database Routes (Medium Risk - Single table ops)
2. Routes #21-27 (projects, notes, globals - require JWT implementation)

### Phase 3: File Upload Routes (High Risk - Multer + S3)
3. Routes #1-5 (upload, source-upload, source-meta, source-files, source-meta)

### Phase 4: Git Routes (High Risk - Local Disk + Sidecar)
4. Routes #7-11 (git operations - may need architectural change)

### Phase 5: Email Routes (Medium Risk - External API)
5. Routes #29-33 (backup-email, test-email, test-backup, resend-backup)

### Phase 6: User/Wiki Routes (Medium Risk - User data + public endpoints)
6. Routes #34-39 (username, wiki endpoints)

### Phase 7: Other Routes
7. Routes #6, #12, #28, #30 (validate-link, cleanup, test, verify-backup)

---

## File Structure Preview

```
app/api/
├── (auth)/                          # Protected routes group
│   ├── projects/
│   │   ├── route.ts                 # GET, POST
│   │   └── [id]/
│   │       └── route.ts             # DELETE
│   ├── notes/
│   │   └── route.ts                 # GET, POST
│   ├── globals/
│   │   └── [id]/
│   │       └── route.ts             # GET, POST
│   ├── backup-email/
│   │   └── route.ts                 # POST
│   ├── user/
│   │   └── username/
│   │       └── route.ts             # GET, POST
│   ├── test-backup/
│   │   └── route.ts                 # POST
│   ├── send-test-email/
│   │   └── route.ts                 # POST
│   ├── resend-backup/
│   │   └── [backupId]/
│   │       └── route.ts             # POST
│   └── projects/
│       └── [projectId]/
│           └── wiki-settings/
│               └── route.ts         # GET, POST
├── upload/
│   └── route.ts                     # POST (file upload)
├── source-upload/
│   └── route.ts                     # POST (file upload)
├── source-meta/
│   └── route.ts                     # POST
│   └── [projectId]/
│       └── [filename]/
│           └── route.ts             # GET
├── source-files/
│   └── [projectId]/
│       └── route.ts                 # GET
├── validate-link/
│   └── route.ts                     # POST
├── git/
│   ├── init/
│   │   └── route.ts                 # POST
│   ├── commit/
│   │   └── route.ts                 # POST
│   ├── log/
│   │   └── [projectId]/
│   │       └── route.ts             # GET
│   ├── diff/
│   │   └── [projectId]/
│   │       └── [commitHash]/
│   │           └── route.ts         # GET
│   └── status/
│       └── route.ts                 # POST
├── cleanup/
│   └── route.ts                     # POST
├── health/
│   └── route.ts                     # GET
├── config/
│   └── route.ts                     # GET
├── network-info/
│   └── route.ts                     # GET
├── bible/
│   └── [reference]/
│       └── route.ts                 # GET
├── version/
│   └── route.ts                     # GET
├── aws-status/
│   └── route.ts                     # GET
├── presigned-url/
│   └── route.ts                     # POST
├── debug-storage/
│   └── route.ts                     # GET
├── test/
│   └── route.ts                     # GET
├── verify-backup/
│   └── [resendId]/
│       └── route.ts                 # GET
└── wiki/
    └── [username]/
        ├── route.ts                 # GET (list books)
        └── [bookName]/
            └── route.ts             # GET (single book)
```

---

## Notes on Shared Utilities

### Extract to `lib/` files:
- **S3 client setup** → `lib/s3.ts`
- **Git operations** → `lib/git.ts`
- **Database helpers** → `lib/db.ts`
- **JWT verification** → `lib/auth.ts`
- **File upload handling** → `lib/upload.ts`

### Middleware approach:
```typescript
// lib/api-handler.ts - Wrapper for common patterns
import { NextRequest, NextResponse } from 'next/server';

export async function withAuth(
  handler: (req: NextRequest, userId: string) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const userId = await getUserFromJWT(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return handler(req, userId);
  };
}
```

---

## Testing Strategy

1. **Unit tests**: Verify each route's business logic
2. **Integration tests**: Test database operations with test DB
3. **Comparison tests**: Run both Express and Next.js versions in parallel, compare responses
4. **File upload tests**: Test S3 upload, presigned URL generation, PDF extraction
5. **Auth tests**: Verify JWT verification works in Next.js
6. **Database tests**: Verify all query patterns work (upserts, ownership checks)

---

## Rollout Plan

1. **Setup**: Verify Next.js project structure, install dependencies
2. **Create lib utilities**: S3, auth, DB helpers
3. **Batch create routes**: Phase 1-7 in order
4. **Test each phase**: Run tests before moving to next
5. **Verify feature parity**: Compare responses between Express and Next.js
6. **Gradual migration**: Routes → Environment switch → Decommission Express server

---

Generated: $(date)
Migration Complexity: **HIGH** (File uploads, Git ops, Multer middleware)
Estimated Effort: 40-60 hours for full migration
