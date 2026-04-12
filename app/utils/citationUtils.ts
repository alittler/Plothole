import { Source } from '../types';

export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'Vancouver';

export const formatCitation = (source: Source, style: CitationStyle): string => {
  const author = source.author || 'Unknown Author';
  const title = source.name || 'Untitled Source';
  const year = source.publicationYear || new Date(source.timestamp).getFullYear().toString();
  const url = source.url || '';
  const publisher = source.publisher || 'n.p.';
  const accessDate = source.accessDate || new Date().toLocaleDateString();

  switch (style) {
    case 'APA':
      // Author, A. A. (Year). Title of work. Publisher. URL
      return `${author} (${year}). ${title}. ${publisher}. ${url ? `Retrieved from ${url}` : ''}`;

    case 'MLA':
      // Author. "Title." Publisher, Year, URL. Accessed Date.
      return `${author}. "${title}." ${publisher}, ${year}, ${url ? `${url}. ` : ''}Accessed ${accessDate}.`;

    case 'Chicago':
      // Author. Title. City: Publisher, Year. URL.
      return `${author}. ${title}. ${publisher}, ${year}. ${url ? `Available at: ${url}.` : ''}`;

    case 'Vancouver':
      // (1) Author. Title. Publisher; Year. [Available from: URL]
      return `${author}. ${title}. ${publisher}; ${year}. ${url ? `[Available from: ${url}]` : ''}`;

    default:
      return title;
  }
};

export const exportAllCitations = (sources: Source[], style: CitationStyle): string => {
  return sources
    .map((s, i) => {
      const citation = formatCitation(s, style);
      return style === 'Vancouver' ? `${i + 1}. ${citation}` : citation;
    })
    .join('\n\n');
};
