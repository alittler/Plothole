# Plothole Next.js Migration - Deployment Strategy

## Current Status: ✅ Foundation Ready for Vercel

### What's Complete
- ✅ Next.js app structure (App Router)
- ✅ Auth0 integration
- ✅ Basic API routes (health, config, version, etc.)
- ✅ React components ported to `app/` directory
- ✅ Build succeeds (`npm run build`)
- ✅ Ready to deploy to Vercel

### What Needs Completion: 39 Express Routes
See detailed migration guide in:
- `README_MIGRATION_DOCS.md` - Navigation guide
- `MIGRATION_START_HERE.md` - Quick start
- `ROUTES_MIGRATION_MAP.md` - Complete route mapping
- `routes-migration.json` - Machine-readable format

**Estimated effort: 40-60 hours** for full route migration

## Deployment to Vercel NOW

### Step 1: Connect Repository
1. Go to vercel.com
2. Import this GitHub repository
3. Select Next.js as the framework (auto-detected)
4. Add environment variables:
   - `AUTH0_DOMAIN` = `dev-t0pa1ah6r1n2wc4a.us.auth0.com`
   - `AUTH0_CLIENT_ID` = `Q7IpCDbQGniIiqT7V2qmHXFf2ZBiEvSe`
   - `GEMINI_API_KEY` = (your key)
   - `DATABASE_URL` = (your PostgreSQL URL)
   - `AWS_ACCESS_KEY_ID` = (your key)
   - `AWS_SECRET_ACCESS_KEY` = (your key)
   - `AWS_S3_BUCKET` = `plothole-manuscripts`
   - `AWS_REGION` = `us-west-2`

### Step 2: Deploy
- Click "Deploy"
- Vercel builds and deploys automatically
- App accessible at `https://your-app.vercel.app`

### Step 3: Update Auth0 Callback URLs
In Auth0 Dashboard → Application Settings:
- **Allowed Callback URLs:** `https://your-app.vercel.app`
- **Allowed Logout URLs:** `https://your-app.vercel.app`
- **Allowed Web Origins:** `https://your-app.vercel.app`

## Incremental Route Migration

### Phase 1: Deploy Skeleton (Current)
✅ Frontend app with Auth0
⚠️ API routes stubbed/non-functional

### Phase 2: Core Database Routes (Next)
- [ ] /api/projects/* (CRUD)
- [ ] /api/notes/* (CRUD)
- [ ] /api/globals/* (CRUD)

### Phase 3: Complex Routes (Then)
- [ ] File uploads (need formidable)
- [ ] Git operations (need sidecar)
- [ ] Email operations (need Resend)

### Phase 4: Final Cleanup
- Remove server.ts
- Close Express instance
- Delete Express dependencies

## Benefits of This Approach
1. **Deploy NOW** - Don't wait for full migration
2. **Incremental** - Add routes one at a time
3. **Safe** - Git backup available, easy rollback
4. **Scalable** - Serverless scales better than Express
5. **Cost** - Vercel free tier is generous

## Limitations During Migration
- File uploads won't work (Routes 1-5)
- Git commands won't work (Routes 7-11)
- Email backup won't work (Routes related to Resend)

These can be temporarily disabled or show "coming soon" placeholders.

## Files to Keep/Remove

### Keep
- All in `app/` (Next.js app)
- All in `src/` (React components, services, utils)
- `public/` (static files)
- `.env.local` (environment variables)

### Remove Eventually
- `server.ts` (after all routes migrated)
- Express dependencies (after migration)

### New
- `next.config.ts`
- `app/layout.tsx`
- `app/page.tsx`
- `app/api/*/route.ts` (new API routes)

## Troubleshooting

### Build fails on Vercel
- Check for Node.js version compatibility
- Verify all environment variables are set
- Look at Vercel deployment logs

### Auth0 redirect fails
- Verify callback URLs in Auth0 Dashboard match Vercel domain
- Check NEXT_PUBLIC_AUTH0_* variables are set

### Database connection fails
- Verify DATABASE_URL is correct
- Check database allows connections from Vercel IPs

## Next Steps
1. Deploy to Vercel (this foundation works)
2. Test Auth0 login/logout flow
3. Start migrating routes using `ROUTES_MIGRATION_MAP.md`
4. Test each route as you migrate
5. Remove Express once all routes are done
