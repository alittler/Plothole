import Markdoc from '@markdoc/markdoc';
import { config } from './config';

/**
 * Advanced markdown processor using Markdoc
 * Supports custom narrative tags for characters, locations, events, etc.
 */

export interface ParsedMarkdoc {
  ast: any;
  errors: any[];
  content: string;
}

export interface MarkdocRenderOptions {
  validate?: boolean;
  extractMetadata?: boolean;
}

/**
 * Parse markdown content using Markdoc
 */
export function parseMarkdoc(
  content: string,
  options: MarkdocRenderOptions = {}
): ParsedMarkdoc {
  try {
    const ast = Markdoc.parse(content);
    const errors = Markdoc.validate(ast, config);

    if (options.validate && errors.length > 0) {
      console.warn('[Markdoc] Validation errors:', errors);
    }

    return {
      ast,
      errors,
      content,
    };
  } catch (error) {
    console.error('[Markdoc] Parse error:', error);
    return {
      ast: null,
      errors: [error instanceof Error ? error.message : String(error)],
      content,
    };
  }
}

/**
 * Transform Markdoc AST to renderable structure
 */
export function transformMarkdoc(ast: any): any {
  if (!ast) return null;
  return Markdoc.transform(ast, config);
}

/**
 * Extract narrative elements (characters, locations, events) from Markdoc content
 */
export interface NarrativeElement {
  type: 'character' | 'location' | 'event' | 'lore' | 'theme';
  id: string;
  name: string;
  attributes: Record<string, any>;
  content: string;
}

export function extractNarrativeElements(ast: any): NarrativeElement[] {
  const elements: NarrativeElement[] = [];

  function traverse(node: any) {
    if (!node) return;

    // Handle tag nodes
    if (node.type === 'tag') {
      const { name, attributes, children } = node;

      if (
        ['character', 'location', 'event', 'lore', 'theme'].includes(name)
      ) {
        const id = attributes?.id || `${name}-${Date.now()}-${Math.random()}`;
        const displayName =
          attributes?.name || attributes?.term || attributes?.title || 'Unnamed';

        elements.push({
          type: name as any,
          id,
          name: displayName,
          attributes,
          content: serializeChildren(children),
        });
      }
    }

    // Recursively traverse children
    if (Array.isArray(node.children)) {
      node.children.forEach(traverse);
    } else if (node.children) {
      traverse(node.children);
    }
  }

  traverse(ast);
  return elements;
}

/**
 * Serialize node children to string
 */
function serializeChildren(children: any): string {
  if (!children) return '';

  if (Array.isArray(children)) {
    return children
      .map((child) => serializeNode(child))
      .join('\n')
      .trim();
  }

  return serializeNode(children);
}

function serializeNode(node: any): string {
  if (typeof node === 'string') return node;
  if (!node) return '';

  if (node.type === 'tag') {
    const children = serializeChildren(node.children);
    return children;
  }

  if (node.type === 'text') {
    return node.content || '';
  }

  if (Array.isArray(node)) {
    return node.map(serializeNode).join('\n');
  }

  return '';
}

/**
 * Extract table of contents from Markdoc content
 */
export interface TableOfContentsItem {
  id: string;
  level: number;
  title: string;
  children: TableOfContentsItem[];
}

export function extractTableOfContents(ast: any): TableOfContentsItem[] {
  const toc: TableOfContentsItem[] = [];
  let counter = 0;

  function traverse(node: any, parentLevel: number = 0) {
    if (!node) return;

    if (node.type === 'heading' && node.attributes?.level) {
      const level = node.attributes.level;
      const title = serializeChildren(node.children);
      const id = `heading-${counter++}`;

      const item: TableOfContentsItem = {
        id,
        level,
        title,
        children: [],
      };

      if (level === 1 || toc.length === 0) {
        toc.push(item);
      } else {
        // Find parent and add as child
        let parent = findLastItemAtLevel(toc, level - 1);
        if (parent) {
          parent.children.push(item);
        } else {
          toc.push(item);
        }
      }
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(traverse);
    } else if (node.children) {
      traverse(node.children);
    }
  }

  traverse(ast);
  return toc;
}

function findLastItemAtLevel(
  items: TableOfContentsItem[],
  level: number
): TableOfContentsItem | null {
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].level === level) {
      return items[i];
    }
    const found = findLastItemAtLevel(items[i].children, level);
    if (found) return found;
  }
  return null;
}

/**
 * Validate narrative content for common issues
 */
export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  element?: string;
}

export function validateNarrativeContent(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const parsed = parseMarkdoc(content);

  if (parsed.errors.length > 0) {
    parsed.errors.forEach((error) => {
      issues.push({
        type: 'error',
        message: error.message || String(error),
      });
    });
  }

  // Extract elements and check for common issues
  const elements = extractNarrativeElements(parsed.ast);

  // Check for duplicate names
  const names = new Map<string, number>();
  elements.forEach((el) => {
    const count = (names.get(el.name) || 0) + 1;
    names.set(el.name, count);
  });

  names.forEach((count, name) => {
    if (count > 1) {
      issues.push({
        type: 'warning',
        message: `Duplicate element name "${name}" appears ${count} times`,
      });
    }
  });

  // Check for unnamed elements
  elements.forEach((el) => {
    if (!el.name || el.name === 'Unnamed') {
      issues.push({
        type: 'warning',
        message: `${el.type} element has no name`,
      });
    }
  });

  return issues;
}

/**
 * Convert Markdoc to HTML (basic rendering)
 */
export function markdocToHtml(content: string): string {
  try {
    const parsed = parseMarkdoc(content);
    const transformed = transformMarkdoc(parsed.ast);

    // This is a simplified version - in production, you'd use React components
    return renderToHtml(transformed);
  } catch (error) {
    console.error('[Markdoc] HTML conversion error:', error);
    return '';
  }
}

function renderToHtml(node: any): string {
  if (!node) return '';

  if (typeof node === 'string') {
    return escapeHtml(node);
  }

  if (Array.isArray(node)) {
    return node.map(renderToHtml).join('');
  }

  if (node.type === 'heading') {
    const level = node.attributes?.level || 1;
    const children = renderToHtml(node.children);
    return `<h${level}>${children}</h${level}>`;
  }

  if (node.type === 'paragraph') {
    return `<p>${renderToHtml(node.children)}</p>`;
  }

  if (node.type === 'fence') {
    const language = node.attributes?.language || 'plaintext';
    const content = node.attributes?.content || '';
    return `<pre><code class="language-${language}">${escapeHtml(content)}</code></pre>`;
  }

  if (node.type === 'list') {
    const tag = node.attributes?.ordered ? 'ol' : 'ul';
    const items = renderToHtml(node.children);
    return `<${tag}>${items}</${tag}>`;
  }

  if (node.type === 'item') {
    return `<li>${renderToHtml(node.children)}</li>`;
  }

  if (node.type === 'link') {
    const href = node.attributes?.href || '#';
    const children = renderToHtml(node.children);
    return `<a href="${escapeHtml(href)}">${children}</a>`;
  }

  if (node.type === 'image') {
    const src = node.attributes?.src || '';
    const alt = node.attributes?.alt || '';
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />`;
  }

  // Default: render children
  if (node.children) {
    return renderToHtml(node.children);
  }

  return '';
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
