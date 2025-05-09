import React from 'react';
import { AlertCircle, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Database, ExternalLink, Filter, Search, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Check, CheckStatus, DashboardTranslationKeys } from './types';
import { formatDate } from './utils';
import { CheckDetails } from './CheckDetails';

interface CheckHistoryProps {
  paginatedChecks: Check[];
  allChecksCount: number;
  totalPages: number;
  currentPage: number;
  filterStatus: string | null;
  searchTerm: string;
  expandedCheckId: string | null;
  sortConfig: {
    key: keyof Check | '';
    direction: 'ascending' | 'descending';
  };
  successCount: number;
  failureCount: number;
  language: string;
  t: (key: DashboardTranslationKeys) => string;
  toggleExpand: (checkId: string) => void;
  setFilterStatus: (status: string | null) => void;
  setSearchTerm: (term: string) => void;
  setCurrentPage: (page: number) => void;
  requestSort: (key: keyof Check) => void;
  startIndex: number;
  endIndex: number;
}

export const CheckHistory: React.FC<CheckHistoryProps> = ({
  paginatedChecks,
  allChecksCount,
  totalPages,
  currentPage,
  filterStatus,
  searchTerm,
  expandedCheckId,
  sortConfig,
  successCount,
  failureCount,
  language,
  t,
  toggleExpand,
  setFilterStatus,
  setSearchTerm,
  setCurrentPage,
  requestSort,
  startIndex,
  endIndex
}) => {
  return (
    <Card className="unified-card shadow-sm hover:shadow-md transition-all duration-300 bg-card bg-opacity-[.98] dark:bg-opacity-[.98]">
      <CardHeader className="px-5 py-4 bg-card/50 border-b border-border/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="icon-container bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              {t('historyTitle')}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('historyDesc').replace('%s', String(allChecksCount))}
            </CardDescription>
          </div>

          <div className="w-full sm:w-auto space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 justify-between sm:justify-end">
              <Button
                variant={filterStatus === null ? "default" : "outline"}
                size="sm"
                onClick={() => { setFilterStatus(null); setCurrentPage(1); }}
                className="h-7 px-2 gap-1 text-xs transition-all duration-200 shadow-sm hover:shadow"
              >
                <Filter size={12} /> {t('filterAll')} <Badge variant="secondary" className="ml-0.5 h-4 text-[10px] px-1">{allChecksCount}</Badge>
              </Button>
              <Button
                variant={filterStatus === CheckStatus.SUCCESS ? "default" : "outline"}
                size="sm"
                onClick={() => { setFilterStatus(CheckStatus.SUCCESS); setCurrentPage(1); }}
                className="h-7 px-2 gap-1 text-xs transition-all duration-200 shadow-sm hover:shadow"
              >
                <CheckCircle size={12} /> {t('filterSuccess')} <Badge variant="secondary" className="ml-0.5 h-4 text-[10px] px-1">{successCount}</Badge>
              </Button>
              <Button
                variant={filterStatus === CheckStatus.FAILURE ? "default" : "outline"}
                size="sm"
                onClick={() => { setFilterStatus(CheckStatus.FAILURE); setCurrentPage(1); }}
                className="h-7 px-2 gap-1 text-xs transition-all duration-200 shadow-sm hover:shadow"
              >
                <AlertCircle size={12} /> {t('filterFailed')} <Badge variant="secondary" className="ml-0.5 h-4 text-[10px] px-1">{failureCount}</Badge>
              </Button>
            </div>
            
            <div className="relative w-full">
              <div className="flex w-full items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-9 pl-8 pr-8 text-sm rounded-md border border-input bg-card/50 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:ring-offset-2 shadow-sm"
                  />
                  {searchTerm && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute right-1 top-1 h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80" 
                      onClick={() => setSearchTerm('')}
                    >
                      <span className="sr-only">{t('clearSearch')}</span>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/40">
                <TableHead className="w-[100px]">{t('tableStatus')}</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => requestSort('script_name')}
                >
                  <div className="flex items-center">
                    {t('tableScriptName')}
                    {sortConfig.key === 'script_name' && (
                      <span className="ml-1 text-primary">
                        {sortConfig.direction === 'ascending' ? <ChevronUp className="h-3.5 w-3.5 inline-block" /> : <ChevronDown className="h-3.5 w-3.5 inline-block" />}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="hidden md:table-cell cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => requestSort('execution_time')}
                >
                  <div className="flex items-center">
                    {t('tableExecutionTime')}
                    {sortConfig.key === 'execution_time' && (
                      <span className="ml-1 text-primary">
                        {sortConfig.direction === 'ascending' ? <ChevronUp className="h-3.5 w-3.5 inline-block" /> : <ChevronDown className="h-3.5 w-3.5 inline-block" />}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="hidden sm:table-cell max-w-xs">{t('tableFindings')}</TableHead>
                <TableHead className="text-center">{t('tableActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedChecks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center">
                      <div className="icon-container bg-muted/20 rounded-lg p-1 mb-3">
                        <Database className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <p className="font-medium">{t('noMatchingRecords')}</p>
                      {filterStatus && (
                        <Button
                          onClick={() => setFilterStatus(null)}
                          variant="link"
                          className="mt-1.5"
                        >
                          {t('clearFilters')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {paginatedChecks.map((check) => (
                <React.Fragment key={check._id}>
                  <TableRow className={cn(
                    "transition-colors hover:bg-muted/20",
                    expandedCheckId === check._id ? "bg-muted/60" : ""
                  )}>
                    <TableCell>
                      {check.statusType === "attention_needed" ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-700">
                          <AlertCircle className="h-3.5 w-3.5 mr-1 text-yellow-600 dark:text-yellow-500" />
                          {t('needsAttention') || 'Attention Needed'}
                        </Badge>
                      ) : check.status === CheckStatus.SUCCESS ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          {t('filterSuccess')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                          <AlertCircle className="h-3.5 w-3.5 mr-1" />
                          {t('filterFailed')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {check.script_name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {formatDate(check.execution_time, language)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell max-w-xs truncate" title={check.findings || check.message || t('noData')}>
                      {check.findings || check.message || <span className="italic text-muted-foreground">{t('noData')}</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1.5">
                        <Button
                          variant={expandedCheckId === check._id ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleExpand(check._id)}
                          className="h-7 px-2 text-xs shadow-sm transition-all duration-150 hover:shadow"
                          title={expandedCheckId === check._id ? t('collapseDetails') : t('expandDetails')}
                        >
                          {expandedCheckId === check._id ? (
                            <><ChevronUp size={12} className="mr-1"/>{t('collapse')}</>
                          ) : (
                            <><ChevronDown size={12} className="mr-1"/>{t('expand')}</>
                          )}
                        </Button>
                        
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 shadow-sm transition-all duration-150 hover:shadow hover:bg-muted/70 focus:ring-1 focus:ring-primary/30"
                              title={t('viewInSidebar')}
                            >
                              <ExternalLink size={12} />
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="overflow-y-auto sm:max-w-md">
                            <SheetHeader className="border-b pb-4">
                              <SheetTitle className="text-xl flex items-center gap-2">
                                {check.statusType === "attention_needed" ? (
                                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                                ) : check.status === CheckStatus.SUCCESS ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-red-500" />
                                )}
                                {t('checkDetails')}
                              </SheetTitle>
                              <SheetDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm">
                                <span className="font-semibold">{check.script_name}</span>
                                <span className="hidden sm:inline text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{formatDate(check.execution_time, language)}</span>
                              </SheetDescription>
                            </SheetHeader>
                            <CheckDetails check={check} mode="sheet" t={t} />
                          </SheetContent>
                        </Sheet>
                      </div>
                    </TableCell>
                  </TableRow>

                  {expandedCheckId === check._id && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={5} className="p-4">
                        <CheckDetails check={check} mode="expanded" t={t} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="flex items-center justify-between border-t px-4 py-2.5 text-xs bg-card/50">
          <div className="text-muted-foreground">
            {t('pageInfo')
              .replace('%s', String(startIndex + 1))
              .replace('%s', String(Math.min(endIndex, allChecksCount)))
              .replace('%s', String(allChecksCount))
              .replace('%s', String(currentPage))
              .replace('%s', String(totalPages))
            }
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="h-7 px-2 text-xs shadow-sm hover:shadow transition-all duration-150"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              {t('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-7 px-2 text-xs shadow-sm hover:shadow transition-all duration-150"
            >
              {t('next')}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}; 