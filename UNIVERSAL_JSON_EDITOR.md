# Universal JSON Editor System

## Overview

Plothole now features a **schema-agnostic JSON editing interface** that allows direct manipulation of any JSON data (Characters, Locations, Timeline Events, etc.) via a global, reusable modal. This eliminates the need for rigid CMS dashboards or custom input forms for every data type.

## Core Architecture

### 1. DynamicEditModal Component
**Location:** `src/components/ui/DynamicEditModal.tsx`

The main UI component that renders an edit modal for any JSON data.

**Features:**
- Dynamically generates editable form fields from JSON structure
- Supports nested objects and arrays (max depth 2 levels)
- Displays raw JSON view as collapsible section
- Real-time type coercion (converts strings to numbers, booleans, etc.)
- Validation feedback and error messages
- Save/Reset/Cancel actions with loading states

**Props:**
```typescript
interface DynamicEditModalProps {
  isOpen: boolean;
  data: any;                 // JSON object to edit
  entityType: string;        // e.g., 'character', 'location'
  entityId: string;          // e.g., 'char-123'
  title?: string;            // Modal heading
  onClose: () => void;       // Callback on modal close
  onSave?: (data: any) => Promise<void>;  // Optional custom save handler
}
```

### 2. EditModalContext
**Location:** `src/contexts/EditModalContext.tsx`

React Context providing global state management for the edit modal.

**Exports:**
- `EditModalProvider`: Context provider component
- `useEditModal()`: Hook to access modal state and actions

**API:**
```typescript
const { openEditor, closeEditor, isOpen, modalState } = useEditModal();

// Open modal for editing
openEditor(
  data: any,              // JSON data to edit
  entityType: string,     // Entity type identifier
  entityId: string,       // Entity ID
  title?: string          // Optional custom title
);

// Close modal
closeEditor();
```

### 3. EditButton Component
**Location:** `src/components/ui/EditButton.tsx`

Reusable button component that triggers the edit modal.

**Props:**
```typescript
interface EditButtonProps {
  data: any;                    // JSON data to edit
  entityType: string;           // Entity type
  entityId: string;             // Entity ID
  label?: string;               // Button text (default: "Edit")
  className?: string;           // Additional CSS classes
  buttonSize?: 'sm' | 'md' | 'lg';  // Button size
  variant?: 'primary' | 'secondary' | 'ghost';  // Button style
}
```

**Usage:**
```tsx
import { EditButton } from '@/components/ui/EditButton';

<EditButton
  data={characterData}
  entityType="character"
  entityId={character.id}
  label="Edit Character"
  buttonSize="md"
  variant="primary"
/>
```

### 4. Save JSON API Route
**Location:** `app/api/save-json/route.ts`

Backend endpoint for persisting edited JSON data to the filesystem.

**Endpoint:** `POST /api/save-json`

**Request Body:**
```typescript
{
  entityType: string;   // e.g., 'character'
  entityId: string;     // e.g., 'char-123'
  data: any;           // Modified JSON object
  format?: 'yaml' | 'json';  // Output format (default: 'yaml')
}
```

**Response:**
```typescript
{
  success: true;
  message: string;
  path: string;        // File path where saved
  data: any;          // The saved data
}
```

**Error Handling:**
- 400: Missing required fields or path traversal detected
- 500: File system write error

**Security:**
- Path traversal prevention: Validates entityId for `..` and `/`
- Directory containment: Ensures file is written within collection directory
- File creation: Automatically creates directories if they don't exist

### 5. Dynamic Form Utilities
**Location:** `src/utils/dynamicFormUtils.ts`

Helper functions for dynamic form generation and JSON manipulation.

**Key Functions:**

#### `getValueType(value: any): string`
Detects the data type of a value, including special types like `date`, `color`, `textarea`.

#### `flattenJSON(data: any, maxDepth?: number): Array`
Flattens nested JSON for table/list display, respecting depth limits.

#### `setNestedValue(obj: any, path: string, value: any): any`
Sets a value at a dot-notation path (e.g., `"character.stats.health"`).

#### `getNestedValue(obj: any, path: string): any`
Gets a value at a dot-notation path.

#### `coerceValue(value: string, targetType: string): any`
Converts string input to the appropriate type (number, boolean, date, etc.).

#### `validateJSON(data: any): { valid: boolean; errors: string[] }`
Basic JSON validation (circular reference detection, type checking).

## Workflow

### User Workflow
1. **Identify**: Locate any item within the application
2. **Trigger**: Click the Edit button on the item
3. **Modify**: Adjust parameters in the modal without leaving the current view
4. **Sync**: Click Save to update the JSON file and close the modal

### Developer Workflow
1. **Add Edit Button** to any component:
   ```tsx
   <EditButton
     data={entity}
     entityType="entity-type"
     entityId={entity.id}
   />
   ```

2. **Ensure provider is set up** (already done in App.tsx)

3. **Save happens automatically** via `/api/save-json`

## Storage

### File Structure
Data is stored in `.keystatic/{entityType}/{entityId}.yaml`

**Examples:**
- `.keystatic/character/char-123.yaml`
- `.keystatic/location/loc-456.yaml`
- `.keystatic/timeline/event-789.yaml`

### Format
- Default: YAML with proper indentation (2-space)
- Optional: JSON if format parameter is provided
- Atomic writes: Files are written completely or not at all

## Integration Examples

### Example 1: Character Card with Edit Button
```tsx
import { EditButton } from '@/components/ui/EditButton';

export const CharacterCard = ({ character }) => {
  return (
    <div className="card">
      <h3>{character.name}</h3>
      <p>{character.description}</p>
      
      <EditButton
        data={character}
        entityType="character"
        entityId={character.id}
        label="Edit"
        variant="ghost"
        buttonSize="sm"
      />
    </div>
  );
};
```

### Example 2: Custom Save Handler
```tsx
import { useEditModal } from '@/contexts/EditModalContext';
import { DynamicEditModal } from '@/components/ui/DynamicEditModal';

export const MyComponent = () => {
  const { modalState, closeEditor } = useEditModal();
  
  const handleCustomSave = async (data: any) => {
    // Custom save logic
    await myCustomSaveFunction(data);
    closeEditor();
  };
  
  return (
    <DynamicEditModal
      isOpen={modalState.isOpen}
      data={modalState.data}
      entityType={modalState.entityType}
      entityId={modalState.entityId}
      title={modalState.title}
      onClose={closeEditor}
      onSave={handleCustomSave}
    />
  );
};
```

### Example 3: Programmatic Modal Opening
```tsx
import { useEditModal } from '@/contexts/EditModalContext';

export const MyComponent = () => {
  const { openEditor } = useEditModal();
  
  const handleEditClick = () => {
    openEditor(
      myJsonData,
      'entity-type',
      'entity-id',
      'Custom Edit Title'
    );
  };
  
  return <button onClick={handleEditClick}>Edit</button>;
};
```

## Extending the System

### Adding Support for New Entity Types
No additional configuration needed! The system is schema-agnostic:

1. Import `EditButton` or use `useEditModal` hook
2. Pass your entity data, type, and ID
3. The modal automatically generates appropriate form fields
4. Data persists to `.keystatic/{entityType}/` directory

### Customizing Field Editing
For special field types, extend `getValueType()` in `dynamicFormUtils.ts`:

```typescript
export function getValueType(value: any): string {
  // Add custom type detection
  if (value && typeof value === 'object' && 'coordinates' in value) {
    return 'geolocation';
  }
  // ... rest of detection logic
}
```

Then handle the new type in `DynamicEditModal`:
```tsx
{field.type === 'geolocation' && (
  <GeolocationInput value={field.value} onChange={handleChange} />
)}
```

### Custom Save Handlers
Pass `onSave` prop to `DynamicEditModal` for custom persistence:

```tsx
<DynamicEditModal
  // ... other props
  onSave={async (data) => {
    // Custom logic: database, IndexedDB, cloud storage, etc.
    await customSave(data);
  }}
/>
```

## Technical Benefits

✅ **Reduced Overhead**: One interface for all data types  
✅ **Consistency**: Unified editing experience across modules  
✅ **Speed**: Rapid implementation for new features  
✅ **Flexibility**: Works with any JSON structure  
✅ **Security**: Path traversal prevention, validated writes  
✅ **Type Safety**: Full TypeScript support  
✅ **Extensibility**: Easily customize for special cases  

## Known Limitations

- **Depth Limit**: Nested data limited to 2 levels in form view (raw JSON shows everything)
- **Array Editing**: Arrays shown as read-only "[N items]" in form view, but visible in raw JSON
- **Type Inference**: Simple type detection; may not recognize domain-specific types
- **Circular References**: Detected and rejected during validation
- **File Format**: Always writes to `.keystatic/` directory; doesn't sync back to project data automatically (requires manual refresh)

## Future Enhancements

- [ ] Array element editing UI
- [ ] Custom field validators
- [ ] Undo/redo functionality
- [ ] Change history tracking
- [ ] Diff preview before save
- [ ] Search/filter in nested data
- [ ] Auto-sync to project data on save
- [ ] Rich text editor for textarea fields
- [ ] Date picker for date fields
- [ ] Drag-and-drop array reordering
