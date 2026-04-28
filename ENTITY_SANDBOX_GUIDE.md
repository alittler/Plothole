# Entity Sandbox - Complete Guide

## Overview

The **Entity Sandbox** is a centralized workspace for managing and previewing five distinct categories of "Data Cards":

1. **Characters** - Character profiles with tier classification, traits, and goals
2. **Atlas** - Locations with coordinates, climate, and sensory descriptions
3. **History** - Timeline events with participants and consequences
4. **Codex** - Species/objects with classification, behavior, and mechanics
5. **Research** - Lore/magic/culture entries with rules and sources

## Architecture

### File Structure

```
src/components/Views/
├── EntitySandboxView.tsx                    # Main view component
└── EntitySandbox/
    ├── SandboxSidebar.tsx                   # Filter and navigation sidebar
    ├── SandboxCard.tsx                      # Card wrapper with controls
    ├── CardTypeDisplay.tsx                  # Type-specific display/edit UI
    ├── NoteModule.tsx                       # Universal note system
    └── JSONPreview.tsx                      # JSON export preview
```

### Data Model

```typescript
interface SandboxCard {
  id: string;
  type: CardType;                            // 'Character' | 'Atlas' | 'History' | 'Codex' | 'Research'
  data: SandboxCardData;                     // Type-specific data
  notes: SandboxNote[];                      // Universal notes
  createdAt: number;
  updatedAt: number;
}

interface SandboxNote {
  id: string;
  content: string;
  includeInPrompt: boolean;                  // Toggle for AI prompt inclusion
  createdAt: number;
}
```

## Card Types & Schemas

### Character Card
```typescript
interface SandboxCharacter {
  name: string;
  role: string;
  tier: 1 | 2 | 3;                          // Tier 1 (Core), Tier 2 (Supporting), Tier 3 (Background)
  primaryTrait: string;
  motivation: string;
  goals: string;
}
```

### Atlas Card
```typescript
interface SandboxAtlas {
  name: string;
  type: string;
  x: number;                                 // X coordinate
  y: number;                                 // Y coordinate
  parentId: string;                          // Link to parent location
  climate: string;
  sensoryNotes: string;
}
```

### History Card
```typescript
interface SandboxHistory {
  eventName: string;
  timestamp: string;                         // e.g., "Year 42, Spring"
  participants: string[];                    // Array of character IDs
  consequences: string;
}
```

### Codex Card
```typescript
interface SandboxCodex {
  name: string;
  classification: string;
  behavior: string;
  mechanics: string;
}
```

### Research Card
```typescript
interface SandboxResearch {
  category: 'Lore' | 'Magic' | 'Culture';
  rules: string;
  source: string;
}
```

## Features

### 1. Category Filtering
- **Sidebar Navigation**: Filter by card type or view all
- **Statistics**: Real-time count of cards per category
- **Quick Add Buttons**: Create new cards directly from sidebar

### 2. Search & Discovery
- **Full-text Search**: Searches card data and notes
- **Filter Combinations**: Browse by type and search simultaneously

### 3. Card Management
- **Edit Mode**: Inline editing with save/cancel
- **Linking**: Characters can be linked to Atlas locations and History events
- **Delete**: Remove cards with confirmation

### 4. Universal Note System
- **Add Notes**: Click "+" to add notes to any card
- **Prompt Toggle**: Each note has an "Include in AI Prompt" toggle (Eye/EyeOff icon)
- **Note Overflow**: Shows "See More" when >3 notes to keep UI clean
- **Note Management**: Edit, delete, or toggle notes without editing the card

### 5. JSON Preview
- **Toggle View**: Click the Code icon to flip to JSON view
- **Copy to Clipboard**: Export raw JSON for AI processing
- **Metadata**: Timestamps and note information included
- **Ready for Prompts**: JSON is formatted for direct LLM input

### 6. Styling & Aesthetics
- **Writer's OS Aesthetic**: Dark mode with high contrast
- **Type-Specific Colors**:
  - Characters: Rose (🔴)
  - Atlas: Emerald (🟢)
  - History: Amber (🟡)
  - Codex: Violet (🟣)
  - Research: Cyan (🔵)
- **Monospace JSON**: Code font for technical data display
- **Lucide Icons**: Modern, minimalist icons throughout

## Usage Workflow

### Creating a Card

1. **Open Entity Sandbox** from sidebar (Story section)
2. **Choose Type**: Click "Quick Add" button in sidebar or filter by type
3. **Add Data**: Fill in type-specific fields in edit mode
4. **Save**: Click green checkmark to save

### Linking Entities

**Characters ↔ Atlas**:
```
1. Create a Character card
2. Edit the character
3. Select "Parent Location" (dropdown shows all Atlas cards)
4. Save
```

**Characters ↔ History**:
```
1. Create a History event
2. Edit the event
3. Check "Participants" (shows all Character cards)
4. Save
```

### Adding Notes

1. **Open any card**
2. **Click "+" button** in Notes section
3. **Type your note** in the textarea
4. **Save Note** to add
5. **Toggle "Include in Prompt"** for AI-relevant notes

### Exporting for AI

1. **Click Code icon** on any card to view JSON
2. **Click "Copy"** to copy JSON to clipboard
3. **Paste into prompt** or save to file
4. Notes marked "Include in Prompt" are highlighted

### Saving to Project

1. **Make all edits** in Entity Sandbox
2. **Click "Save to Project"** button (top-right)
3. **Data persists** in ProjectData.sandboxCards

## Color Scheme & Icons

| Type | Icon | Color | Hex |
|------|------|-------|-----|
| Characters | Users | Rose | #fb7185 |
| Atlas | Map | Emerald | #10b981 |
| History | Calendar | Amber | #f59e0b |
| Codex | BookOpen | Violet | #a855f7 |
| Research | Lightbulb | Cyan | #06b6d4 |

## Implementation Details

### State Management
- **Local State**: Cards stored in component state
- **Persistence**: Save to ProjectData.sandboxCards on user action
- **Auto-save**: Updated on "Save to Project" button click

### Relational Linking
- **Atlas Dropdowns**: Show available locations for character parent
- **Participant Checkboxes**: Multi-select for history events
- **ID-based References**: All links stored as IDs for data integrity

### Note Overflow Handling
```typescript
- Show first 3 notes by default
- "See all N notes" button appears if count > 3
- Click to expand/collapse all notes at once
- Collapse indicator shows hidden count
```

### JSON Export Structure
```json
{
  "id": "card-uuid",
  "type": "Character",
  "data": { /* type-specific fields */ },
  "notes": [
    {
      "id": "note-uuid",
      "content": "Note text",
      "includeInPrompt": true
    }
  ],
  "metadata": {
    "createdAt": "2026-04-24T...",
    "updatedAt": "2026-04-24T..."
  }
}
```

## Integration with Project Data

### Type Definition
```typescript
// Added to ProjectData interface
sandboxCards?: any[];
```

### View Navigation
```typescript
// Added to ViewType enum
ENTITY_SANDBOX = 'EntitySandbox'

// Added to App.tsx switch statement
case ViewType.ENTITY_SANDBOX:
  return projectData ? <EntitySandboxView {...} /> : <LoadingMessage />;
```

### Sidebar Integration
- Added to "Story" section in navigation
- Shows next to Codex and Research
- Project-only view (requires active project)

## Performance Optimizations

### Memoization
- Filtered cards computed with `useMemo`
- Prevents unnecessary re-renders during search/filter

### Virtualization Ready
- Grid layout is responsive (1 column mobile, 2-3 columns desktop)
- Scrollable container with custom scrollbar

### Event Handling
- Debounced search input
- Efficient state updates

## Accessibility Features

- **Tab Navigation**: All controls keyboard accessible
- **Toggle States**: Clear visual feedback (Eye/EyeOff icons)
- **Semantic HTML**: Proper button and input elements
- **Color + Icons**: Not relying on color alone for meaning
- **Font Sizes**: Readable text hierarchy (12px labels → 18px titles)

## Future Enhancements

### Potential Features
- [ ] Bulk export of all cards to JSON
- [ ] Import cards from JSON
- [ ] Card templates with default values
- [ ] Advanced filtering (by tier, date range, etc.)
- [ ] Card versioning & change history
- [ ] Collaborative editing indicators
- [ ] Card relationships visualization (graph view)
- [ ] Smart linking suggestions

### API Integrations
- [ ] Direct Gemini API calls for note generation
- [ ] Prompt engineering presets
- [ ] AI-powered relationship detection

## Common Tasks

### Create a Character & Location
```
1. Add Atlas card: "Winterhold"
2. Add Character card: "Aragorn"
3. Edit Aragorn → Select "Winterhold" as parent location
4. Add note: "King of Arnor" (toggle Include in Prompt)
5. Click Code icon to review JSON
6. Save to Project
```

### Build an Event Timeline
```
1. Add multiple Character cards
2. Add History card: "Battle of Five Armies"
3. Edit event → Select all participating characters
4. Add notes about consequences
5. Export as JSON for LLM analysis
```

### Create Codex Entries
```
1. Add Codex card: "Dragons"
2. Fill classification, behavior, mechanics
3. Add multiple notes with lore details
4. Export for worldbuilding document
```

## Troubleshooting

### Cards Not Saving
- Verify "Save to Project" button was clicked
- Check browser console for errors
- Ensure project is active

### Linking Not Working
- Related cards must exist first
- Dropdown only shows cards of correct type
- Refresh page if dropdowns appear empty

### JSON Preview Empty
- Switch to JSON view by clicking Code icon
- All card data should be visible
- Copy button may take a moment on large datasets

## Code Examples

### Accessing Sandbox Cards in App
```typescript
const sandboxCards = projectData?.sandboxCards || [];
const characters = sandboxCards.filter(c => c.type === 'Character');
```

### Programmatic Card Creation
```typescript
const newCard: SandboxCard = {
  id: generateId(),
  type: 'Character',
  data: {
    name: 'New Character',
    role: 'Protagonist',
    tier: 1,
    primaryTrait: 'Brave',
    motivation: 'Seek truth',
    goals: 'Save the kingdom'
  },
  notes: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
};
```

### Export All Cards to JSON
```typescript
const exportAllCards = () => {
  const json = JSON.stringify(sandboxCards, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  // Download or send to API
};
```

---

**Created**: April 24, 2026  
**Component Version**: 1.0  
**Status**: Production Ready
