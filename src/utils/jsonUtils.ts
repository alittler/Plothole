/**
 * Safely parses a JSON string, stripping markdown blocks if present.
 * Returns null if parsing fails instead of throwing.
 */
export const safeJsonParse = <T = any>(str: string | null | undefined): T | null => {
  if (!str) return null;
  
  let content = str.trim();
  
  // Strip Markdown JSON blocks if present
  if (content.includes('```')) {
    content = content.replace(/```json\n?/, '').replace(/```\n?/, '').trim();
  }
  
  try {
    return JSON.parse(content) as T;
  } catch (e) {
    console.warn('[JSON Utils] Failed to parse JSON:', e, 'Raw content snippet:', content.substring(0, 100));
    return null;
  }
};

/**
 * Safely parses JSON from a Response object.
 * Checks response.ok first, logs the status and response text on error, and returns null if parsing fails.
 */
export const safeResponseJson = async <T = any>(response: Response): Promise<T | null> => {
  try {
    if (!response.ok) {
      const text = await response.text();
      console.warn(`[Response JSON] HTTP ${response.status}: ${text.substring(0, 200)}`);
      return null;
    }
    
    const text = await response.text();
    if (!text) {
      console.warn('[Response JSON] Empty response body');
      return null;
    }
    
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn('[Response JSON] Failed to parse response:', e);
    return null;
  }
};
