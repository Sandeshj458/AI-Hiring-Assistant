import { useEffect, useRef, useState } from 'react';

import { UploadIcon, FileIcon, SparklesIcon, XIcon, MailIcon } from './Icons.jsx';
import Toggle from './Toggle.jsx';

// File picker with drag & drop, plus the auto-send toggle (chosen *before*
// parsing so the backend can fan out to email during the same batch run).
export default function ResumeUpload({
  onProcess,
  status,
  autoSend,
  onToggleAutoSend,
}) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handlePick = (picked) => {
    // Keep .pdf and .docx — silently drop anything else (we still show a
    // human-readable hint below the dropzone listing accepted types).
    const arr = Array.from(picked || []).filter((f) => /\.(pdf|docx)$/i.test(f.name));
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of arr) {
        if (!merged.find((m) => m.name === f.name && m.size === f.size)) merged.push(f);
      }
      return merged;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handlePick(e.dataTransfer.files);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProcess = async () => {
    setBusy(true);
    try {
      await onProcess(files);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 sm:p-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
          <UploadIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Upload resumes</h2>
          <p className="text-xs text-slate-500">PDF or Word (.docx), multiple files allowed</p>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-all duration-200
          ${dragOver
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => handlePick(e.target.files)}
          className="hidden"
        />
        <div
          className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${
            dragOver ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <UploadIcon className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-700">
          {dragOver ? 'Drop files here' : 'Drop resumes here or click to browse'}
        </p>
        <p className="text-xs text-slate-400 mt-1">PDF or Word (.docx) · up to 5MB each</p>
      </div>

      {files.length > 0 && (
        <ul className="mt-4 space-y-2 animate-fade-in">
          {files.map((f, idx) => (
            <li
              key={`${f.name}-${idx}`}
              className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200/70"
            >
              <FileIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-700 truncate flex-1">{f.name}</span>
              <span className="text-xs text-slate-400 tabular-nums shrink-0">
                {Math.round(f.size / 1024)} KB
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                aria-label="Remove file"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Auto-send toggle — set BEFORE parsing so the backend can fan out
          to email during the same batch. Big visual difference between modes. */}
      <div
        className={`mt-5 rounded-xl border p-4 transition-colors ${
          autoSend
            ? 'border-amber-200 bg-amber-50/60'
            : 'border-slate-200 bg-slate-50/60'
        }`}
      >
        <Toggle
          checked={autoSend}
          onChange={onToggleAutoSend}
          disabled={busy}
          label={autoSend ? 'Auto-send emails after scoring' : 'Manual review before sending'}
          hint={
            autoSend
              ? 'Shortlisted candidates get an interview invite, the rest get a polite rejection — automatic.'
              : 'Resumes will be parsed & scored. You decide who gets emailed afterwards.'
          }
        />
        {autoSend && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">
            <MailIcon className="w-3.5 h-3.5" />
            Verify SMTP is configured before enabling
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={handleProcess}
          disabled={busy || !files.length}
          className="btn-primary"
        >
          {busy ? (
            <>
              <Spinner /> Processing…
            </>
          ) : (
            <>
              <SparklesIcon className="w-4 h-4" />
              {autoSend ? 'Parse, score & send' : 'Parse & score with AI'}
            </>
          )}
        </button>

        {status && <StatusPill status={status} />}
      </div>

      {busy && <PipelineProgress autoSend={autoSend} fileCount={files.length} />}
    </section>
  );
}

// Animated step indicator shown during processing. We don't get real-time
// per-file progress from the backend (it's a single request), so we drive an
// indeterminate carousel through the pipeline stages — gives the recruiter
// useful visual feedback that *something* is happening.
function PipelineProgress({ autoSend, fileCount }) {
  const steps = [
    { id: 'upload', label: 'Uploading' },
    { id: 'parse', label: 'Parsing' },
    { id: 'score', label: 'Scoring' },
    { id: 'shortlist', label: 'Shortlisting' },
  ];
  if (autoSend) steps.push({ id: 'email', label: 'Emailing' });

  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % steps.length), 1100);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
        </span>
        <p className="text-xs font-semibold text-indigo-900">
          Working on {fileCount} resume{fileCount === 1 ? '' : 's'}…
        </p>
      </div>

      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {steps.map((s, i) => (
          <Step key={s.id} label={s.label} active={i === active} done={i < active} last={i === steps.length - 1} />
        ))}
      </ol>
      <p className="text-[11px] text-indigo-800/80 mt-3">
        Steps run in parallel inside each request — this is just a visual heartbeat.
      </p>
    </div>
  );
}

function Step({ label, active, done, last }) {
  return (
    <>
      <li className="flex items-center gap-1.5">
        <span
          className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold transition-all duration-300
            ${active ? 'bg-indigo-600 text-white shadow ring-2 ring-indigo-200 scale-110' : ''}
            ${done ? 'bg-emerald-500 text-white' : ''}
            ${!active && !done ? 'bg-slate-200 text-slate-500' : ''}`}
        >
          {done ? '✓' : active ? '…' : '·'}
        </span>
        <span
          className={`text-xs font-medium transition-colors
            ${active ? 'text-indigo-900' : done ? 'text-emerald-700' : 'text-slate-500'}`}
        >
          {label}
        </span>
      </li>
      {!last && <span className="text-slate-300 text-xs mx-1">→</span>}
    </>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

function StatusPill({ status }) {
  const tone = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-rose-50 text-rose-700 border-rose-200',
  }[status.kind];
  return (
    <span className={`text-xs font-medium border px-2.5 py-1 rounded-md animate-fade-in ${tone}`}>
      {status.text}
    </span>
  );
}
