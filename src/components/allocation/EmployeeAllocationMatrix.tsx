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
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-1 text-sm font-semibold text-ink">{title}</h2>
      {description && <p className="mb-4 text-xs text-muted">{description}</p>}
      {columns.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nothing to show yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="sticky left-0 z-10 bg-surface-2 px-3 py-2 text-left">Employee</th>
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
                  <tr key={emp.id} className="group border-t border-line transition-colors duration-150 hover:bg-surface-2">
                    <td className="sticky left-0 z-10 bg-surface px-3 py-2 font-medium text-ink transition-colors duration-150 group-hover:bg-surface-2">
                      {emp.full_name}
                    </td>
                    {columns.map((c) => (
                      <td key={c.id} className="tabular px-3 py-2 text-right text-ink-soft">
                        {row[c.id] ? row[c.id] : <span className="text-muted">–</span>}
                      </td>
                    ))}
                    <td className="tabular px-3 py-2 text-right font-medium text-ink">
                      {total ? total : <span className="text-muted">–</span>}
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2} className="px-3 py-6 text-center text-muted">
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
