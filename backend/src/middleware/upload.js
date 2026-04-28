// Multer configuration for resume uploads.
// We keep files in memory because they're small (resumes), and we forward
// straight to S3 — no need to touch the local disk.

const multer = require('multer');
const { AppError } = require('../utils/errors');

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — resumes are tiny

// Accepted formats: PDF and Word .docx. Old .doc (binary, pre-2007) is
// rejected at the gate with a friendly error so the recruiter knows to
// re-save the file as .docx.
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream', // some browsers misreport docx
]);
const ALLOWED_EXT = new Set(['pdf', 'docx']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || '').toLowerCase().split('.').pop();
    if (ext === 'doc') {
      return cb(
        new AppError(
          'Legacy .doc files are not supported. Save as .docx and try again.',
          400,
          'DOC_LEGACY'
        )
      );
    }
    const okMime = ALLOWED_MIME.has(file.mimetype);
    const okExt = ALLOWED_EXT.has(ext);
    if (okMime || okExt) return cb(null, true);
    return cb(
      new AppError(
        `Unsupported file type: ${file.mimetype || ext}. Use .pdf or .docx.`,
        400,
        'UNSUPPORTED_FILE'
      )
    );
  },
});

module.exports = upload;
