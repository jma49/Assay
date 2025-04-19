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
    <div className="overflow-x-auto mt-2 rounded-md border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/70">
            {headers.map((header) => (
              <TableHead key={header} className="py-2 px-3 text-xs font-medium">{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((row, index) => (
            <TableRow key={index} className="hover:bg-muted/30 transition-colors">
              {headers.map((header) => (
                <TableCell key={header} className="py-2 px-3 text-xs">
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
  );
}; 