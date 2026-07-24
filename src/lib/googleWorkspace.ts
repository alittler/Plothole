import { CharacterProfile, ResearchSource } from '../types';

/**
 * Promise-based loader for the Google API Client and Picker API.
 * Avoids loading scripts prematurely and works dynamically in our sandboxed environment.
 */
let pickerPromise: Promise<void> | null = null;

export const loadGooglePickerScript = (): Promise<void> => {
  if (pickerPromise) return pickerPromise;

  pickerPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).gapi && (window as any).google?.picker) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const gapi = (window as any).gapi;
      if (gapi) {
        gapi.load('picker', {
          callback: () => {
            resolve();
          },
          onerror: () => {
            reject(new Error('Failed to load Google Picker Client libraries.'));
          }
        });
      } else {
        reject(new Error('Google Client SDK failed to initialize.'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to fetch the Google Client API script from servers.'));
    };
    document.body.appendChild(script);
  });

  return pickerPromise;
};

/**
 * Downloads a file's raw content from Google Drive.
 * Automatically exports Google Docs as plain text, or downloads text files directly.
 */
export const fetchDriveFileContent = async (
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<string> => {
  if (!accessToken) {
    throw new Error('Google Drive authorization token is missing. Please authorize or reconnect Google Drive.');
  }

  let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  
  // If it's a native Google Doc, export it as plain text
  if (mimeType === 'application/vnd.google-apps.document') {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive fetch failed (${response.status}): ${response.statusText}. Details: ${errText}`);
  }

  return await response.text();
};

/**
 * Creates a beautifully formatted Google Doc from the compiled character dossier
 * using the official Google Docs REST API batchUpdate.
 */
export const createGoogleDocFromDossier = async (
  accessToken: string,
  title: string,
  author: string,
  characters: CharacterProfile[]
): Promise<{ id: string; url: string }> => {
  if (!accessToken) {
    throw new Error('Google authorization token is missing. Please authorize or reconnect Google Drive.');
  }

  // 1. Create a blank document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `Universal Character Dossier: ${title}`
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Doc: ${createRes.statusText}. Details: ${errText}`);
  }

  const newDoc = await createRes.json();
  const documentId = newDoc.documentId;

  // 2. Prepare content buffer and track formatting ranges
  let docText = "";
  interface StyleRange {
    start: number;
    end: number;
    type: 'title' | 'subtitle' | 'h1' | 'h2' | 'bold' | 'label' | 'meta';
  }
  const styles: StyleRange[] = [];

  const appendText = (text: string, type?: StyleRange['type']) => {
    const start = docText.length + 1; // Google Docs index starts at 1
    docText += text;
    const end = docText.length + 1;
    if (type) {
      styles.push({ start, end, type });
    }
  };

  // Build the text structure
  appendText("UNIVERSAL CHARACTER DOSSIER REPORT\n", "title");
  appendText(`Manuscript: "${title}" ${author ? `by ${author}` : ""}\n`, "subtitle");
  appendText(`Generated on ${new Date().toLocaleDateString()} | Total Profiles: ${characters.length}\n`, "meta");
  appendText("\n" + "=".repeat(60) + "\n\n");

  characters.forEach((char, index) => {
    appendText(`${index + 1}. ${char.core.name.toUpperCase()}\n`, "h1");
    
    // Core attributes
    appendText("CORE DETAILS\n", "h2");
    appendText("Role in Narrative: ", "label");
    appendText(`${char.core.role}\n`);
    appendText("Species/Classification: ", "label");
    appendText(`${char.core.species}\n`);
    appendText("Living Status: ", "label");
    appendText(`${char.core.living_status}\n`);
    if (char.core.nickname) {
      appendText("Nickname: ", "label");
      appendText(`${char.core.nickname}\n`);
    }
    appendText("\n");

    // Description
    appendText("CHARACTER PROFILE & MOTIFS\n", "h2");
    appendText(`${char.content.description || 'No descriptive overview provided.'}\n\n`);

    // Goals
    if (char.content.goals && char.content.goals.length > 0) {
      appendText("NARRATIVE GOALS & OBJECTIVES\n", "h2");
      char.content.goals.forEach(goal => {
        appendText(`• ${goal}\n`);
      });
      appendText("\n");
    }

    // Relationships
    if (char.content.relationships && char.content.relationships.length > 0) {
      appendText("RELATIONSHIPS & ALIGNMENT MAP\n", "h2");
      char.content.relationships.forEach(rel => {
        appendText(`• With `, "bold");
        appendText(`${rel.name}: `, "bold");
        appendText(`${rel.relation}\n`);
      });
      appendText("\n");
    }

    // Quotes
    if (char.content.quotes && char.content.quotes.length > 0) {
      appendText("MEMORABLE QUOTES & DIALOGUE MOTIFS\n", "h2");
      char.content.quotes.forEach(quote => {
        appendText(`" ${quote} "\n`, "meta");
      });
      appendText("\n");
    }

    // Notes & Tags
    if (char.metadata.notes || (char.metadata.tags && char.metadata.tags.length > 0) || char.metadata.first_appearance) {
      appendText("METADATA & LOGS\n", "h2");
      if (char.metadata.first_appearance) {
        appendText("First Appearance: ", "label");
        appendText(`${char.metadata.first_appearance}\n`);
      }
      if (char.metadata.tags && char.metadata.tags.length > 0) {
        appendText("Tags: ", "label");
        appendText(`${char.metadata.tags.join(', ')}\n`);
      }
      if (char.metadata.notes) {
        appendText("Extraction Notes: ", "label");
        appendText(`${char.metadata.notes}\n`);
      }
      appendText("\n");
    }

    appendText("-".repeat(50) + "\n\n");
  });

  // Construct batch update requests array
  const requests: any[] = [
    {
      insertText: {
        text: docText,
        location: {
          index: 1
        }
      }
    }
  ];

  // Hex to RGB color helper
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.substring(1, 3), 16) / 255;
    const g = parseInt(hex.substring(3, 5), 16) / 255;
    const b = parseInt(hex.substring(5, 7), 16) / 255;
    return { red: r, green: g, blue: b };
  };

  // Convert our ranges to styles requests
  styles.forEach(({ start, end, type }) => {
    let textStyle: any = {};
    let paragraphStyle: any = {};

    switch (type) {
      case 'title':
        textStyle = {
          bold: true,
          fontSize: { size: 24, unit: 'PT' },
          foregroundColor: { color: { rgbColor: hexToRgb('#1e3a8a') } } // Deep Blue
        };
        paragraphStyle = {
          spaceAbove: { size: 18, unit: 'PT' },
          spaceBelow: { size: 12, unit: 'PT' }
        };
        break;
      case 'subtitle':
        textStyle = {
          italic: true,
          fontSize: { size: 11, unit: 'PT' },
          foregroundColor: { color: { rgbColor: hexToRgb('#475569') } } // Slate-600
        };
        paragraphStyle = {
          spaceBelow: { size: 8, unit: 'PT' }
        };
        break;
      case 'h1':
        textStyle = {
          bold: true,
          fontSize: { size: 16, unit: 'PT' },
          foregroundColor: { color: { rgbColor: hexToRgb('#0f172a') } } // Slate-900
        };
        paragraphStyle = {
          spaceAbove: { size: 16, unit: 'PT' },
          spaceBelow: { size: 8, unit: 'PT' }
        };
        break;
      case 'h2':
        textStyle = {
          bold: true,
          fontSize: { size: 11, unit: 'PT' },
          foregroundColor: { color: { rgbColor: hexToRgb('#2563eb') } } // Royal Blue
        };
        paragraphStyle = {
          spaceAbove: { size: 12, unit: 'PT' },
          spaceBelow: { size: 4, unit: 'PT' }
        };
        break;
      case 'bold':
        textStyle = { bold: true };
        break;
      case 'label':
        textStyle = {
          bold: true,
          foregroundColor: { color: { rgbColor: hexToRgb('#334155') } } // Slate-700
        };
        break;
      case 'meta':
        textStyle = {
          fontSize: { size: 9.5, unit: 'PT' },
          foregroundColor: { color: { rgbColor: hexToRgb('#64748b') } } // Slate-500
        };
        break;
    }

    requests.push({
      updateTextStyle: {
        textStyle,
        range: { startIndex: start, endIndex: end },
        fields: Object.keys(textStyle).join(',')
      }
    });

    if (Object.keys(paragraphStyle).length > 0) {
      requests.push({
        updateParagraphStyle: {
          paragraphStyle,
          range: { startIndex: start, endIndex: end },
          fields: Object.keys(paragraphStyle).join(',')
        }
      });
    }
  });

  // 3. Send batchUpdate request to write and format the document
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Failed to format Google Doc: ${updateRes.statusText}. Details: ${errText}`);
  }

  return {
    id: documentId,
    url: `https://docs.google.com/document/d/${documentId}/edit`
  };
};

/**
 * Safe base64 encoder that handles UTF-8 strings correctly (especially for manuscripts
 * containing curly quotes, emojis, accented characters, or code snippets).
 */
export const base64EncodeUnicode = (str: string): string => {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );
};

/**
 * Encodes an RFC 2822 email string to base64url format for the Gmail API.
 */
export const base64UrlEncode = (str: string): string => {
  const base64 = base64EncodeUnicode(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Sends a manuscript backup containing character profiles and narrative logs 
 * directly to a target email using the official Gmail REST API.
 */
export const sendGmailBackup = async (
  accessToken: string,
  toEmail: string,
  subject: string,
  bodyHtml: string,
  attachment?: { filename: string; content: string; mimeType: string }
): Promise<any> => {
  if (!accessToken) {
    throw new Error('Gmail authorization token is missing. Please authorize or reconnect Google Account.');
  }

  const boundary = "plothole_backup_boundary_1234567890";
  const mailParts: string[] = [];

  mailParts.push(`To: ${toEmail}`);
  mailParts.push(`Subject: ${subject}`);
  mailParts.push(`MIME-Version: 1.0`);
  mailParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  mailParts.push("");

  // HTML Body Part
  mailParts.push(`--${boundary}`);
  mailParts.push(`Content-Type: text/html; charset="UTF-8"`);
  mailParts.push(`Content-Transfer-Encoding: 7bit`);
  mailParts.push("");
  mailParts.push(bodyHtml);
  mailParts.push("");

  // Attachment Part (JSON/ZIP/MD) if provided
  if (attachment) {
    mailParts.push(`--${boundary}`);
    mailParts.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
    mailParts.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
    mailParts.push(`Content-Transfer-Encoding: base64`);
    mailParts.push("");
    mailParts.push(base64EncodeUnicode(attachment.content));
    mailParts.push("");
  }

  mailParts.push(`--${boundary}--`);

  const rawMessage = mailParts.join("\r\n");
  const encodedMessage = base64UrlEncode(rawMessage);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodedMessage
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gmail API send failed (${response.status}): ${response.statusText}. Details: ${errText}`);
  }

  return await response.json();
};

/**
 * Creates a beautifully formatted Google Doc from a Research Notebook
 * using the official Google Docs REST API.
 */
export const createGoogleDocFromNotebook = async (
  accessToken: string,
  notebookName: string,
  sources: ResearchSource[]
): Promise<{ id: string; url: string }> => {
  if (!accessToken) {
    throw new Error('Google authorization token is missing. Please authorize or reconnect Google Drive.');
  }

  // 1. Create a blank document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `Plothole Research Notebook: ${notebookName}`
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Doc: ${createRes.statusText}. Details: ${errText}`);
  }

  const newDoc = await createRes.json();
  const documentId = newDoc.documentId;

  // 2. Prepare content buffer and track formatting ranges
  let docText = "";
  interface StyleRange {
    start: number;
    end: number;
    type: 'title' | 'subtitle' | 'h1' | 'h2' | 'bold' | 'label' | 'meta';
  }
  const styles: StyleRange[] = [];

  const appendText = (text: string, type?: StyleRange['type']) => {
    const start = docText.length + 1; // Google Docs index starts at 1
    docText += text;
    const end = docText.length + 1;
    if (type) {
      styles.push({ start, end, type });
    }
  };

  // Build the text structure
  appendText("PLOTHOLE RESEARCH NOTEBOOK REPORT\n", "title");
  appendText(`Notebook Name: "${notebookName}"\n`, "subtitle");
  appendText(`Generated on ${new Date().toLocaleDateString()} | Total Sources: ${sources.length}\n`, "meta");
  appendText("\n" + "=".repeat(60) + "\n\n");

  sources.forEach((source, index) => {
    appendText(`SOURCE #${index + 1}: ${source.title.toUpperCase()}\n`, "h1");
    appendText("Type: ", "label");
    appendText(`${source.type}\n`);
    if (source.url) {
      appendText("URL: ", "label");
      appendText(`${source.url}\n`);
    }
    appendText("Added On: ", "label");
    appendText(`${new Date(source.addedAt).toLocaleString()}\n\n`);

    appendText("SOURCE MATERIAL / NOTES\n", "h2");
    appendText(`${source.content || "No content or notes provided."}\n\n`);
    appendText("-".repeat(50) + "\n\n");
  });

  // Construct batch update requests array
  const requests: any[] = [
    {
      insertText: {
        text: docText,
        location: {
          index: 1
        }
      }
    }
  ];

  // Hex to RGB color helper
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.substring(1, 3), 16) / 255;
    const g = parseInt(hex.substring(3, 5), 16) / 255;
    const b = parseInt(hex.substring(5, 7), 16) / 255;
    return { red: r, green: g, blue: b };
  };

  // Convert our ranges to styles requests
  styles.forEach(({ start, end, type }) => {
    let textStyle: any = {};
    let paragraphStyle: any = {};

    switch (type) {
      case 'title':
        textStyle = {
          bold: true,
          fontSize: { size: 22, unit: 'PT' },
          foregroundColor: { color: { rgbColor: hexToRgb('#1e3a8a') } } // Deep Blue
        };
        paragraphStyle = {
          spaceAbove: { size: 18, unit: 'PT' },
          spaceBelow: { size: 12, unit: 'PT' }
        };
        break;
      case 'subtitle':
        textStyle = {
          italic: true,
          fontSize: { size: 11, unit: 'PT' },
          foregroundColor: { color: { rgbColor: hexToRgb('#475569') } } // Slate-600
        };
        paragraphStyle = {
          spaceBelow: { size: 8, unit: 'PT' }
        };
        break;
      case 'h1':
        textStyle = {
          bold: true,
          fontSize: { size: 14, unit: 'PT' },
          foregroundColor: { color: { rgbColor: hexToRgb('#0f172a') } } // Slate-900
        };
        paragraphStyle = {
          spaceAbove: { size: 16, unit: 'PT' },
          spaceBelow: { size: 8, unit: 'PT' }
        };
        break;
      case 'h2':
        textStyle = {
          bold: true,
          fontSize: { size: 11, unit: 'PT' },
          foregroundColor: { color: { rgbColor: hexToRgb('#2563eb') } } // Royal Blue
        };
        paragraphStyle = {
          spaceAbove: { size: 12, unit: 'PT' },
          spaceBelow: { size: 4, unit: 'PT' }
        };
        break;
      case 'bold':
        textStyle = { bold: true };
        break;
      case 'label':
        textStyle = {
          bold: true,
          foregroundColor: { color: { rgbColor: hexToRgb('#334155') } } // Slate-700
        };
        break;
      case 'meta':
        textStyle = {
          fontSize: { size: 9.5, unit: 'PT' },
          foregroundColor: { color: { rgbColor: hexToRgb('#64748b') } } // Slate-500
        };
        break;
    }

    requests.push({
      updateTextStyle: {
        textStyle,
        range: { startIndex: start, endIndex: end },
        fields: 'bold,italic,fontSize,foregroundColor'
      }
    });

    if (Object.keys(paragraphStyle).length > 0) {
      requests.push({
        updateParagraphStyle: {
          paragraphStyle,
          range: { startIndex: start, endIndex: end },
          fields: 'spaceAbove,spaceBelow'
        }
      });
    }
  });

  // Apply style update call
  const styleRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!styleRes.ok) {
    console.warn(`Failed to style Google Doc content: ${styleRes.statusText}`);
  }

  return {
    id: documentId,
    url: `https://docs.google.com/document/d/${documentId}/edit`
  };
};

