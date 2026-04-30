/**
 * Dynamic form generation utilities for JSON editing
 * Provides type detection, input generation, and nested data handling
 */

export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export interface JSONArray extends Array<JSONValue> {}

/**
 * Detects the data type of a JSON value
 */
export function getValueType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    // Detect special string types
    if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'date';
    if (value.match(/^#[0-9A-F]{6}$/i)) return 'color';
    if (value.length > 100) return 'textarea';
    return 'string';
  }
  if (typeof value === 'object') return 'object';
  return 'unknown';
}

/**
 * Generates a list of editable fields from a JSON object
 * Includes path tracking for nested updates
 */
export interface EditableField {
  key: string;
  path: string; // dot-notation path (e.g., "character.stats.health")
  value: any;
  type: string;
  isArray: boolean;
  isObject: boolean;
  depth: number;
  arrayLength?: number;
}

export function extractEditableFields(
  data: any,
  maxDepth: number = 3,
  currentDepth: number = 0,
  parentPath: string = ''
): EditableField[] {
  const fields: EditableField[] = [];

  if (currentDepth > maxDepth) return fields;

  if (typeof data !== 'object' || data === null) {
    return fields;
  }

  if (Array.isArray(data)) {
    // For arrays, include the array itself as editable
    return [{
      key: parentPath.split('.').pop() || 'root',
      path: parentPath,
      value: data,
      type: 'array',
      isArray: true,
      isObject: false,
      depth: currentDepth,
      arrayLength: data.length,
    }];
  }

  for (const [key, value] of Object.entries(data)) {
    const path = parentPath ? `${parentPath}.${key}` : key;
    const type = getValueType(value);
    const isArray = Array.isArray(value);
    const isObject = typeof value === 'object' && value !== null && !isArray;

    const field: EditableField = {
      key,
      path,
      value,
      type,
      isArray,
      isObject,
      depth: currentDepth,
    };

    if (isArray) {
      field.arrayLength = value.length;
    }

    fields.push(field);

    // Recursively extract fields from nested objects/arrays
    if (isObject && currentDepth < maxDepth) {
      const nestedFields = extractEditableFields(
        value,
        maxDepth,
        currentDepth + 1,
        path
      );
      fields.push(...nestedFields);
    }
  }

  return fields;
}

/**
 * Gets a nested value from an object using dot-notation path
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Sets a nested value in an object using dot-notation path
 */
export function setNestedValue(obj: any, path: string, value: any): any {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (!lastKey) return obj;

  let current = obj;
  for (const key of keys) {
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[lastKey] = value;
  return obj;
}

/**
 * Converts a string value to the appropriate type
 */
export function coerceValue(value: string, targetType: string): any {
  if (!value && targetType !== 'string') return null;

  switch (targetType) {
    case 'number':
      return parseFloat(value) || 0;
    case 'boolean':
      return value.toLowerCase() === 'true' || value === '1';
    case 'date':
      return new Date(value).toISOString().split('T')[0];
    case 'color':
      return value.startsWith('#') ? value : `#${value}`;
    default:
      return value;
  }
}

/**
 * Flattens nested data for table view
 */
export function flattenJSON(
  data: any,
  maxDepth: number = 2,
  currentDepth: number = 0,
  parentPath: string = '',
  result: Array<{ key: string; path: string; value: string; depth: number }> = []
): Array<{ key: string; path: string; value: string; depth: number }> {
  if (currentDepth > maxDepth) return result;

  if (typeof data !== 'object' || data === null) {
    return result;
  }

  for (const [key, value] of Object.entries(data)) {
    const path = parentPath ? `${parentPath}.${key}` : key;
    const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);

    if (isObject && currentDepth < maxDepth) {
      flattenJSON(value, maxDepth, currentDepth + 1, path, result);
    } else {
      result.push({
        key,
        path,
        value: Array.isArray(value) ? `[${value.length} items]` : String(value),
        depth: currentDepth,
      });
    }
  }

  return result;
}

/**
 * Validates JSON data (basic validation)
 */
export function validateJSON(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for circular references
  try {
    JSON.stringify(data);
  } catch (e) {
    errors.push('Data contains circular references');
  }

  // Check required fields
  if (typeof data !== 'object') {
    errors.push('Data must be an object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
