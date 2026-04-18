# Decap CMS Integration Guide

## Overview
Decap CMS (formerly Netlify CMS) is now integrated into Plothole as an alternative headless CMS for managing structured world-building metadata. Like Keystatic, it stores data in Git-friendly YAML files in the `.decap/` directory.

## Key Differences: Keystatic vs Decap CMS

| Feature | Keystatic | Decap CMS |
|---------|-----------|-----------|
| **UI Style** | Modern, inline editing | Card-based, modal editing |
| **Learning Curve** | Steeper (TypeScript config) | Gentler (YAML config) |
| **Authentication** | Built-in | git-gateway (GitHub API required) |
| **Local Dev** | Works out of box | Requires local auth setup |
| **Deployment** | Anywhere | GitHub/Netlify optimized |

## Accessing Decap CMS Admin

### Production (with GitHub OAuth)
```
https://your-domain.com/admin
```
Uses `git-gateway` backend - requires GitHub personal access token.

### Local Development
For local development without authentication:
1. Edit `public/admin/config.yml`
2. Change `backend.name` to `local-git`
3. Restart dev server
4. Access at `http://localhost:3000/admin`

## Collections

Same 6 collections as Keystatic:
- **Characters** - Full character profiles with tier, motivation, conflict
- **Locations** - World locations with climate, culture, inhabitants
- **Items & Artifacts** - Magical items, weapons, relics
- **Events & Timeline** - Plot events and timeline moments
- **Lore & Worldbuilding** - Magic systems, religion, history
- **Relationships** - Entity relationships (parent/child, enemy, ally, etc)

## File Structure

```
.decap/
├── characters/
│   ├── aragorn.yaml
│   └── gandalf.yaml
├── locations/
│   ├── rivendell.yaml
│   └── mordor.yaml
├── items/
├── events/
├── lore/
└── relationships/
```

## Using with Plothole

### Load Decap Entities into Project
```typescript
import { syncDecapToProject } from '@/services/decap-sync';

const updatedProject = await syncDecapToProject(projectData);
// Now updatedProject.entities contains all Decap CMS data
```

### Save Changes Back to Decap
```typescript
import { syncProjectToDecap } from '@/services/decap-sync';

await syncProjectToDecap(projectData);
```

### Initialize Directories
```typescript
import { initializeDecapDirs } from '@/services/decap-sync';

initializeDecapDirs();
```

## Local Development Setup

### With Local Git Backend (No Auth Needed)
1. Edit `public/admin/config.yml`:
```yaml
backend:
  name: local-git  # Changed from git-gateway
  branch: main
```

2. Restart dev server
3. Visit `http://localhost:3000/admin`
4. Changes save to `.decap/` files immediately

### With GitHub Authentication (Production)
1. Create GitHub OAuth app at https://github.com/settings/developers
2. Set Authorization callback URL to `https://your-domain.com/admin`
3. Add GitHub credentials to environment:
```env
DECAP_GITHUB_CLIENT_ID=your-client-id
DECAP_GITHUB_CLIENT_SECRET=your-secret
```
4. Users can authenticate with GitHub account

## Git Integration

All Decap CMS data is stored in `.decap/` (tracked in Git):

```bash
# See what changed
git status

# View diffs
git diff .decap/characters/aragorn.yaml

# Commit changes
git add .decap/
git commit -m "Update character profiles"
```

## Features

✓ **Git-First**: Everything is YAML in your repo  
✓ **No Server Needed**: Pure static site compatible  
✓ **Markdown Support**: Rich text editing for descriptions  
✓ **Media Library**: Built-in image upload support  
✓ **Offline Friendly**: Local git backend for development  
✓ **GitHub Native**: Uses GitHub API for authentication  

## Workflow Example

### Create a Character in Decap
1. Go to `/admin`
2. Click "Characters" collection
3. Click "New Characters"
4. Fill form:
   - ID: `aragorn`
   - Name: `Aragorn`
   - Tier: `1`
   - Role: `Ranger King`
5. Click "Publish"
6. Check `.decap/characters/aragorn.yaml` - file created!

### Update Project with New Data
```typescript
// In your project loading logic
const project = await getProject(projectId);
const updated = await syncDecapToProject(project);
// updated.entities now includes Aragorn from Decap
```

## Comparison: When to Use Keystatic vs Decap

### Use **Keystatic** if:
- You want modern, inline editing experience
- You prefer TypeScript configuration
- You want fast local development
- You don't need GitHub integration

### Use **Decap CMS** if:
- You want simpler YAML configuration
- You want built-in GitHub authentication
- You're deploying to Netlify
- You prefer traditional CMS UI

## Troubleshooting

### Collections not showing
- Check `public/admin/config.yml` syntax
- Ensure `.decap/characters/` directory exists
- Check browser console for errors

### Auth not working
- Verify GitHub OAuth app settings
- Check `DECAP_GITHUB_CLIENT_ID` environment variable
- Clear browser cache and cookies

### Files not syncing
- Check that `syncDecapToProject()` is being called
- Verify `.decap/` directory exists
- Check server logs for YAML parsing errors

### Permission errors
- Ensure your user has write access to repo
- Check GitHub token permissions
- Verify git SSH/HTTPS is configured

## Migration from Keystatic to Decap

Both use the same YAML format in different directories. To migrate:

```bash
# Copy Keystatic data to Decap
cp -r .keystatic/characters/* .decap/characters/
cp -r .keystatic/locations/* .decap/locations/
# ... etc for other collections
```

Data is compatible - only directory names differ!
