# Quick Route Reference - Express to Next.js

## 🎯 At a Glance

**Total Routes:** 39 | **Protected:** 15 | **Public:** 24 | **Complexity:** HIGH

---

## 📋 Complete Route List (Sorted by Category)

### 🔐 Protected Routes (JWT Required) - 15 total

```
GET    /api/projects              → app/api/projects/route.ts
POST   /api/projects              → app/api/projects/route.ts
DELETE /api/projects/:id          → app/api/projects/[id]/route.ts

GET    /api/notes                 → app/api/notes/route.ts
POST   /api/notes                 → app/api/notes/route.ts

GET    /api/globals/:id           → app/api/globals/[id]/route.ts
POST   /api/globals/:id           → app/api/globals/[id]/route.ts

GET    /api/user/username         → app/api/user/username/route.ts
POST   /api/user/username         → app/api/user/username/route.ts

POST   /api/backup-email          → app/api/backup-email/route.ts
POST   /api/send-test-email       → app/api/send-test-email/route.ts
POST   /api/test-backup           → app/api/test-backup/route.ts
POST   /api/resend-backup/:id     → app/api/resend-backup/[backupId]/route.ts

GET    /api/projects/:id/wiki-settings    → app/api/projects/[projectId]/wiki-settings/route.ts
POST   /api/projects/:id/wiki-settings    → app/api/projects/[projectId]/wiki-settings/route.ts
```

### 🌐 Public Routes - 24 total

**File Uploads:**
```
POST   /api/upload                → app/api/upload/route.ts
POST   /api/source-upload         → app/api/source-upload/route.ts
POST   /api/source-meta           → app/api/source-meta/route.ts
GET    /api/source-files/:id      → app/api/source-files/[projectId]/route.ts
GET    /api/source-meta/:id/:file → app/api/source-meta/[projectId]/[filename]/route.ts
```

**Git Operations:**
```
POST   /api/git/init              → app/api/git/init/route.ts
POST   /api/git/commit            → app/api/git/commit/route.ts
GET    /api/git/log/:id           → app/api/git/log/[projectId]/route.ts
GET    /api/git/diff/:id/:commit  → app/api/git/diff/[projectId]/[commitHash]/route.ts
POST   /api/git/status            → app/api/git/status/route.ts
```

**Utilities:**
```
GET    /health                    → app/api/health/route.ts
GET    /api/config                → app/api/config/route.ts
GET    /api/network-info          → app/api/network-info/route.ts
GET    /api/version               → app/api/version/route.ts
GET    /api/aws-status            → app/api/aws-status/route.ts
GET    /api/debug-storage         → app/api/debug-storage/route.ts
GET    /test                      → app/api/test/route.ts
```

**Other:**
```
POST   /api/validate-link         → app/api/validate-link/route.ts
POST   /api/cleanup               → app/api/cleanup/route.ts
POST   /api/presigned-url         → app/api/presigned-url/route.ts
GET    /api/bible/:ref            → app/api/bible/[reference]/route.ts
GET    /api/verify-backup/:id     → app/api/verify-backup/[resendId]/route.ts
```

**Wiki (Public):**
```
GET    /api/wiki/:user            → app/api/wiki/[username]/route.ts
GET    /api/wiki/:user/:book      → app/api/wiki/[username]/[bookName]/route.ts
```

---

## 🚀 Quick Migration Checklist

### Setup Phase
- [ ] Install Next.js 14+
- [ ] Create `lib/` folder for shared utilities
- [ ] Set up `.env.local` with all env vars
- [ ] Install dependencies: `npm install @aws-sdk/client-s3 pg resend`

### Phase 1: Utilities (2-4 hours)
- [ ] `/health` → simple
- [ ] `/api/config` → simple
- [ ] `/api/network-info` → may need special handling
- [ ] `/api/version` → replace execSync with env var
- [ ] `/api/aws-status` → simple
- [ ] `/api/debug-storage` → simple
- [ ] `/test` → simple
- [ ] `/api/bible/:reference` → simple
- [ ] `/api/validate-link` → simple
- [ ] `/api/cleanup` → remove or redesign

### Phase 2: Database Routes (6-8 hours)
- [ ] Create `lib/auth.ts` - JWT verification
- [ ] Create `lib/db.ts` - database pool
- [ ] Projects CRUD: 3 routes
- [ ] Notes CRUD: 2 routes
- [ ] Globals CRUD: 2 routes
- [ ] User username: 2 routes

### Phase 3: File Uploads (12-16 hours) ⚠️ HIGH RISK
- [ ] Create `lib/upload.ts` - multipart parser (formidable)
- [ ] Create `lib/s3.ts` - S3 client setup
- [ ] `/api/upload` → needs multipart parsing
- [ ] `/api/source-upload` → disk + S3 + PDF extraction
- [ ] `/api/source-meta` → metadata + markdown sidecars
- [ ] `/api/source-files/:id` → S3 listing
- [ ] `/api/source-meta/:id/:file` → local disk read
- [ ] `/api/presigned-url` → simple

### Phase 4: Git Operations (10-14 hours) ⚠️ HIGH RISK
- [ ] Consider sidecar service architecture
- [ ] All 5 git routes - need local disk persistence
- [ ] May require refactoring to call external service

### Phase 5: Email (4-6 hours)
- [ ] Create `lib/resend.ts` - Resend API wrapper
- [ ] `/api/backup-email` → simple
- [ ] `/api/send-test-email` → simple
- [ ] `/api/test-backup` → DB + email
- [ ] `/api/resend-backup/:id` → DB + email
- [ ] `/api/verify-backup/:id` → placeholder

### Phase 6: Wiki & User Settings (4-6 hours)
- [ ] `/api/wiki/:user` → DB query
- [ ] `/api/wiki/:user/:book` → DB query with slug matching
- [ ] `/api/projects/:id/wiki-settings` → 2 routes, DB

### Integration & Testing (6-10 hours)
- [ ] Test each route against original
- [ ] Response comparison (before/after)
- [ ] Database operations
- [ ] File uploads
- [ ] Edge cases & error handling

---

## 🔧 Key Code Patterns

### JWT Verification (All Protected Routes)

```typescript
// lib/auth.ts
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.AUTH0_SECRET!);

export async function getUserFromJWT(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  try {
    const token = authHeader.slice(7);
    const verified = await jwtVerify(token, secret);
    return verified.payload.sub as string;
  } catch {
    return null;
  }
}
```

### Database Queries

```typescript
// lib/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function getProjects(userId: string) {
  return pool.query(
    'SELECT data FROM projects WHERE user_id = $1 ORDER BY last_modified DESC',
    [userId]
  );
}
```

### Multipart Form Handling

```typescript
// lib/upload.ts - Use formidable instead of multer
import formidable from 'formidable';

export async function parseMultipart(request: Request) {
  const form = formidable({ multiples: true });
  const [fields, files] = await form.parse(request);
  return { fields, files };
}
```

### S3 Operations

```typescript
// lib/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3Client = new S3Client({ region: process.env.AWS_REGION });
export const s3Bucket = process.env.AWS_S3_BUCKET!;

export async function uploadToS3(key: string, body: Buffer) {
  return s3Client.send(new PutObjectCommand({
    Bucket: s3Bucket,
    Key: key,
    Body: body
  }));
}

export async function getPresignedUrl(key: string) {
  const command = new GetObjectCommand({ Bucket: s3Bucket, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
```

---

## ⚠️ Critical Gotchas

| Issue | Express | Next.js | Solution |
|-------|---------|---------|----------|
| **Multer** | Works natively | ❌ Not compatible | Use formidable or busboy |
| **Local Disk I/O** | ✅ Works | ❌ Fails on Vercel | Move to S3 or database |
| **Git Operations** | ✅ Works | ❌ No disk persistence | Use sidecar service |
| **JWT Middleware** | `express-oauth2-jwt-bearer` | Manual verification | Implement custom middleware |
| **Child Process** | `execSync` works | ❌ May fail | Use env vars instead |
| **Vite Dev Server** | Integrated | ✅ Not needed | Next.js handles this |
| **Static Files** | `express.static()` | `public/` folder | Move files to public/ |
| **CORS** | `cors()` middleware | Headers per route | Use `next-cors` or config |

---

## 📊 Route Complexity Chart

```
Simple (< 1 hour)
├─ Health checks (13)
├─ Config endpoints (14, 15, 17, 20, 28)
├─ External API calls (16)
└─ S3 status checks (18, 19)

Moderate (1-3 hours)
├─ Database CRUD (21-27, 34-35)
├─ Wiki endpoints (36-37)
├─ Validation routes (6)
└─ Email routes (29-31)

Complex (4-8 hours)
├─ Backup management (32-33)
├─ Wiki settings (38-39)
└─ File uploads - basic (1)

Very Complex (8+ hours)
├─ Source upload + extraction (2)
├─ Source metadata + S3 (3-5)
├─ Git operations (7-11)
└─ File cleanup (12)
```

---

## 🎯 Success Criteria

✅ All 39 routes migrated to Next.js  
✅ All protected routes require valid JWT  
✅ All public routes accessible without auth  
✅ Database queries produce identical results  
✅ File uploads work (S3 or local)  
✅ Email notifications functional  
✅ Git operations (or sidecar) working  
✅ Response formats match original  
✅ Error handling consistent  
✅ Performance benchmarks acceptable  

---

## 📞 Common Questions

**Q: Why is Multer a problem?**  
A: Multer is Express middleware that can't be used in Next.js. Use formidable or busboy instead.

**Q: Can I keep local disk storage?**  
A: No - Vercel serverless doesn't have persistent disk. Use S3 or database.

**Q: How do I handle async background jobs?**  
A: Use `waitUntil()` on Vercel, or move to separate worker service.

**Q: Can I keep the Express server?**  
A: Yes - run Express separately, gradually migrate routes, then deprecate.

**Q: How do I verify JWTs without the library?**  
A: Use `jose` library for manual verification with your Auth0 public key.

---

## 📚 References

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Node.js PostgreSQL](https://node-postgres.com/)
- [AWS SDK v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)
- [Resend Email API](https://resend.com/docs)
- [Formidable Multipart Parser](https://github.com/node-formidable/formidable)
- [Jose JWT Library](https://github.com/panva/jose)

---

Last Updated: 2024  
Total Routes Analyzed: 39  
Estimated Total Effort: 40-60 hours
