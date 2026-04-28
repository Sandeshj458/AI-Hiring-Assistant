// Compact accessible toggle switch. Used for the "Auto-send emails" preference.
// Single source of truth — no duplicated styling across screens.
export default function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label
      className={`inline-flex items-start gap-3 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 mt-0.5
          ${checked ? 'bg-gradient-to-r from-indigo-500 to-violet-600' : 'bg-slate-300'}
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
            ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
        />
      </button>
      <span className="leading-tight">
        <span className="block text-xs font-semibold text-slate-700">{label}</span>
        {hint && <span className="block text-[11px] text-slate-500 mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}
