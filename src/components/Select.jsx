export default function Select({ label, options, error, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        {...props}
        className={`border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400 transition bg-white ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
