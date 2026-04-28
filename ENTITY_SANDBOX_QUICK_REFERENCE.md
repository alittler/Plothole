# Entity Sandbox - Quick Reference

## 🚀 Quick Start

### Open Entity Sandbox
- **Sidebar** → Story → **Entity Sandbox** (💡 icon)
- Or press keyboard shortcut (if configured)

### Create a Card (30 seconds)
1. Click **Quick Add** button in sidebar for desired type
2. Fill in the fields in **Edit Mode** (auto-entered)
3. Click **✓** (green checkmark) to save
4. Click **Save to Project** (top-right button)

---

## 📊 Card Types At A Glance

### 👤 Characters
```
Fields: Name, Role, Tier (1-3), Primary Trait, Motivation, Goals
Color: Rose/Red 🔴
Use: Character profiles, archetypes, NPCs
```

### 🗺️ Atlas (Locations)
```
Fields: Name, Type, Coordinates (X/Y), Parent Location, Climate, Sensory Notes
Color: Emerald/Green 🟢
Use: Worldbuilding, geography, settlements
Linking: Characters can link here as "Home Location"
```

### 📅 History (Events)
```
Fields: Event Name, Timestamp, Participants, Consequences
Color: Amber/Gold 🟡
Use: Timeline, plot events, character moments
Linking: Select character participants from dropdown
```

### 📖 Codex
```
Fields: Name, Classification, Behavior, Mechanics/Rules
Color: Violet/Purple 🟣
Use: Species, magical items, systems, rules
```

### 💡 Research
```
Fields: Category (Lore/Magic/Culture), Rules/Laws, Source
Color: Cyan/Blue 🔵
Use: Worldbuilding notes, magic systems, cultural info
```

---

## 📝 Notes System

### Add a Note
1. Click **+** button in "Notes" section
2. Type your note
3. Click **Save Note**

### Include in AI Prompt
- Click **Eye 👁️** icon to toggle "Include in Prompt"
- Toggled notes appear in blue badge: "In Prompt"
- Affects JSON export

### View All Notes
- If >3 notes: Click **"See all N notes"**
- Shows/hides extra notes

### Delete Note
- Hover and click **🗑️** (trash icon)

---

## 🔗 Relational Linking

### Link Character to Location
```
1. Open Character card → Click 📝 (edit icon)
2. Scroll to "Parent Location" dropdown
3. Select an Atlas card
4. Click ✓ to save
```

### Link Characters to History Event
```
1. Open History card → Click 📝 (edit icon)
2. Under "Participants", check boxes for each character
3. Click ✓ to save
```

### View Related Cards
```
- Related cards appear in dropdown lists
- Only compatible types show
- Links stored by ID (safe to rename entities)
```

---

## 💾 Exporting & Saving

### Save to Project
- **Button**: Top-right, next to search bar
- **Action**: Persists all cards to ProjectData
- **When**: Click after all edits are done

### Export Single Card as JSON
```
1. Click 🔧 (Code icon) on card
2. View flips to JSON preview
3. Click 📋 (Copy) to copy to clipboard
4. Paste into AI prompt or text editor
```

### JSON Structure Example
```json
{
  "id": "char_abc123",
  "type": "Character",
  "data": {
    "name": "Aragorn",
    "role": "Ranger",
    "tier": 1,
    "primaryTrait": "Stoic",
    "motivation": "Reclaim throne",
    "goals": "Unite the kingdoms"
  },
  "notes": [
    {
      "id": "note_xyz",
      "content": "Hidden heir of Gondor",
      "includeInPrompt": true
    }
  ],
  "metadata": {
    "createdAt": "2026-04-24T...",
    "updatedAt": "2026-04-24T..."
  }
}
```

---

## 🎨 UI Controls

| Icon | Name | Action |
|------|------|--------|
| 📝 | Edit | Enter edit mode for card |
| ✓ | Save | Save changes (edit mode only) |
| ✕ | Cancel | Cancel editing (edit mode only) |
| 🔧 | JSON | Toggle JSON preview view |
| 🗑️ | Delete | Remove card |
| 👁️ | Toggle | Include/exclude note from AI prompt |
| + | Add | Create new note |
| ⋯ | More | See all hidden notes |

---

## ⚡ Pro Tips

### Tip 1: Use Notes for Research
- Add notes with research links
- Toggle "Include in Prompt" to control what goes to AI
- Keep cards clean, details in notes

### Tip 2: Create Hierarchical Locations
- Parent Atlas cards (continents, regions)
- Child Atlas cards (cities, landmarks)
- Link via "Parent ID" field

### Tip 3: Build Events with Context
- Create History card
- Add all participants
- Use notes for "Why did this happen?" and "What changes?"

### Tip 4: Export Before Major Edits
- Copy JSON of important cards
- Save to text file as backup
- Reimport if needed

### Tip 5: Use for AI Brainstorming
- Fill out card basics
- Add notes with questions
- Export as JSON
- Paste into Gemini/Claude for expansion

---

## 🔄 Workflow Example: Create a Scene

```
STEP 1: Create Locations
├─ Add Atlas: "The Tavern"
│  ├─ Type: Building
│  ├─ Climate: Indoor/Warm
│  └─ Sensory Notes: "Smoky, ale-scented, firelight"
└─ Add Atlas: "Winterhold City"
   ├─ Type: City
   ├─ Parent: None (major location)
   └─ Climate: Cold/Snowy

STEP 2: Create Characters
├─ Add Character: "Barkeep Aldus"
│  ├─ Role: NPC
│  ├─ Tier: 3
│  ├─ Primary Trait: Jolly
│  └─ Parent Location: The Tavern
└─ Add Character: "Merchant Thane"
   ├─ Role: Antagonist
   ├─ Tier: 2
   └─ Parent Location: The Tavern

STEP 3: Create Event
├─ Add History: "Tavern Meeting"
│  ├─ Timestamp: Year 5, Evening
│  ├─ Participants: [Barkeep Aldus, Merchant Thane]
│  └─ Consequences: Thane recruits Aldus for heist

STEP 4: Add Research Notes
├─ Add Note: "Barkeep has secret past as thief"
│  └─ Include in Prompt: YES
└─ Add Note: "Merchant wants rare artifact from city vault"
   └─ Include in Prompt: YES

STEP 5: Export & Use
├─ Click Code icon on each card
├─ Copy JSON
└─ Paste into writing prompt for AI
```

---

## ❓ Common Questions

**Q: Can I reorder cards?**  
A: Currently sorted by creation date. Filter/search to organize view.

**Q: Can I bulk import cards?**  
A: Not yet. Manual creation or future enhancement.

**Q: Do notes sync to project automatically?**  
A: Only when you click "Save to Project" button.

**Q: Can I export all cards at once?**  
A: Click each card's JSON view individually, or access `projectData.sandboxCards` via console.

**Q: What happens if I delete a linked card?**  
A: Linking IDs become orphaned (safe). Other cards unaffected.

**Q: Can cards have multiple parent locations?**  
A: Currently one parent per card. Use notes for "also found in..." context.

---

## 🎯 Best Practices

✅ **DO**
- Use clear, descriptive names
- Add notes for ambiguous fields
- Toggle "Include in Prompt" thoughtfully
- Save to project frequently
- Export important cards as JSON backups

❌ **DON'T**
- Leave important info in notes meant to exclude from prompts
- Forget to save to project
- Create duplicate cards (search first!)
- Store sensitive data in sandbox

---

## 📞 Support

- **Issue?** Check browser console for errors
- **Need Help?** Review ENTITY_SANDBOX_GUIDE.md for detailed docs
- **Feature Request?** See "Future Enhancements" section

---

**Version**: 1.0 | **Last Updated**: April 24, 2026
