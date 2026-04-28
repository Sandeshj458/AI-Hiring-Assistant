import { useEffect, useState, useCallback } from 'react';

import { api } from './api.js';
import JobDescription from './components/JobDescription.jsx';
import ResumeUpload from './components/ResumeUpload.jsx';
import CandidateTable from './components/CandidateTable.jsx';
import EmailDraft from './components/EmailDraft.jsx';
import Stats from './components/Stats.jsx';
import { SparklesIcon } from './components/Icons.jsx';

// Top-level page. Holds the JD + candidate list state and wires the children
// together. Children are presentational — App owns the network calls.
export default function App() {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jd, setJd] = useState('');

  const [candidates, setCandidates] = useState([]);
  const [shortlistedOnly, setShortlistedOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  // Two separate status slots so an email-action message doesn't surface in
  // the upload card and vice-versa. Same shape: { kind: 'ok'|'info'|'warn'|'error', text }.
  const [uploadStatus, setUploadStatus] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);

  const [emailContext, setEmailContext] = useState(null); // { candidateId, kind }

  // Auto-send: when ON, clicking Invite/Reject sends the email immediately
  // without showing the review modal. When OFF (default), the modal opens
  // so the recruiter can edit before sending.
  const [autoSend, setAutoSend] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = shortlistedOnly ? await api.shortlisted() : await api.candidates();
      setCandidates(res.items || []);
    } catch (err) {
      setActionStatus({ kind: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [shortlistedOnly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Single entry point for both invite and rejection actions on a row.
  // Branches on `autoSend`:
  //   - manual: open the EmailDraft modal (existing flow, recruiter reviews)
  //   - auto:   generate + send via SMTP, no modal, status pill feedback
  // Manual mode only — opens the modal so the recruiter can edit & send.
  // Auto-send is decided up-front (during upload) and runs server-side, so
  // row-level Invite/Reject buttons just open the editor.
  const handleEmailAction = (candidateId, kind) => {
    setEmailContext({ candidateId, kind });
  };

  const handleProcess = async (files) => {
    if (!files.length) return setUploadStatus({ kind: 'warn', text: 'Pick at least one resume.' });
    if (!jd.trim()) return setUploadStatus({ kind: 'warn', text: 'Paste a job description first.' });

    const verb = autoSend ? 'Processing & emailing' : 'Processing';
    setUploadStatus({ kind: 'info', text: `${verb} ${files.length} resume(s)…` });

    try {
      const res = await api.batchProcess({
        files,
        jobTitle: jobTitle || 'Open role',
        jobDescription: jd,
        company: company || 'our team',
        autoSend,
      });
      const failed = res.results.filter((r) => r.error).length;
      const sentCount = res.results.filter((r) => r.email?.status === 'sent').length;
      const sentNote = autoSend ? ` · ${sentCount} email(s) sent` : '';
      setUploadStatus({
        kind: failed ? 'warn' : 'ok',
        text: `Processed ${res.processed} — ${res.processed - failed} ok, ${failed} failed${sentNote}.`,
      });
      await refresh();
    } catch (err) {
      setUploadStatus({ kind: 'error', text: err.message });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <Stats candidates={candidates} />

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <JobDescription
              jobTitle={jobTitle}
              company={company}
              jd={jd}
              onJobTitle={setJobTitle}
              onCompany={setCompany}
              onJd={setJd}
            />
          </div>
          <div className="lg:col-span-2">
            <ResumeUpload
              onProcess={handleProcess}
              status={uploadStatus}
              autoSend={autoSend}
              onToggleAutoSend={setAutoSend}
            />
          </div>
        </div>

        <CandidateTable
          candidates={candidates}
          loading={loading}
          shortlistedOnly={shortlistedOnly}
          onToggleShortlistedOnly={() => setShortlistedOnly((v) => !v)}
          onRefresh={refresh}
          onDraftEmail={handleEmailAction}
          actionStatus={actionStatus}
        />

        <Footer />
      </main>

      {emailContext && (
        <EmailDraft
          context={emailContext}
          jobTitle={jobTitle || 'the role'}
          company={company || 'our team'}
          onClose={() => setEmailContext(null)}
          onSent={refresh}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/70 border-b border-slate-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              AI Hiring Assistant
            </h1>
            <p className="hidden sm:block text-xs text-slate-500 leading-tight">
              Parse, score, shortlist, reach out — all in one place.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="text-center pt-4 pb-2">
      <p className="text-xs text-slate-400">
        Resumes stored on AWS S3 · LLM-powered parsing &amp; scoring
      </p>
    </footer>
  );
}
