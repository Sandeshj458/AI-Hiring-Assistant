import { UsersIcon, RefreshIcon, DownloadIcon, MailIcon, StarIcon, CheckIcon } from './Icons.jsx';

// Ranked candidate list. Renders as a table on desktop and a card stack on
// mobile so it's readable without horizontal scroll.
export default function CandidateTable({
  candidates,
  loading,
  shortlistedOnly,
  onToggleShortlistedOnly,
  onRefresh,
  onDraftEmail,
  actionStatus,
}) {
  return (
    <section className="card p-5 sm:p-6 animate-slide-up">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-sm">
            <UsersIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Candidates</h2>
            <p className="text-xs text-slate-500">
              {candidates.length} {candidates.length === 1 ? 'result' : 'results'}
              {shortlistedOnly ? ' · shortlisted only' : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={onRefresh} className="btn-secondary !px-3 !py-2">
            <RefreshIcon className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={onToggleShortlistedOnly}
            className={`btn-secondary !px-3 !py-2 ${
              shortlistedOnly ? '!bg-emerald-50 !text-emerald-700 !border-emerald-200' : ''
            }`}
          >
            <StarIcon className="w-4 h-4" />
            {shortlistedOnly ? 'Show all' : 'Shortlisted'}
          </button>
          <a href="/api/export" download className="btn-secondary !px-3 !py-2">
            <DownloadIcon className="w-4 h-4" /> CSV
          </a>
        </div>
      </div>

      {/* Action status pill — only shown when there's something to report
          (manual send result, refresh failure, etc.). The auto-send toggle
          itself lives on the upload card, so it isn't duplicated here. */}
      {actionStatus && (
        <div className="mb-4 flex justify-end">
          <ActionPill status={actionStatus} />
        </div>
      )}

      {loading && <SkeletonRows />}
      {!loading && candidates.length === 0 && <EmptyState shortlistedOnly={shortlistedOnly} />}

      {!loading && candidates.length > 0 && (
        <>
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto -mx-1">
            <table className="w-full">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="text-left px-3 py-3 font-semibold">Score</th>
                  <th className="text-left px-3 py-3 font-semibold">Candidate</th>
                  <th className="text-left px-3 py-3 font-semibold">Status</th>
                  <th className="text-right px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <DesktopRow key={c.candidateId} c={c} onDraftEmail={onDraftEmail} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card list */}
          <ul className="md:hidden space-y-3">
            {candidates.map((c) => (
              <MobileCard key={c.candidateId} c={c} onDraftEmail={onDraftEmail} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function DesktopRow({ c, onDraftEmail }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
      <td className="px-3 py-4 align-middle">
        <ScoreBadge score={c.score} />
      </td>
      <td className="px-3 py-4">
        <div className="font-medium text-slate-900">
          {c.name || <span className="text-slate-400 italic font-normal">unknown</span>}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{c.email || '—'}</div>
      </td>
      <td className="px-3 py-4">
        {c.shortlisted ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
            <StarIcon className="w-3 h-3" /> Shortlisted
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-3 py-4 text-right whitespace-nowrap">
        <RowActions c={c} onDraftEmail={onDraftEmail} />
      </td>
    </tr>
  );
}

function MobileCard({ c, onDraftEmail }) {
  return (
    <li className="border border-slate-200 rounded-xl p-4 bg-white">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 truncate">
            {c.name || <span className="text-slate-400 italic font-normal">unknown</span>}
          </div>
          <div className="text-xs text-slate-500 truncate mt-0.5">{c.email || '—'}</div>
        </div>
        <ScoreBadge score={c.score} />
      </div>
      {c.shortlisted && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
            <StarIcon className="w-3 h-3" /> Shortlisted
          </span>
        </div>
      )}
      <RowActions c={c} onDraftEmail={onDraftEmail} fullWidth />
    </li>
  );
}

// One shared block for both desktop & mobile rows: shows the action buttons
// until an email has been sent for that candidate, then collapses to a
// "Invited" / "Rejected" badge with timestamp tooltip.
function RowActions({ c, onDraftEmail, fullWidth }) {
  const history = c.emailHistory || [];
  const lastInvite = [...history].reverse().find((e) => e.kind === 'invite');
  const lastRejection = [...history].reverse().find((e) => e.kind === 'rejection');
  // Latest action wins — recruiters can rescind, but only the latest is shown.
  const latest = history[history.length - 1];

  if (latest) {
    return (
      <SentBadge entry={latest} onResend={() => onDraftEmail(c.candidateId, latest.kind)} fullWidth={fullWidth} />
    );
  }

  return (
    <div className={fullWidth ? 'flex gap-2' : 'inline-flex gap-2'}>
      <button
        onClick={() => onDraftEmail(c.candidateId, 'invite')}
        className={`text-xs font-medium px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors ${
          fullWidth ? 'flex-1' : ''
        }`}
        title={lastInvite ? 'Send another invite' : 'Send an invite'}
      >
        <MailIcon className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
        Invite
      </button>
      <button
        onClick={() => onDraftEmail(c.candidateId, 'rejection')}
        className={`text-xs font-medium px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors ${
          fullWidth ? 'flex-1' : ''
        }`}
        title={lastRejection ? 'Send another rejection' : 'Send a rejection'}
      >
        Reject
      </button>
    </div>
  );
}

function SentBadge({ entry, onResend, fullWidth }) {
  const isInvite = entry.kind === 'invite';
  const tone = isInvite
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
  const label = isInvite ? 'Invited' : 'Rejected';
  const when = formatRelative(entry.sentAt);
  return (
    <button
      type="button"
      onClick={onResend}
      title={`${label} ${when} · ${entry.to || 'no address recorded'}\nClick to resend`}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors ${tone} ${
        fullWidth ? 'w-full justify-center' : ''
      }`}
    >
      <CheckIcon className="w-3.5 h-3.5" />
      {label} <span className="font-normal opacity-70">· {when}</span>
    </button>
  );
}

// Compact "5m ago" / "2h ago" / "Apr 28" formatting for tooltips & badges.
function formatRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ScoreBadge({ score }) {
  if (typeof score !== 'number') {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const tone =
    score >= 80
      ? 'from-emerald-500 to-teal-500 ring-emerald-200'
      : score >= 60
      ? 'from-amber-500 to-orange-500 ring-amber-200'
      : 'from-rose-500 to-pink-500 ring-rose-200';
  return (
    <div
      className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${tone} text-white font-bold text-sm shadow-sm ring-4 ring-opacity-30`}
      title={`Match score: ${score}/100`}
    >
      {score}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3 animate-pulse-soft">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <div className="w-12 h-12 rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-1/3" />
            <div className="h-2.5 bg-slate-100 rounded w-1/2" />
          </div>
          <div className="w-20 h-6 bg-slate-100 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ shortlistedOnly }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
        <UsersIcon className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-700">
        {shortlistedOnly ? 'No shortlisted candidates yet' : 'No candidates yet'}
      </h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
        {shortlistedOnly
          ? 'Candidates scoring above the threshold will appear here automatically.'
          : 'Paste a job description above and upload resumes to get started.'}
      </p>
    </div>
  );
}

function ActionPill({ status }) {
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
