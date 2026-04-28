// Thin fetch wrapper around the Express backend.
// All endpoints live under /api — see backend/src/routes/index.js.

async function request(path, opts = {}) {
  const res = await fetch(path, opts);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(body.error || `HTTP ${res.status}`);
    err.code = body.code;
    err.details = body.details;
    throw err;
  }
  return body;
}

export const api = {
  batchProcess({ files, jobTitle, jobDescription, company, autoSend }) {
    const fd = new FormData();
    for (const f of files) fd.append('resumes', f);
    fd.append('jobTitle', jobTitle || '');
    fd.append('jobDescription', jobDescription || '');
    fd.append('company', company || '');
    fd.append('autoSend', autoSend ? 'true' : 'false');
    return request('/api/batch-process', { method: 'POST', body: fd });
  },
  shortlisted() {
    return request('/api/shortlisted');
  },
  candidates() {
    return request('/api/candidates');
  },
  generateEmail(payload) {
    return request('/api/generate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
  sendEmail(payload) {
    return request('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
};
