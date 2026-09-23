interface Column {
  id: string;
  name: string;
}

export function EmployeeAllocationMatrix({
  title,
  description,
  employees,
  columns,
  hoursByEmployeeAndColumn,
}: {
  title: string;
  description?: string;
  employees: { id: string; full_name: string }[];
  columns: Column[];
  hoursByEmployeeAndColumn: Record<string, Record<string, number>>;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">{title}</h2>
      {description && <p className="mb-4 text-xs text-slate-400">{description}</p>}
      {columns.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Nothing to show yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left">Employee</th>
                {columns.map((c) => (
                  <th key={c.id} className="whitespace-nowrap px-3 py-2 text-right">
                    {c.name}
                  </th>
                ))}
                <th className="whitespace-nowrap px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const row = hoursByEmployeeAndColumn[emp.id] ?? {};
                const total = columns.reduce((sum, c) => sum + (row[c.id] ?? 0), 0);
                return (
                  <tr key={emp.id} className="group border-t border-slate-100 transition-colors duration-150 hover:bg-slate-50">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-700 transition-colors duration-150 group-hover:bg-slate-50">
                      {emp.full_name}
                    </td>
                    {columns.map((c) => (
                      <td key={c.id} className="tabular px-3 py-2 text-right text-slate-600">
                        {row[c.id] ? row[c.id] : <span className="text-slate-300">–</span>}
                      </td>
                    ))}
                    <td className="tabular px-3 py-2 text-right font-medium text-slate-800">
                      {total ? total : <span className="text-slate-300">–</span>}
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2} className="px-3 py-6 text-center text-slate-400">
                    No employees to show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
