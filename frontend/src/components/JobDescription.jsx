import { BriefcaseIcon } from './Icons.jsx';

// Job description card — title, company, and JD textarea.
// Lifted state lives in App so other components can reference job title / company.
export default function JobDescription({
  jobTitle,
  company,
  jd,
  onJobTitle,
  onCompany,
  onJd,
}) {
  return (
    <section className="card p-5 sm:p-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
          <BriefcaseIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Job description</h2>
          <p className="text-xs text-slate-500">What you're hiring for</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label">Job title</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => onJobTitle(e.target.value)}
            placeholder="Senior Backend Engineer"
            className="input"
          />
        </div>
        <div>
          <label className="label">Company</label>
          <input
            type="text"
            value={company}
            onChange={(e) => onCompany(e.target.value)}
            placeholder="Acme Inc."
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          value={jd}
          onChange={(e) => onJd(e.target.value)}
          rows={6}
          placeholder="Paste the full job description here. Include required skills, experience level, and key responsibilities…"
          className="input font-mono text-xs leading-relaxed resize-y"
        />
        <p className="mt-1.5 text-xs text-slate-400">
          {jd.length > 0 ? `${jd.length} characters` : 'Tip: include must-have skills explicitly for sharper scoring.'}
        </p>
      </div>
    </section>
  );
}
