import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Database, ExternalLink, Filter, Search, X, FileText, MoreHorizontal } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  needsAttentionCount: number;
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
  needsAttentionCount,
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
  const [pageInput, setPageInput] = useState('');

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput(''); // 清空输入框
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit(e);
    }
    // 限制只能输入数字
    if (!/[\d\b]/.test(e.key) && !['ArrowLeft', 'ArrowRight', 'Delete', 'Backspace', 'Tab'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
      {/* 装饰性背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
      
      <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                <Clock className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <span className="text-gradient">{t('historyTitle')}</span>
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {t('historyDesc').replace('%s', String(allChecksCount))}
            </CardDescription>
          </div>

          <div className="w-full sm:w-auto space-y-4">
            {/* 第一行：All筛选器和搜索栏 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
              <Button
                variant={filterStatus === null ? "default" : "outline"}
                size="sm"
                onClick={() => { setFilterStatus(null); setCurrentPage(1); }}
                className="h-11 px-4 gap-2 text-sm transition-all duration-300 shadow-md hover:shadow-lg group/filter flex-1 sm:flex-initial sm:min-w-[120px]"
              >
                <Filter size={14} className="group-hover/filter:rotate-12 transition-transform duration-200" /> 
                {t('filterAll')} 
                <Badge variant="secondary" className="ml-0.5 h-5 text-xs px-2 bg-primary/10 text-primary border-primary/20">
                  {allChecksCount}
                </Badge>
              </Button>
              
              {/* 搜索栏 */}
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 text-sm rounded-lg border-2 border-border/50 bg-background/80 backdrop-blur-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-offset-2 focus:border-primary/50 shadow-md transition-all duration-300 placeholder:text-muted-foreground/60"
                />
                {searchTerm && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-1 top-1 h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-all duration-200" 
                    onClick={() => setSearchTerm('')}
                  >
                    <span className="sr-only">{t('clearSearch')}</span>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* 第二行：Success、Attention、Failure筛选器 */}
            <div className="flex items-center gap-3 w-full">
              <Button
                variant={filterStatus === CheckStatus.SUCCESS ? "default" : "outline"}
                size="sm"
                onClick={() => { setFilterStatus(CheckStatus.SUCCESS); setCurrentPage(1); }}
                className="h-11 px-4 gap-2 text-sm transition-all duration-300 shadow-md hover:shadow-lg group/filter flex-1 min-w-0"
              >
                <CheckCircle size={14} className="group-hover/filter:scale-110 transition-transform duration-200" /> 
                <span className="truncate">{t('filterSuccess')}</span> 
                <Badge variant="secondary" className="ml-0.5 h-5 text-xs px-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                  {successCount}
                </Badge>
              </Button>
              <Button
                variant={filterStatus === "attention_needed" ? "default" : "outline"}
                size="sm"
                onClick={() => { setFilterStatus("attention_needed"); setCurrentPage(1); }}
                className="h-11 px-4 gap-2 text-sm transition-all duration-300 shadow-md hover:shadow-lg group/filter flex-1 min-w-0"
              >
                <AlertCircle size={14} className="group-hover/filter:scale-110 transition-transform duration-200" /> 
                <span className="truncate">{t('needsAttention')}</span> 
                <Badge variant="secondary" className="ml-0.5 h-5 text-xs px-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                  {needsAttentionCount}
                </Badge>
              </Button>
              <Button
                variant={filterStatus === CheckStatus.FAILURE ? "default" : "outline"}
                size="sm"
                onClick={() => { setFilterStatus(CheckStatus.FAILURE); setCurrentPage(1); }}
                className="h-11 px-4 gap-2 text-sm transition-all duration-300 shadow-md hover:shadow-lg group/filter flex-1 min-w-0"
              >
                <AlertCircle size={14} className="group-hover/filter:scale-110 transition-transform duration-200" /> 
                <span className="truncate">{t('filterFailed')}</span> 
                <Badge variant="secondary" className="ml-0.5 h-5 text-xs px-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
                  {failureCount}
                </Badge>
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/40 to-muted/20 hover:from-muted/50 hover:to-muted/30 border-b-2 border-border/30">
                <TableHead className="h-14 px-4 sm:px-6 font-semibold text-foreground">{t('tableStatus')}</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/30 transition-colors px-4 sm:px-6 font-semibold text-foreground group/sort"
                  onClick={() => requestSort('script_name')}
                >
                  <div className="flex items-center gap-2">
                    {t('tableScriptName')}
                    {sortConfig.key === 'script_name' && (
                      <span className="text-primary">
                        {sortConfig.direction === 'ascending' ? 
                          <ChevronUp className="h-4 w-4 inline-block" /> : 
                          <ChevronDown className="h-4 w-4 inline-block" />
                        }
                      </span>
                    )}
                    <ChevronUp className="h-3 w-3 opacity-30 group-hover/sort:opacity-60 transition-opacity duration-200" />
                  </div>
                </TableHead>
                <TableHead 
                  className="hidden md:table-cell cursor-pointer hover:bg-muted/30 transition-colors px-4 sm:px-6 font-semibold text-foreground group/sort"
                  onClick={() => requestSort('execution_time')}
                >
                  <div className="flex items-center gap-2">
                    {t('tableExecutionTime')}
                    {sortConfig.key === 'execution_time' && (
                      <span className="text-primary">
                        {sortConfig.direction === 'ascending' ? 
                          <ChevronUp className="h-4 w-4 inline-block" /> : 
                          <ChevronDown className="h-4 w-4 inline-block" />
                        }
                      </span>
                    )}
                    <ChevronUp className="h-3 w-3 opacity-30 group-hover/sort:opacity-60 transition-opacity duration-200" />
                  </div>
                </TableHead>
                <TableHead className="hidden sm:table-cell max-w-xs px-4 sm:px-6 font-semibold text-foreground">{t('tableFindings')}</TableHead>
                <TableHead className="text-center px-4 sm:px-6 font-semibold text-foreground">{t('tableActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedChecks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border-2 border-dashed border-muted-foreground/20">
                        <Database className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-muted-foreground">{t('noDataFound')}</p>
                        <p className="text-sm text-muted-foreground/70">{t('noMatchingExecutionRecords')}</p>
                      </div>
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
                    <TableCell className="px-4 sm:px-6">
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
                    <TableCell className="font-medium px-4 sm:px-6">
                      {check.script_name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground px-4 sm:px-6">
                      {formatDate(check.execution_time, language)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell max-w-xs truncate px-4 sm:px-6" title={check.findings || check.message || t('noData')}>
                      {check.findings || check.message || <span className="italic text-muted-foreground">{t('noData')}</span>}
                    </TableCell>
                    <TableCell className="text-center px-4 sm:px-6">
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
                              <SheetTitle>{t('checkDetailsTitle')} - {check.script_name}</SheetTitle>
                              <SheetDescription>
                                {t('checkDetailsDesc').replace('{scriptId}', check.script_id).replace('{executionTime}', formatDate(check.execution_time, language))}
                              </SheetDescription>
                            </SheetHeader>
                            <CheckDetails check={check} t={t} mode="sheet" />
                            <SheetFooter className="pt-4 mt-auto border-t">
                                <Link href={`/view-execution-result/${check._id}`} passHref legacyBehavior>
                                  <Button asChild variant="outline">
                                    <a>
                                      <FileText className="mr-2 h-4 w-4" />
                                      {t('viewFullReportButton') || 'View Full Report'}
                                    </a>
                                  </Button>
                                </Link>
                            </SheetFooter>
                          </SheetContent>
                        </Sheet>
                      </div>
                    </TableCell>
                  </TableRow>

                  {expandedCheckId === check._id && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={5} className="p-0">
                        <div className="p-4 overflow-x-hidden">
                          <CheckDetails check={check} mode="expanded" t={t} />
                        </div>
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
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t px-5 py-3 text-xs gap-2">
          <div className="text-muted-foreground text-center sm:text-left">
            {t('pageInfo')
              .replace('%s', String(startIndex + 1))
              .replace('%s', String(Math.min(endIndex, allChecksCount)))
              .replace('%s', String(allChecksCount))
              .replace('%s', String(currentPage))
              .replace('%s', String(totalPages))
            }
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="h-7 px-2 text-xs shadow-sm hover:shadow transition-all duration-150"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">{t('previous')}</span>
            </Button>
            
            <div className="flex items-center gap-1.5 px-2">
              <div className="hidden md:flex items-center gap-1">
                {currentPage > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
                    title={t('jumpToFirst')}
                  >
                    1
                  </Button>
                )}
                {currentPage > 3 && <span className="text-muted-foreground">...</span>}
              </div>
              
              <span className="text-muted-foreground text-xs">{t('pageNumber')}</span>
              <span className="font-medium text-xs min-w-[1.5rem] text-center">{currentPage}</span>
              <span className="text-muted-foreground text-xs">{t('of')} {totalPages} {t('pages')}</span>
              
              <div className="hidden md:flex items-center gap-1">
                {currentPage < totalPages - 2 && <span className="text-muted-foreground">...</span>}
                {currentPage < totalPages && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
                    title={t('jumpToLast')}
                  >
                    {totalPages}
                  </Button>
                )}
              </div>
              
              {totalPages > 5 && (
                <div className="hidden lg:flex items-center gap-1 ml-2">
                  <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                  <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={pageInput}
                      onChange={handlePageInputChange}
                      onKeyDown={handlePageInputKeyDown}
                      placeholder={t('jumpToPage')}
                      className="w-12 h-6 px-1 text-xs text-center border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={!pageInput || isNaN(parseInt(pageInput, 10)) || parseInt(pageInput, 10) < 1 || parseInt(pageInput, 10) > totalPages}
                      className="h-6 px-2 text-xs"
                      title={t('pageJump')}
                    >
                      {t('pageJump')}
                    </Button>
                  </form>
                </div>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-7 px-2 text-xs shadow-sm hover:shadow transition-all duration-150"
            >
              <span className="hidden sm:inline">{t('next')}</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}; 