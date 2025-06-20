import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RawResultsTableProps {
  results: Record<string, unknown>[];
  noDataText: string;
}

export const RawResultsTable = ({
  results,
  noDataText,
}: RawResultsTableProps) => {
  if (!results || results.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic mt-2">{noDataText}</p>
    );
  }

  const headers = Object.keys(results[0]);

  return (
    <div className="mt-2 rounded-md border shadow-sm overflow-hidden">
      <div className="overflow-x-auto max-w-full">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/70">
              {headers.map((header) => (
                <TableHead
                  key={header}
                  className="py-2 px-3 text-xs font-medium whitespace-nowrap min-w-24"
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((row, index) => (
              <TableRow
                key={index}
                className="hover:bg-muted/30 transition-colors"
              >
                {headers.map((header) => (
                  <TableCell
                    key={header}
                    className={`py-2 px-3 text-xs whitespace-nowrap min-w-24 ${
                      row[header] === null ? 'bg-red-50 dark:bg-red-900/20' : ''
                    }`}
                    title={`值: ${row[header]}, 类型: ${typeof row[header]}`}
                  >
                    {row[header] === null ? (
                      <span className="italic text-red-600 dark:text-red-400">
                        NULL
                      </span>
                    ) : row[header] === undefined ? (
                      <span className="italic text-yellow-600 dark:text-yellow-400">
                        undefined
                      </span>
                    ) : typeof row[header] === "string" ||
                      typeof row[header] === "number" ||
                      typeof row[header] === "boolean" ? (
                      String(row[header])
                    ) : (
                      <span className="text-blue-600 dark:text-blue-400">
                        {JSON.stringify(row[header])}
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
