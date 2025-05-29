import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RawResultsTableProps {
  results: Record<string, unknown>[];
  noDataText: string;
}

export const RawResultsTable = ({ results, noDataText }: RawResultsTableProps) => {
  if (!results || results.length === 0) {
    return <p className="text-sm text-muted-foreground italic mt-2">{noDataText}</p>;
  }
  
  const headers = Object.keys(results[0]);
  
  return (
    <div className="mt-2 rounded-md border shadow-sm overflow-hidden">
      <div className="overflow-x-auto max-w-full">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/70">
              {headers.map((header) => (
                <TableHead key={header} className="py-2 px-3 text-xs font-medium whitespace-nowrap min-w-24">{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((row, index) => (
              <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                {headers.map((header) => (
                  <TableCell key={header} className="py-2 px-3 text-xs whitespace-nowrap min-w-24" title={String(row[header])}>
                    {typeof row[header] === 'string' || typeof row[header] === 'number' || typeof row[header] === 'boolean'
                      ? String(row[header])
                      : JSON.stringify(row[header])}
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