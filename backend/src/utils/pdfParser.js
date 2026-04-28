// Document → plain text. Supports PDF (pdf-parse) and Word .docx (mammoth).
// Both are normalised to text so the LLM never sees raw bytes.
//
// Old .doc (binary Word 97-2003) is intentionally NOT supported — pure-JS
// parsing is unreliable for that format. Recruiters get a clear error
// asking them to re-save the file as .docx.

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { AppError } = require('./errors');

async function extractText(buffer, filename = '') {
  if (!buffer || !buffer.length) {
    throw new AppError('Empty file', 400, 'EMPTY_FILE');
  }
  const lower = (filename || '').toLowerCase();

  if (lower.endsWith('.pdf')) return extractFromPdf(buffer);
  if (lower.endsWith('.docx')) return extractFromDocx(buffer);

  // Legacy .doc — friendly error rather than producing garbage.
  if (lower.endsWith('.doc')) {
    throw new AppError(
      'Legacy .doc files are not supported. Open the file in Word and "Save As" .docx, then upload again.',
      400,
      'DOC_LEGACY'
    );
  }

  throw new AppError(
    `Unsupported file type: ${filename}. Use .pdf or .docx.`,
    400,
    'UNSUPPORTED_FILE'
  );
}

async function extractFromPdf(buffer) {
  let result;
  try {
    result = await pdfParse(buffer);
  } catch (err) {
    // pdf-parse throws cryptic errors on corrupted / image-only PDFs —
    // wrap them so the recruiter understands what to do (re-export the PDF).
    throw new AppError(
      `Could not parse PDF (${err.message}). Try re-saving the file as a text-based PDF.`,
      400,
      'PDF_PARSE_FAILED'
    );
  }
  const text = (result.text || '').trim();
  if (!text) {
    throw new AppError(
      'PDF contains no extractable text — likely a scanned image. Use OCR or a text-based PDF.',
      400,
      'PDF_NO_TEXT'
    );
  }
  return text;
}

async function extractFromDocx(buffer) {
  let result;
  try {
    // mammoth strips Word's heavy XML and returns just the prose — perfect
    // for an LLM. We discard styling messages from `result.messages`.
    result = await mammoth.extractRawText({ buffer });
  } catch (err) {
    throw new AppError(
      `Could not parse Word document (${err.message}). Try re-saving as .docx.`,
      400,
      'DOCX_PARSE_FAILED'
    );
  }
  const text = (result.value || '').trim();
  if (!text) {
    throw new AppError(
      'Word document contains no extractable text.',
      400,
      'DOCX_NO_TEXT'
    );
  }
  return text;
}

// Pull a JSON object out of a possibly chatty LLM response.
// LLMs sometimes wrap JSON in code fences, prepend prose, leave trailing
// commas, or stuff raw newlines into strings. We try strict parse first,
// then a small repair pass before giving up.
function extractJson(text) {
  if (!text) throw new AppError('Empty LLM response', 502, 'LLM_EMPTY');

  // Strip ```json ... ``` fences if present.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  // Find the first `{` and matching last `}` — survives leading/trailing prose.
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new AppError('LLM did not return JSON', 502, 'LLM_BAD_JSON', { raw: text.slice(0, 500) });
  }
  const slice = candidate.slice(start, end + 1);

  // First attempt — strict.
  try {
    return JSON.parse(slice);
  } catch (_strictErr) {
    // Fallthrough to repair.
  }

  // Repair attempt — handles the most common LLM-output sins:
  //   - trailing commas before } or ]
  //   - raw newlines / tabs inside string literals
  try {
    return JSON.parse(repairJson(slice));
  } catch (err) {
    throw new AppError(`LLM JSON parse failed: ${err.message}`, 502, 'LLM_BAD_JSON', {
      raw: text.slice(0, 500),
    });
  }
}

// Tiny in-place JSON repair. Walks the string with a small state machine and:
//   - escapes raw newlines/tabs/CR that appear inside "..." strings
//   - drops trailing commas before } or ]
// Good enough for LLM output; not a full JSON5 parser.
function repairJson(str) {
  let out = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escape) {
      out += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString) {
      if (ch === '\n') out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (ch === '\t') out += '\\t';
      else out += ch;
      continue;
    }
    // Outside strings — drop trailing commas.
    if (ch === ',') {
      // Skip ahead through whitespace; if next non-ws is } or ], skip the comma.
      let j = i + 1;
      while (j < str.length && /\s/.test(str[j])) j++;
      if (str[j] === '}' || str[j] === ']') continue;
    }
    out += ch;
  }
  return out;
}

module.exports = { extractText, extractJson };
