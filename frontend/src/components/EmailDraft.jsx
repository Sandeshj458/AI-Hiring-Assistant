import { useEffect, useState } from 'react';

import { api } from '../api.js';
import { MailIcon, XIcon, CopyIcon, CheckIcon, SparklesIcon } from './Icons.jsx';

// Modal email draft. Mounts when the user clicks Invite/Rejection on a row.
// Closes on backdrop click or Escape.
export default function EmailDraft({ context, jobTitle, company, onClose, onSent }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .generateEmail({
        candidateId: context.candidateId,
        kind: context.kind,
        jobTitle,
        company,
      })
      .then((draft) => {
        if (cancelled) return;
        setTo(draft.to || '');
        setSubject(draft.subject);
        setBody(draft.body);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [context, jobTitle, company]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSend = async () => {
    setSending(true);
    setSendError(null);
    try {
      // Pass candidateId + kind so the backend records this in the candidate's
      // emailHistory — that's what powers the "Invited @ time" badge.
      await api.sendEmail({
        to: to.trim(),
        subject,
        body,
        candidateId: context.candidateId,
        kind: context.kind,
      });
      setSent(true);
      onSent && onSent();
      setTimeout(onClose, 1200);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const validTo = /^\S+@\S+\.\S+$/.test(to.trim());
  const canSend = !loading && !error && validTo && !sending && !sent;

  const isInvite = context.kind === 'invite';
  const accent = isInvite
    ? 'from-indigo-500 to-violet-600'
    : 'from-slate-500 to-slate-600';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/60 animate-slide-up overflow-hidden"
      >
        <div className={`px-6 py-4 bg-gradient-to-r ${accent} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <MailIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {isInvite ? 'Interview invitation' : 'Rejection email'}
              </h2>
              <p className="text-xs text-white/80 mt-0.5 font-mono">
                {context.candidateId.slice(0, 8)}…
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && <DraftSkeleton />}

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
              <p className="text-sm font-medium text-rose-800">Could not draft email</p>
              <p className="text-xs text-rose-600 mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-4">
              <div>
                <label className="label">To</label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="candidate@example.com"
                  className="input font-medium"
                />
                {!to && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    No email address found in the resume — paste one to enable Send.
                  </p>
                )}
              </div>

              <div>
                <label className="label">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input font-medium"
                />
              </div>

              <div>
                <label className="label">Body</label>
                <textarea
                  rows={12}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="input font-mono text-xs leading-relaxed resize-y"
                />
                <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  AI-generated draft · review before sending
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <p className="text-xs text-rose-600 truncate" title={sendError || ''}>
            {sendError}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onClose} className="btn-secondary !py-2">
              Close
            </button>
            <button
              onClick={handleCopy}
              disabled={loading || error}
              className="btn-secondary !py-2 disabled:opacity-50"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4" /> Copied!
                </>
              ) : (
                <>
                  <CopyIcon className="w-4 h-4" /> Copy
                </>
              )}
            </button>
            <button
              onClick={handleSend}
              disabled={!canSend}
              title={validTo ? 'Send via SMTP' : 'Add a recipient address first'}
              className="btn-primary !py-2 disabled:opacity-50"
            >
              {sent ? (
                <>
                  <CheckIcon className="w-4 h-4" /> Sent
                </>
              ) : sending ? (
                <>
                  <SparklesIcon className="w-4 h-4 animate-pulse-soft" /> Sending…
                </>
              ) : (
                <>
                  <MailIcon className="w-4 h-4" /> Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DraftSkeleton() {
  return (
    <div className="space-y-4 animate-pulse-soft">
      <div>
        <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
        <div className="h-10 bg-slate-100 rounded-lg" />
      </div>
      <div>
        <div className="h-3 w-12 bg-slate-200 rounded mb-2" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-3 bg-slate-100 rounded"
              style={{ width: `${60 + ((i * 7) % 35)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
