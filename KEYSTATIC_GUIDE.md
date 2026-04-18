# Keystatic Integration Guide

## Overview
Keystatic is now integrated into Plothole as a local-first CMS for managing structured world-building metadata (characters, locations, items, events, and lore). All data is stored in Git-friendly YAML files in the `.keystatic/` directory.

## Accessing the Admin Interface

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the admin panel**:
   ```
   http://localhost:3000/admin
   ```

3. **Create and manage entities** using the intuitive Keystatic UI

## Collections

### Characters
Manage protagonist, antagonist, and supporting characters with full schema support:
- **Name, Species, Tier** (Core/Supporting/Background)
- **Motivation, Conflict** (Tier 1 details)
- **Traits, Job, Age, Birthplace, Residence** (Tier 2 details)
- **Names** (Given/Family), Gender, Nationality, Affiliations
- **Metadata**: First/Last mention offset, Source (Manual/AI)

### Locations
Manage world locations with geography and society details:
- **Name, Type, Tier**
- **Description, Climate, Population, Government, Culture**
- **Inhabitants** (list of character IDs)
- **Geography**: Latitude, Longitude

### Items & Artifacts
Manage magical items, weapons, and artifacts:
- **Name, Type, Tier**
- **Origin, Powers/Abilities, Current Owner, Current Location**

### Events & Timeline
Manage timeline events and plot points:
- **Name, Type, Tier**
- **Date Range** (Start/End date, Duration)
- **Location, Attendees** (list of character IDs)
- **Consequences/Impact**

### Lore & Worldbuilding
Manage magic systems, religion, history, and concepts:
- **Name, Category** (Magic/Religion/History/etc)
- **Tier**
- **Origin/History, Significance, Related Concepts**

### Relationships
Define relationships between entities:
- **Entity A ↔ Entity B**
- **Relationship Type** (e.g., "parent of", "married to", "enemy of")
- **Description, Bidirectional flag**

## Data Sync

Keystatic stores entities as YAML files in `.keystatic/` and automatically syncs with `ProjectData.entities`:

```
.keystatic/
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

### Load Keystatic Entities into Your Project
The sync service automatically loads Keystatic entities when the project loads:

```typescript
import { syncKestaticToProject } from '@/services/keystatic-sync';

const updatedProject = await syncKestaticToProject(projectData);
```

### Save Project Changes Back to Keystatic
When you save a project, sync entities back to YAML:

```typescript
import { syncProjectToKeystatic } from '@/services/keystatic-sync';

await syncProjectToKeystatic(projectData);
```

### Initialize Keystatic Directories
On first run, initialize the directory structure:

```typescript
import { initializeKestaticDirs } from '@/services/keystatic-sync';

initializeKestaticDirs();
```

## Git Integration

All Keystatic data is stored in `.keystatic/` (not ignored by default). You can:
- **Commit changes** to version control
- **Merge conflicts** by editing YAML directly
- **Diff revisions** to track who changed what and when

### Example Workflow
```bash
# Edit characters in Keystatic UI
# Keystatic saves to .keystatic/characters/*.yaml

git status
# On branch main
# Changes not staged for commit:
#   modified:   .keystatic/characters/aragorn.yaml
#   new file:   .keystatic/characters/legolas.yaml

git diff .keystatic/characters/aragorn.yaml
# Shows what changed in the character

git add .keystatic/
git commit -m "Update character profiles"
```

## Features

✓ **Schema Validation**: All fields are validated by schema  
✓ **Local-First**: Data stored locally, works offline  
✓ **Git-Friendly**: YAML format, easy to diff and merge  
✓ **Relationship Management**: Define how entities relate to each other  
✓ **Tier Classification**: Organize entities by importance (Core/Supporting/Background)  
✓ **Full Text Support**: Rich descriptions, narratives, worldbuilding details  
✓ **Bidirectional Sync**: Update in Keystatic or in your app, changes sync both ways  

## Limitations & Next Steps

- Images currently not supported in Keystatic (store URLs in description)
- Relationships are managed separately from entities (future enhancement)
- No AI generation directly in Keystatic (use the app for that, then export to Keystatic)

## Troubleshooting

### Collections not showing in admin
- Ensure `.keystatic/` directories exist (run `initializeKestaticDirs()`)
- Check browser console for errors
- Restart dev server

### Data not syncing
- Check that `keystatic-sync.ts` is being imported
- Verify YAML files are valid (check `.keystatic/*/` files)
- Check server logs for parsing errors

### Merge conflicts
Edit the YAML files directly and resolve conflicts as normal Git conflicts.
