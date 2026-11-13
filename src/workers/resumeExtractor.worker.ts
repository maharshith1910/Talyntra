// Web Worker for Client-Side PDF & DOCX Text Extraction
// Runs off-thread to avoid locking the UI during binary decoding

self.onmessage = async (e: MessageEvent) => {
  const { fileBuffer, fileName, fileSize } = e.data;

  // 1. Strict size check (10MB limit)
  if (fileSize > 10 * 1024 * 1024) {
    self.postMessage({ success: false, error: 'File exceeds maximum 10MB limit.' });
    return;
  }

  try {
    const isPdf = /\.pdf$/i.test(fileName);
    const isDocx = /\.docx$/i.test(fileName);

    let extractedText = '';

    if (isPdf) {
      extractedText = extractTextFromPdfBuffer(new Uint8Array(fileBuffer));
    } else if (isDocx) {
      extractedText = await extractTextFromDocxBuffer(fileBuffer);
    } else {
      // Plain text fallback (.txt)
      const decoder = new TextDecoder('utf-8');
      extractedText = decoder.decode(fileBuffer);
    }

    // Clean and normalize whitespace
    extractedText = extractedText.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();

    if (extractedText.length < 30) {
      self.postMessage({
        success: false,
        error: 'Extracted text is too short or malformed. Escalating to server fallback.',
      });
      return;
    }

    self.postMessage({
      success: true,
      text: extractedText,
      charCount: extractedText.length,
      source: 'client_worker',
    });
  } catch (err: any) {
    self.postMessage({
      success: false,
      error: err?.message || 'Worker extraction failed. Escalating to server fallback.',
    });
  }
};

/**
 * Pure binary stream extractor for PDF files.
 * Parses PDF text streams, text objects (BT...ET), and string literals (Tj, TJ, ' and ").
 */
function extractTextFromPdfBuffer(bytes: Uint8Array): string {
  const decoder = new TextDecoder('latin1');
  const rawString = decoder.decode(bytes);

  const textChunks: string[] = [];

  // Match text objects enclosed by BT and ET operators
  const btEtRegex = /BT[\s\S]*?ET/g;
  let match: RegExpExecArray | null;

  while ((match = btEtRegex.exec(rawString)) !== null) {
    const block = match[0];

    // Extract standard string literals: (Text) Tj or (Text) ' or (Text) "
    const tjRegex = /\((.*?)\)\s*T[jJ]/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textChunks.push(unescapePdfString(tjMatch[1]));
    }

    // Extract array string blocks: [(Text) 12 (Another Text)] TJ
    const arrayRegex = /\[(.*?)\]\s*TJ/g;
    let arrMatch: RegExpExecArray | null;
    while ((arrMatch = arrayRegex.exec(block)) !== null) {
      const inner = arrMatch[1];
      const innerStrings = inner.match(/\((.*?)\)/g) || [];
      const line = innerStrings.map((s) => unescapePdfString(s.slice(1, -1))).join('');
      if (line.trim()) textChunks.push(line);
    }
  }

  // Fallback: If BT/ET parsing didn't find chunks (e.g. compressed or non-standard stream), extract readable string segments
  if (textChunks.length === 0) {
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = streamRegex.exec(rawString)) !== null) {
      const streamContent = sMatch[1];
      const matches = streamContent.match(/\(([^()]{3,})\)/g);
      if (matches) {
        for (const m of matches) {
          textChunks.push(unescapePdfString(m.slice(1, -1)));
        }
      }
    }
  }

  return textChunks.join(' ');
}

function unescapePdfString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

/**
 * Parses DOCX files (which are PK zip archives containing word/document.xml).
 * Searches for word/document.xml inside the archive without requiring heavyweight external libraries.
 */
async function extractTextFromDocxBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('utf-8');
  const latinDecoder = new TextDecoder('latin1');
  const fullRaw = latinDecoder.decode(bytes);

  // Locate word/document.xml entry in ZIP
  const docXmlIndex = fullRaw.indexOf('word/document.xml');
  if (docXmlIndex === -1) {
    // If not standard word/document.xml, attempt to extract any XML text tags <w:t>
    return extractXmlTextTags(decoder.decode(bytes));
  }

  // Find XML content within buffer
  return extractXmlTextTags(decoder.decode(bytes));
}

function extractXmlTextTags(xmlString: string): string {
  const chunks: string[] = [];
  const wtRegex = /<w:t[^>]*>(.*?)<\/w:t>/g;
  let match: RegExpExecArray | null;

  while ((match = wtRegex.exec(xmlString)) !== null) {
    if (match[1]) {
      chunks.push(match[1]);
    }
  }

  // If specific w:t tags were found, return them
  if (chunks.length > 0) {
    return chunks.join(' ');
  }

  // Fallback: strip all XML tags
  return xmlString.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
