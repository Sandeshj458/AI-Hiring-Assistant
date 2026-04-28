// Local filesystem storage backend. Mirrors the `s3Service` interface so the
// rest of the app doesn't know which backend is in use.
//
// Layout (rooted at config.storage.localDir):
//   <root>/resumes/<id>.<ext>
//   <root>/metadata/<id>.json
//   <root>/shortlist/shortlist.json

const fs = require('fs/promises');
const path = require('path');

const config = require('../config');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

const ROOT = path.resolve(config.storage.localDir);

const fullPath = (key) => {
  if (typeof key !== 'string' || !key) {
    throw new AppError(`storage: invalid key (${key})`, 500, 'STORAGE_BAD_KEY');
  }
  return path.join(ROOT, key);
};

async function ensureDirFor(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function putObject({ key, body /*, contentType */ }) {
  const p = fullPath(key);
  await ensureDirFor(p);
  await fs.writeFile(p, body);
  logger.debug(`fs:put ${key}`);
  return { bucket: 'local', key };
}

async function getObjectBuffer(key) {
  try {
    return await fs.readFile(fullPath(key));
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new AppError(`Object not found: ${key}`, 404, 'NOT_FOUND');
    }
    throw err;
  }
}

async function putJson(key, value) {
  return putObject({
    key,
    body: JSON.stringify(value, null, 2),
    contentType: 'application/json',
  });
}

async function getJson(key, { fallback } = {}) {
  try {
    const buf = await getObjectBuffer(key);
    return JSON.parse(buf.toString('utf-8'));
  } catch (err) {
    if (err.code === 'NOT_FOUND' || err.statusCode === 404) {
      if (fallback !== undefined) return fallback;
    }
    throw err;
  }
}

// Recursive walk under <root>/<prefix>, returning logical keys (POSIX-style).
async function listKeys(prefix) {
  const base = fullPath(prefix);
  let entries;
  try {
    entries = await fs.readdir(base, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return []; // No files yet — empty list, not an error.
    throw err;
  }
  const out = [];
  for (const entry of entries) {
    const childKey = path.posix.join(prefix.replace(/\\/g, '/'), entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listKeys(childKey + '/')));
    } else {
      out.push(childKey);
    }
  }
  return out;
}

module.exports = { putObject, getObjectBuffer, putJson, getJson, listKeys };
