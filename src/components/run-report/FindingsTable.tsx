import { cn } from "@/lib/utils/utils";
import { cellText } from "@/lib/utils/cells";
import { columnLabel, findingColumns, numericColumns, type FindingDetail, type Language } from "./run-report";
import { useDragScrollbar } from "./useDragScrollbar";

export function FindingsTable({ rows, language }: { rows: FindingDetail[]; language: Language }) {
  const { scrollContainerRef, scrollBarRef, isDragging, showScrollBar, thumbWidth, handleScrollBarMouseDown, handleContainerScroll } =
    useDragScrollbar(rows);
  const columns = findingColumns(rows);
  const numeric = numericColumns(rows, columns);

  return (
    <div className="space-y-4">
      <div
        ref={scrollContainerRef}
        onScroll={handleContainerScroll}
        className="overflow-x-auto"
      >
        <table className="min-w-full">
          <thead className="sticky top-0 z-10">
            <tr className="border-b bg-card">
              {columns.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className={cn(
                    "h-10 px-4 text-body-sm font-normal whitespace-nowrap text-muted-foreground",
                    numeric.has(header) ? "text-right" : "text-left",
                  )}
                >
                  {columnLabel(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="transition-colors hover:bg-muted/40">
                {columns.map((header) => {
                  const value = row[header];
                  return (
                    <td
                      key={`${rowIndex}-${header}`}
                      className={cn(
                        "px-4 py-2.5 font-mono text-body-sm whitespace-nowrap",
                        numeric.has(header) && "text-right",
                      )}
                    >
                      {value === null || value === undefined ? (
                        <span className="text-muted-foreground italic">
                          {value === null ? "NULL" : "undefined"}
                        </span>
                      ) : typeof value === "object" ? (
                        <span className="text-primary">
                          {JSON.stringify(value)}
                        </span>
                      ) : (
                        <span className="tabular-nums">
                          {cellText(value)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showScrollBar && (
        <div className="relative h-3 bg-muted/20 rounded-none border border-border/20 mx-4">
          <div
            ref={scrollBarRef}
            className={cn(
              "absolute top-0 h-full rounded-none cursor-grab transition-colors duration-200 border border-primary/20",
              isDragging
                ? "cursor-grabbing bg-primary/90  "
                : "  "
            )}
            style={{
              width: `${thumbWidth}%`,
              transform: "translateX(0px)",
              transition: isDragging
                ? "none"
                : "transform 0.1s ease-out, box-shadow 0.2s ease-out",
            }}
            onMouseDown={handleScrollBarMouseDown}
            title={language === "en" ? "Drag to scroll horizontally" : "拖动以横向滚动表格"}
          />
        </div>
      )}
    </div>
  );
}
