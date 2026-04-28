import { UsersIcon, StarIcon, ChartIcon, BriefcaseIcon } from './Icons.jsx';

// Top-of-page stats strip. Computes everything from the candidates array we
// already have in state — no extra network call.
export default function Stats({ candidates }) {
  const total = candidates.length;
  const shortlisted = candidates.filter((c) => c.shortlisted).length;
  const scored = candidates.filter((c) => typeof c.score === 'number');
  const avg = scored.length
    ? Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length)
    : 0;
  const top = scored.length ? Math.max(...scored.map((c) => c.score)) : 0;

  const cards = [
    { label: 'Candidates', value: total, icon: UsersIcon, gradient: 'from-blue-500 to-cyan-500' },
    { label: 'Shortlisted', value: shortlisted, icon: StarIcon, gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Avg score', value: avg || '—', icon: ChartIcon, gradient: 'from-violet-500 to-purple-500' },
    { label: 'Top score', value: top || '—', icon: BriefcaseIcon, gradient: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in">
      {cards.map(({ label, value, icon: Icon, gradient }) => (
        <div
          key={label}
          className="card card-hover p-4 sm:p-5 relative overflow-hidden group"
        >
          <div
            className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`}
          />
          <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${gradient} text-white shadow-sm`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 tabular-nums">
              {value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
