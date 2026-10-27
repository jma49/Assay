import { cellText } from "@/lib/utils/cells";
import { cn } from "@/lib/utils/utils";
import { columnLabel, findingColumns, numericColumns, type FindingDetail, type Language } from "./run-report";

/** The rows a run returned, printed as film: every row is lit because this run returned it. */
export function FindingsTable({ rows, language }: { rows: FindingDetail[]; language: Language }) {
  const columns = findingColumns(rows);
  const numeric = numericColumns(rows, columns);
  const zh = language === "zh";

  return (
    <div className="film-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((header) => (
              <th key={header} scope="col" className={cn(numeric.has(header) && "num")}>
                {columnLabel(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="lit">
              {columns.map((header) => {
                const value = row[header];
                return (
                  <td key={`${rowIndex}-${header}`} className={cn(numeric.has(header) && "num")} title={cellText(value)}>
                    {value === null || value === undefined ? (
                      <span className="text-ink-3 italic">{value === null ? "NULL" : "undefined"}</span>
                    ) : typeof value === "object" ? (
                      <span>{JSON.stringify(value)}</span>
                    ) : (
                      cellText(value)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="film-more">{zh ? `共 ${rows.length} 行` : `${rows.length} ${rows.length === 1 ? "row" : "rows"} in this report`}</p>
    </div>
  );
}
