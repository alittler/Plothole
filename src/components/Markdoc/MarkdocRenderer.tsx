import React from 'react';
import Markdoc from '@markdoc/markdoc';
import { config } from '@/src/lib/markdoc/config';
import * as MarkdocElements from './MarkdocElements';

export interface MarkdocRendererProps {
  content: string;
  showTableOfContents?: boolean;
  validateContent?: boolean;
  onError?: (error: string) => void;
  className?: string;
}

interface ParsedContent {
  ast: any;
  errors: any[];
}

/**
 * React component for rendering Markdoc content with narrative elements
 */
export const MarkdocRenderer: React.FC<MarkdocRendererProps> = ({
  content,
  showTableOfContents = false,
  validateContent = true,
  onError,
  className = '',
}) => {
  const [parsed, setParsed] = React.useState<ParsedContent | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const ast = Markdoc.parse(content);
      const validationErrors = Markdoc.validate(ast, config);

      if (validationErrors.length > 0 && validateContent) {
        const errorMessages = validationErrors.map(
          (err: any) => err.message || JSON.stringify(err)
        );
        setErrors(errorMessages);
        onError?.(errorMessages.join(', '));
      } else {
        setErrors([]);
      }

      setParsed({ ast, errors: validationErrors });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setErrors([errorMessage]);
      onError?.(errorMessage);
      setParsed(null);
    }
  }, [content, validateContent, onError]);

  if (!parsed || !parsed.ast) {
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-700 dark:text-red-300">
          Failed to parse markdown content
        </p>
        {errors.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-red-600 dark:text-red-400">
            {errors.map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const transformed = Markdoc.transform(parsed.ast, config);

  return (
    <div className={`markdoc-content ${className}`}>
      {showTableOfContents && <TableOfContents ast={parsed.ast} />}
      <MarkdocRenderNode node={transformed} />
    </div>
  );
};

/**
 * Recursive component for rendering Markdoc AST nodes
 */
const MarkdocRenderNode: React.FC<{ node: any }> = ({ node }) => {
  if (node === null || node === undefined) {
    return null;
  }

  if (typeof node === 'string') {
    return <>{node}</>;
  }

  if (Array.isArray(node)) {
    return (
      <>
        {node.map((child, i) => (
          <MarkdocRenderNode key={i} node={child} />
        ))}
      </>
    );
  }

  if (node.type === 'text') {
    return <>{node.content}</>;
  }

  if (node.type === 'softbreak') {
    return <br />;
  }

  if (node.type === 'hardbreak') {
    return <br />;
  }

  if (node.type === 'em') {
    return <em>{node.children && <MarkdocRenderNode node={node.children} />}</em>;
  }

  if (node.type === 'strong') {
    return (
      <strong>
        {node.children && <MarkdocRenderNode node={node.children} />}
      </strong>
    );
  }

  if (node.type === 'code') {
    return (
      <code className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm">
        {node.content}
      </code>
    );
  }

  const Component = (MarkdocElements as any)[node.name];

  if (!Component) {
    console.warn(`Unknown Markdoc element: ${node.name}`);
    return (
      <div className="text-red-500 text-xs">
        Unknown element: {node.name}
      </div>
    );
  }

  const children = node.children && (
    <MarkdocRenderNode node={node.children} />
  );

  return (
    <Component {...(node.attributes || {})} {...(node.name && { name: node.name })}>
      {children}
    </Component>
  );
};

/**
 * Table of Contents component
 */
interface TableOfContentsItem {
  id: string;
  level: number;
  title: string;
  children: TableOfContentsItem[];
}

const TableOfContents: React.FC<{ ast: any }> = ({ ast }) => {
  const [toc, setToc] = React.useState<TableOfContentsItem[]>([]);

  React.useEffect(() => {
    const extracted = extractTableOfContents(ast);
    setToc(extracted);
  }, [ast]);

  if (toc.length === 0) {
    return null;
  }

  return (
    <nav className="mb-8 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <h3 className="font-bold text-sm mb-3 text-slate-900 dark:text-white">
        Table of Contents
      </h3>
      <TocList items={toc} />
    </nav>
  );
};

const TocList: React.FC<{ items: TableOfContentsItem[] }> = ({ items }) => (
  <ul className="space-y-1 text-sm">
    {items.map((item) => (
      <li key={item.id}>
        <a
          href={`#${item.id}`}
          className="text-blue-600 dark:text-blue-400 hover:underline"
          style={{ marginLeft: `${(item.level - 1) * 1}rem` }}
        >
          {item.title}
        </a>
        {item.children.length > 0 && <TocList items={item.children} />}
      </li>
    ))}
  </ul>
);

function extractTableOfContents(ast: any): TableOfContentsItem[] {
  const toc: TableOfContentsItem[] = [];
  let counter = 0;

  function traverse(node: any) {
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

function serializeChildren(children: any): string {
  if (!children) return '';

  if (Array.isArray(children)) {
    return children.map(serializeNode).join('').trim();
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
    return node.map(serializeNode).join('');
  }

  return '';
}

export default MarkdocRenderer;
