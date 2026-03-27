export default function Table({ columns, data, actions }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-semibold">
                {col.label}
              </th>
            ))}
            {actions && <th className="px-4 py-3 text-left font-semibold">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8 text-gray-400">
                No records found
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row._id || i} className="hover:bg-gray-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-700">
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
                {actions && <td className="px-4 py-3">{actions(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
