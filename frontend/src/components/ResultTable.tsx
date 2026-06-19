type Props = { rows?: Record<string, unknown>[] };

export function ResultTable({ rows = [] }: Props) {
  if (!rows.length) return <div className="empty">No rows yet. Run an action or query.</div>;
  const columns = Object.keys(rows[0]).slice(0, 10);
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{columns.map((column) => <td key={column}>{String(row[column] ?? "")}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
