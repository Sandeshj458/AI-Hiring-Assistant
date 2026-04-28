// S3 wrapper. We use S3 for two things:
//   1. Storing raw resume files (PDF/TXT)
//   2. Storing JSON metadata + the shortlist (S3-as-keyvalue)
// Sticking to a single backend keeps the deployment story simple.

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');

const config = require('../config');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

const client = new S3Client({
  region: config.aws.region,
  credentials:
    config.aws.accessKeyId && config.aws.secretAccessKey
      ? {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        }
      : undefined, // fall back to default chain (IAM role, env, ~/.aws)
});

const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

const assertKey = (key) => {
  if (typeof key !== 'string' || !key) {
    throw new AppError(`storage: invalid key (${key})`, 500, 'STORAGE_BAD_KEY');
  }
};

async function putObject({ key, body, contentType }) {
  assertKey(key);
  await client.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  logger.debug(`s3:put ${key}`);
  return { bucket: config.s3.bucket, key };
}

async function getObjectBuffer(key) {
  assertKey(key);
  try {
    const res = await client.send(
      new GetObjectCommand({ Bucket: config.s3.bucket, Key: key })
    );
    return streamToBuffer(res.Body);
  } catch (err) {
    // Normalise to the same NOT_FOUND code the local backend emits, so service
    // code that catches `NOT_FOUND` works regardless of backend.
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
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
    // getObjectBuffer now emits NOT_FOUND directly — honor the fallback first.
    if (err.code === 'NOT_FOUND' || err.statusCode === 404) {
      if (fallback !== undefined) return fallback;
    }
    throw err;
  }
}

async function listKeys(prefix) {
  try {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: config.s3.bucket, Prefix: prefix })
    );
    return (res.Contents || []).map((o) => o.Key);
  } catch (err) {
    // An empty/missing bucket should look like "no candidates yet", not a 500.
    if (err.name === 'NoSuchBucket' || err.$metadata?.httpStatusCode === 404) {
      logger.warn(`s3:list ${prefix} — bucket missing, treating as empty`);
      return [];
    }
    throw err;
  }
}

module.exports = {
  putObject,
  getObjectBuffer,
  putJson,
  getJson,
  listKeys,
};
