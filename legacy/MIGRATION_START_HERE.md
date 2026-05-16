# 🚀 Express.js to Next.js Migration Guide

## START HERE

This directory now contains a complete analysis of all **39 Express.js routes** that need to be migrated to Next.js. Everything you need is documented below.

---

## 📄 Migration Documents (Pick One Based on Your Need)

### 1. **MIGRATION_SUMMARY.txt** ← Start Here First
**For:** Quick overview of the entire project  
**Contains:**
- Statistics (39 total routes, 15 protected, 24 public)
- Complexity assessment and blockers
- 6-phase migration plan with time estimates
- Completion checklist
- Success factors

**Read Time:** 10 minutes

---

### 2. **ROUTES_QUICK_REFERENCE.md** ← For Implementation
**For:** During development - quick lookups  
**Contains:**
- All 39 routes sorted by category
- Complexity chart (simple/moderate/complex)
- Common code patterns you'll need
- Gotchas table
- Success criteria

**Read Time:** 15 minutes (reference as needed)

---

### 3. **ROUTES_MIGRATION_MAP.md** ← For Details
**For:** Understanding each route deeply  
**Contains:**
- Complete table with all route metadata
- Handler signatures and dependencies
- Special handling notes for each route
- Database queries and tables
- Environment variables needed
- File structure preview
- Testing strategy

**Read Time:** 30 minutes (or reference specific routes)

---

### 4. **routes-migration.json** ← For Automation
**For:** Programmatic access, scripts, tools  
**Contains:**
- Machine-readable route inventory
- All metadata in JSON format
- Database schema
- Dependency analysis
- Migration phases grouped

**Use:** Parse with tools, generate boilerplate code

---

## 🎯 Quick Stats

```
Total Routes:        39
Protected Routes:    15 (need JWT verification)
Public Routes:       24
Estimated Effort:    40-60 hours
Highest Risk:        File uploads, Git operations
Easiest Phase:       Public utilities (2-4 hours)
```

---

## ⚡ 5-Minute Quick Start

### The Problem
You have ~40 Express routes that need to work in Next.js. Some features (Multer, local disk) don't work on Vercel.

### The Solution
1. **Identify blockers**: Multer → formidable, Local disk → S3, Git ops → sidecar
2. **Implement JWT verification** for 15 protected routes
3. **Set up shared utilities** in `lib/` folder
4. **Migrate in phases** starting with easy stuff

### Key Gotchas
- ❌ Multer doesn't work in Next.js
- ❌ Can't write to local disk on Vercel
- ❌ Can't run child processes
- ❌ JWT middleware needs manual implementation

### Your Action Items (TODAY)
1. Read MIGRATION_SUMMARY.txt (10 min)
2. Read ROUTES_QUICK_REFERENCE.md (15 min)
3. Create lib/ folder structure
4. Install dependencies: `npm install formidable jose pg`
5. Start with Phase 1 (public utilities)

---

## 📋 Route Breakdown by Category

### 🔐 Protected Routes (JWT Required) - 15 total
```
Projects:     /api/projects (3 routes)
Notes:        /api/notes (2 routes)
Globals:      /api/globals/:id (2 routes)
User:         /api/user/username (2 routes)
Backup:       /api/backup-email, /api/test-backup, etc. (4 routes)
Wiki:         /api/projects/:id/wiki-settings (2 routes)
```

### 🌐 Public Routes - 24 total
```
Uploads:      /api/upload, /api/source-upload, etc. (5 routes)
Git:          /api/git/* (5 routes)
Utilities:    /health, /api/config, /api/version, etc. (9 routes)
Wiki:         /api/wiki/* (2 routes)
Other:        /api/validate-link, /api/cleanup (2 routes)
```

---

## 🚀 6-Phase Migration Plan

### Phase 1: Public Utilities (2-4 hours) ← START HERE
Routes: Health, config, version, AWS status, Bible API  
Risk: LOW  
Effort: 4 hours  
Focus: Straightforward ports, no dependencies

### Phase 2: Database Routes (6-8 hours)
Routes: Projects, notes, globals, username, wiki settings  
Risk: MEDIUM  
Effort: 8 hours  
Prerequisite: JWT implementation

### Phase 3: File Uploads (12-16 hours) 🔴 HIGH RISK
Routes: Upload, source-upload, source-meta, source-files  
Risk: HIGH  
Effort: 16 hours  
Blockers: Multer → formidable, disk → S3

### Phase 4: Git Operations (10-14 hours) 🔴 VERY HIGH RISK
Routes: Git init, commit, log, diff, status  
Risk: VERY HIGH  
Effort: 12 hours  
Blocker: No disk persistence - needs sidecar

### Phase 5: Email (4-6 hours)
Routes: Backup email, test email, resend  
Risk: MEDIUM  
Effort: 6 hours  
Prerequisite: Resend API configured

### Phase 6: Final Routes (2-4 hours)
Routes: Validation, cleanup, remaining utilities  
Risk: LOW  
Effort: 2 hours

---

## 📁 Expected Next.js File Structure

```
app/api/
├── (auth)/                          # Protected routes group
│   ├── projects/route.ts
│   ├── notes/route.ts
│   ├── globals/[id]/route.ts
│   ├── user/username/route.ts
│   ├── backup-email/route.ts
│   └── ...
├── upload/route.ts
├── source-upload/route.ts
├── source-files/[projectId]/route.ts
├── git/
│   ├── init/route.ts
│   ├── commit/route.ts
│   └── ...
├── health/route.ts
├── config/route.ts
├── version/route.ts
└── ...

lib/
├── auth.ts          # JWT verification
├── db.ts            # Database pool
├── s3.ts            # S3 operations
├── upload.ts        # Multipart parsing
└── resend.ts        # Email helper
```

---

## 🔧 Essential Libraries to Install

```bash
npm install \
  jose \                    # JWT verification
  pg \                      # PostgreSQL
  @aws-sdk/client-s3 \     # S3 client
  @aws-sdk/s3-request-presigner \  # Presigned URLs
  formidable \             # Multipart parsing (replaces multer)
  resend \                 # Email API
  dotenv                   # Environment variables
```

---

## 🎯 Implementation Priorities

### Week 1 (Phase 1-2)
- [ ] Set up lib/ utilities
- [ ] Implement JWT verification
- [ ] Migrate public utilities (9 routes)
- [ ] Migrate database routes (11 routes)
- **Goal: 20 routes working**

### Week 2-3 (Phase 3)
- [ ] Research formidable multipart parsing
- [ ] Set up S3 client
- [ ] Migrate file upload routes (5 routes)
- **Goal: Basic file uploads working**

### Week 3-4 (Phase 4)
- [ ] Decide on git sidecar strategy
- [ ] Implement git service or GitHub API
- [ ] Migrate git routes (5 routes)
- **Goal: Git operations working**

### Week 4 (Phase 5-6)
- [ ] Migrate email routes (5 routes)
- [ ] Migrate remaining routes (4 routes)
- [ ] Testing and debugging
- **Goal: All 39 routes working**

---

## ✅ Verification Steps

### After Each Phase
- [ ] All routes return correct responses
- [ ] Database queries work
- [ ] Authentication verified
- [ ] Error handling consistent
- [ ] Performance acceptable

### Final Verification
- [ ] All 39 routes working
- [ ] Protected routes require valid JWT
- [ ] Public routes accessible
- [ ] File uploads working
- [ ] Database queries correct
- [ ] Error handling tested
- [ ] Response formats match

---

## 🆘 Common Questions

**Q: Do I need to rewrite all 39 routes?**  
A: Yes, each route needs a Next.js API route handler. But the business logic is the same.

**Q: Can I keep Express running during migration?**  
A: Yes! Run both in parallel, gradually migrate routes, then switch traffic.

**Q: What about the Vite dev server?**  
A: Next.js handles that automatically. Remove all Vite-specific code.

**Q: Is S3 required?**  
A: On Vercel, yes. For local development, you can use a fallback. Set it up in config.

**Q: How do I handle JWT verification?**  
A: Use the `jose` library to manually verify Auth0 tokens. See ROUTES_QUICK_REFERENCE.md for code.

**Q: What's the hardest part?**  
A: File uploads (no Multer support) and Git operations (no disk persistence). Plan extra time.

**Q: Can I use Next.js middleware instead of auth in routes?**  
A: You could, but the original code checks auth in each route. Consistency matters.

---

## 📞 Support Resources

If you get stuck:

1. **For route details:** See ROUTES_MIGRATION_MAP.md
2. **For code patterns:** See ROUTES_QUICK_REFERENCE.md
3. **For machine-readable data:** See routes-migration.json
4. **For overall plan:** See MIGRATION_SUMMARY.txt

---

## 🎓 Pro Tips

1. **Start with Phase 1** - Build confidence with easy routes
2. **Use code generation** - Parse routes-migration.json to generate boilerplate
3. **Test continuously** - Compare responses between Express and Next.js
4. **Isolate blockers** - Solve Multer/S3/Git early, don't wait
5. **Keep Express running** - Maintain old server during migration for safety
6. **Monitor performance** - Use Vercel Analytics to track changes

---

## 📊 Progress Tracking

Use this to track your progress:

```
Phase 1 (Public Utilities):   [________] 0%
Phase 2 (Database Routes):    [________] 0%
Phase 3 (File Uploads):       [________] 0%
Phase 4 (Git Operations):     [________] 0%
Phase 5 (Email):              [________] 0%
Phase 6 (Final Routes):       [________] 0%

Total Progress:               [________] 0%
```

---

## ✨ You're Ready to Start!

1. **Read** MIGRATION_SUMMARY.txt (10 min)
2. **Skim** ROUTES_QUICK_REFERENCE.md (5 min)
3. **Install** dependencies listed above (2 min)
4. **Create** lib/ folder and start with Phase 1 (easiest routes)
5. **Reference** detailed docs as needed

**Questions?** Check the relevant document - everything is documented.

---

**Next Step:** Open MIGRATION_SUMMARY.txt →

---

*Last Updated: 2024*  
*All 39 routes analyzed and documented*  
*Ready for migration*
