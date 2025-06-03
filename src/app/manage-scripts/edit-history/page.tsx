"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  User,
  Calendar,
  Edit,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Filter,
  RotateCcw,
  Search,
  ArrowLeft,
  FileText,
  Eye,
} from "lucide-react";
import { formatDate } from "@/components/dashboard/utils";
import {
  EditHistoryRecord,
  EditHistoryFilter,
} from "@/lib/edit-history-schema";
import {
  DashboardTranslationKeys,
  dashboardTranslations,
} from "@/components/dashboard/types";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import UserHeader from "@/components/UserHeader";

export default function GlobalEditHistoryPage() {
  const { language } = useLanguage();
  const t = useCallback(
    (key: DashboardTranslationKeys | string): string => {
      const langTranslations =
        dashboardTranslations[language] || dashboardTranslations.en;
      return (langTranslations as Record<string, string>)[key] || key;
    },
    [language],
  );

  const [histories, setHistories] = useState<EditHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filter states
  const [scriptNameFilter, setScriptNameFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [operationFilter, setOperationFilter] =
    useState<EditHistoryFilter["operation"]>("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  // Detail dialog state
  const [selectedHistory, setSelectedHistory] =
    useState<EditHistoryRecord | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // API调用去重：使用ref来跟踪是否正在调用
  const isFetchingRef = useRef(false);

  const fetchHistories = useCallback(
    async (
      params: {
        scriptName?: string;
        author?: string;
        operation?: EditHistoryFilter["operation"];
        dateFrom?: Date;
        dateTo?: Date;
        page?: number;
        limit?: number;
      } = {},
    ) => {
      // 去重检查：如果已经在调用中，直接返回
      if (isFetchingRef.current) {
        console.log("fetchHistories: 已有请求在进行中，跳过重复调用");
        return;
      }

      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams();
        if (params.scriptName?.trim())
          searchParams.set("scriptName", params.scriptName.trim());
        if (params.author?.trim())
          searchParams.set("author", params.author.trim());
        if (params.operation && params.operation !== "all")
          searchParams.set("operation", params.operation);
        if (params.dateFrom)
          searchParams.set("dateFrom", params.dateFrom.toISOString());
        if (params.dateTo)
          searchParams.set("dateTo", params.dateTo.toISOString());
        searchParams.set("page", String(params.page || 1));
        searchParams.set("limit", "20");
        searchParams.set("sortBy", "operationTime");
        searchParams.set("sortOrder", "desc");

        const response = await fetch(`/api/edit-history?${searchParams}`);
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Unauthorized access");
          }
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch edit history");
        }

        const data = await response.json();
        setHistories(data.histories || []);
        setTotalPages(data.pagination?.totalPages || 0);
        setTotalRecords(data.pagination?.total || 0);
        setCurrentPage(data.pagination?.page || 1);
      } catch (err) {
        console.error("Failed to fetch edit history:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        setHistories([]);
        setTotalPages(0);
        setTotalRecords(0);
      } finally {
        setLoading(false);
        isFetchingRef.current = false; // 重置标志
      }
    },
    [],
  );

  useEffect(() => {
    fetchHistories();
  }, [fetchHistories]);

  const applyFilters = useCallback(() => {
    const filterParams = {
      scriptName: scriptNameFilter || undefined,
      author: authorFilter || undefined,
      operation: operationFilter,
      dateFrom: dateFromFilter ? new Date(dateFromFilter) : undefined,
      dateTo: dateToFilter ? new Date(dateToFilter) : undefined,
      page: 1,
    };
    fetchHistories(filterParams);
  }, [
    scriptNameFilter,
    authorFilter,
    operationFilter,
    dateFromFilter,
    dateToFilter,
    fetchHistories,
  ]);

  const resetFilters = useCallback(() => {
    setScriptNameFilter("");
    setAuthorFilter("");
    setOperationFilter("all");
    setDateFromFilter("");
    setDateToFilter("");
    fetchHistories({ page: 1 });
  }, [fetchHistories]);

  const handlePageChange = useCallback(
    (page: number) => {
      const filterParams = {
        scriptName: scriptNameFilter || undefined,
        author: authorFilter || undefined,
        operation: operationFilter,
        dateFrom: dateFromFilter ? new Date(dateFromFilter) : undefined,
        dateTo: dateToFilter ? new Date(dateToFilter) : undefined,
        page,
      };
      fetchHistories(filterParams);
    },
    [
      scriptNameFilter,
      authorFilter,
      operationFilter,
      dateFromFilter,
      dateToFilter,
      fetchHistories,
    ],
  );

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case "create":
        return <Plus className="w-4 h-4 text-green-600" />;
      case "update":
        return <Edit className="w-4 h-4 text-blue-600" />;
      case "delete":
        return <Trash2 className="w-4 h-4 text-red-600" />;
      default:
        return <History className="w-4 h-4 text-gray-600" />;
    }
  };

  const getOperationBadgeColor = (operation: string) => {
    switch (operation) {
      case "create":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
      case "update":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
      case "delete":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  const getOperationText = (operation: string) => {
    switch (operation) {
      case "create":
        return t("operationCreate");
      case "update":
        return t("operationUpdate");
      case "delete":
        return t("operationDelete");
      default:
        return operation;
    }
  };

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined) return t("noData");
    if (typeof value === "boolean") return value ? t("scheduled") : t("manual");
    if (typeof value === "string" && value.length > 50)
      return value.substring(0, 50) + "...";
    return String(value);
  };

  const formatPageInfo = () => {
    const start = Math.min((currentPage - 1) * 20 + 1, totalRecords);
    const end = Math.min(currentPage * 20, totalRecords);
    if (totalRecords === 0) {
      return t("noResults");
    }
    return t("pageInfo")
      .replace("%s-%s", `${start}-${end}`)
      .replace("%s", String(totalRecords))
      .replace("%s", String(currentPage))
      .replace("%s", String(totalPages));
  };

  const handleViewDetails = (history: EditHistoryRecord) => {
    setSelectedHistory(history);
    setIsDetailDialogOpen(true);
  };

  const getChangesPreview = (changes: EditHistoryRecord["changes"]) => {
    if (!changes || changes.length === 0) return t("noChanges");
    if (changes.length === 1) {
      return changes[0].fieldDisplayNameCn || changes[0].fieldDisplayName;
    }
    return t("fieldChangesCount").replace("{count}", String(changes.length));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <UserHeader />
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-8 animate-fadeIn">
          {/* Header Section */}
          <header className="text-center lg:text-left">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center gap-4">
                <Link href="/manage-scripts">
                  <Button
                    variant="outline"
                    size="icon"
                    className="group shadow-md hover:shadow-lg transition-all duration-300 hover:bg-primary/5 hover:border-primary/30"
                  >
                    <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </Button>
                </Link>
                <div className="space-y-3">
                  <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent leading-tight py-1 flex items-center gap-4">
                    <History className="w-10 h-10 text-primary" />
                    {t("allScriptsHistory")}
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {t("editHistoryDescGlobal")} • {t("totalChanges")}:{" "}
                    <span className="font-semibold text-primary">
                      {totalRecords}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Filters Section */}
          <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />

            <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                  <Filter className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <CardTitle className="text-xl font-bold text-foreground leading-relaxed">
                  {t("searchHistoryWithFilters")}
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="relative p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Script Name Filter */}
                <div className="space-y-2">
                  <Label
                    htmlFor="script-name-filter"
                    className="text-sm font-semibold text-foreground/90 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-400/60"></div>
                    {t("scriptName")}
                  </Label>
                  <Input
                    id="script-name-filter"
                    type="text"
                    placeholder={t("searchScriptsPlaceholder")}
                    value={scriptNameFilter}
                    onChange={(e) => setScriptNameFilter(e.target.value)}
                    className="w-full h-11 text-sm border-2 border-border/50 bg-background/80 backdrop-blur-sm focus:border-primary/50 shadow-sm transition-all duration-300"
                  />
                </div>

                {/* Author Filter */}
                <div className="space-y-2">
                  <Label
                    htmlFor="author-filter"
                    className="text-sm font-semibold text-foreground/90 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-400/60"></div>
                    {t("author")}
                  </Label>
                  <Input
                    id="author-filter"
                    type="text"
                    placeholder={t("author")}
                    value={authorFilter}
                    onChange={(e) => setAuthorFilter(e.target.value)}
                    className="w-full h-11 text-sm border-2 border-border/50 bg-background/80 backdrop-blur-sm focus:border-primary/50 shadow-sm transition-all duration-300"
                  />
                </div>

                {/* Operation Type Filter */}
                <div className="space-y-2">
                  <Label
                    htmlFor="operation-filter"
                    className="text-sm font-semibold text-foreground/90 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-400/60"></div>
                    {t("operationType")}
                  </Label>
                  <Select
                    value={operationFilter}
                    onValueChange={(value) =>
                      setOperationFilter(
                        value as EditHistoryFilter["operation"],
                      )
                    }
                  >
                    <SelectTrigger className="w-full h-11 text-sm border-2 border-border/50 bg-background/80 backdrop-blur-sm focus:border-primary/50 shadow-sm transition-all duration-300 flex items-center">
                      <SelectValue
                        placeholder={t("selectOperationPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("operationAll")}</SelectItem>
                      <SelectItem value="create">
                        {t("operationCreate")}
                      </SelectItem>
                      <SelectItem value="update">
                        {t("operationUpdate")}
                      </SelectItem>
                      <SelectItem value="delete">
                        {t("operationDelete")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From Filter */}
                <div className="space-y-2">
                  <Label
                    htmlFor="date-from-filter"
                    className="text-sm font-semibold text-foreground/90 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-purple-400/60"></div>
                    {t("dateFrom")}
                  </Label>
                  <Input
                    id="date-from-filter"
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className="w-full h-11 text-sm border-2 border-border/50 bg-background/80 backdrop-blur-sm focus:border-primary/50 shadow-sm transition-all duration-300"
                  />
                </div>

                {/* Date To Filter */}
                <div className="space-y-2">
                  <Label
                    htmlFor="date-to-filter"
                    className="text-sm font-semibold text-foreground/90 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-pink-400/60"></div>
                    {t("dateTo")}
                  </Label>
                  <Input
                    id="date-to-filter"
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    className="w-full h-11 text-sm border-2 border-border/50 bg-background/80 backdrop-blur-sm focus:border-primary/50 shadow-sm transition-all duration-300"
                  />
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={applyFilters}
                  size="default"
                  className="group flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-300"
                  disabled={loading}
                >
                  <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  {t("searchEditHistory")}
                </Button>
                <Button
                  onClick={resetFilters}
                  variant="outline"
                  size="default"
                  className="group flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-300"
                  disabled={loading}
                >
                  <RotateCcw className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                  {t("resetFilters")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* History Records Table */}
          <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />

            <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                  <FileText className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl font-bold text-foreground leading-relaxed">
                    {histories.length > 0
                      ? `${histories.length} ${t("editHistoryRecords")}`
                      : t("editHistoryTitle")}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                    <p className="text-lg font-medium text-foreground">
                      {t("loadingEditHistory")}
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-2 border-red-200 dark:border-red-800 max-w-md mx-auto text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-red-700 dark:text-red-400 mb-2">
                      {t("errorTitle")}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-500 mb-4">
                      {error}
                    </p>
                    <Button
                      onClick={() => fetchHistories()}
                      variant="outline"
                      size="sm"
                      className="shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {t("retry")}
                    </Button>
                  </div>
                </div>
              ) : histories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border-2 border-dashed border-muted-foreground/20 max-w-md mx-auto text-center">
                    <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">
                      {t("noEditHistory")}
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      {t("noEditHistoryDetail")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border/20 shadow-inner bg-gradient-to-b from-background to-muted/10">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 border-b-2 border-primary/20 backdrop-blur-sm">
                          <TableHead className="h-16 px-4 font-bold text-foreground/90 border-r border-border/10 last:border-r-0 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-400/60"></div>
                              {t("operationType")}
                            </div>
                          </TableHead>
                          <TableHead className="h-16 px-4 font-bold text-foreground/90 border-r border-border/10 last:border-r-0 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-400/60"></div>
                              {t("scriptName")}
                            </div>
                          </TableHead>
                          <TableHead className="h-16 px-4 font-bold text-foreground/90 border-r border-border/10 last:border-r-0 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-amber-400/60"></div>
                              {t("operationUser")}
                            </div>
                          </TableHead>
                          <TableHead className="h-16 px-4 font-bold text-foreground/90 border-r border-border/10 last:border-r-0 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-400/60"></div>
                              {t("operationTime")}
                            </div>
                          </TableHead>
                          <TableHead className="h-16 px-4 font-bold text-foreground/90 border-r border-border/10 last:border-r-0 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-indigo-400/60"></div>
                              {t("fieldChanges")}
                            </div>
                          </TableHead>
                          <TableHead className="h-16 px-4 font-bold text-foreground/90 text-center leading-relaxed">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-pink-400/60"></div>
                              {t("tableActions")}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/20">
                        {histories.map((history, index) => (
                          <TableRow
                            key={history._id?.toString() || index}
                            className={cn(
                              "group/row transition-all duration-200 hover:bg-gradient-to-r hover:from-muted/30 hover:to-muted/10 hover:shadow-sm",
                              index % 2 === 0 ? "bg-background" : "bg-muted/5",
                            )}
                          >
                            <TableCell className="px-4 py-5 leading-relaxed">
                              <div className="flex items-center gap-3">
                                {getOperationIcon(history.operation)}
                                <Badge
                                  variant="outline"
                                  className={`${getOperationBadgeColor(history.operation)} font-medium px-2 py-1 text-xs`}
                                >
                                  {getOperationText(history.operation)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell
                              className="px-4 py-5 font-medium max-w-56 leading-relaxed"
                              title={
                                history.scriptSnapshot?.name ||
                                history.scriptSnapshot?.scriptId
                              }
                            >
                              <div className="space-y-1">
                                <div className="truncate font-semibold group-hover/row:text-primary transition-colors duration-200">
                                  {history.scriptSnapshot?.name ||
                                    history.scriptSnapshot?.scriptId ||
                                    t("unknownScript")}
                                </div>
                                {history.scriptSnapshot?.cnName && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {history.scriptSnapshot.cnName}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell
                              className="px-4 py-5 text-muted-foreground max-w-32 leading-relaxed"
                              title={history.userName || history.userEmail}
                            >
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3" />
                                <span className="truncate text-sm">
                                  {history.userName ||
                                    history.userEmail ||
                                    history.scriptSnapshot?.author ||
                                    t("unknownUser")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-5 text-muted-foreground max-w-40 font-mono text-sm leading-relaxed">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                <span className="truncate">
                                  {formatDate(
                                    typeof history.operationTime === "string"
                                      ? history.operationTime
                                      : history.operationTime.toISOString(),
                                    language,
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-5 text-muted-foreground max-w-48 leading-relaxed">
                              <div className="truncate text-sm">
                                {getChangesPreview(history.changes)}
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-5 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(history)}
                                className="h-8 px-3 text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-950/20 dark:hover:border-blue-700/50 dark:hover:text-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                                title={t("checkDetails")}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && !loading && histories.length > 0 && (
            <Card className="border-2 border-border/20 bg-gradient-to-r from-card to-card/80 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground font-medium bg-muted/30 px-4 py-2 rounded-lg">
                    {formatPageInfo()}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                      className="group shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      {t("previous")}
                    </Button>
                    <div className="text-sm text-muted-foreground font-mono bg-muted/30 px-4 py-2 rounded-lg">
                      {t("pageNumber")}{" "}
                      <span className="font-bold text-primary">
                        {currentPage}
                      </span>{" "}
                      {t("of")} <span className="font-bold">{totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages || loading}
                      className="group shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      {t("next")}
                      <ArrowLeft className="w-4 h-4 ml-2 rotate-180 group-hover:scale-110 transition-transform" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              {t("editHistoryDetails")}
            </DialogTitle>
            <DialogDescription>
              {selectedHistory && (
                <span>
                  {getOperationText(selectedHistory.operation)} •{" "}
                  {selectedHistory.scriptSnapshot?.name ||
                    selectedHistory.scriptSnapshot?.scriptId}{" "}
                  •{" "}
                  {formatDate(
                    typeof selectedHistory.operationTime === "string"
                      ? selectedHistory.operationTime
                      : selectedHistory.operationTime.toISOString(),
                    language,
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedHistory && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("operationType")}
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {getOperationIcon(selectedHistory.operation)}
                    <Badge
                      variant="outline"
                      className={getOperationBadgeColor(
                        selectedHistory.operation,
                      )}
                    >
                      {getOperationText(selectedHistory.operation)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("operationUser")}
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4" />
                    <span
                      className="text-sm truncate"
                      title={
                        selectedHistory.userName ||
                        selectedHistory.userEmail ||
                        t("unknownUser")
                      }
                    >
                      {selectedHistory.userName ||
                        selectedHistory.userEmail ||
                        t("unknownUser")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Script Info */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t("scriptDetails")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-muted-foreground">
                      {t("scriptName")}
                    </label>
                    <p className="font-medium">
                      {selectedHistory.scriptSnapshot?.name || t("unknown")}
                    </p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">
                      {t("scriptNameCn")}
                    </label>
                    <p className="font-medium">
                      {selectedHistory.scriptSnapshot?.cnName || t("unknown")}
                    </p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">
                      {t("fieldScriptId")}
                    </label>
                    <p className="font-mono text-xs">
                      {selectedHistory.scriptSnapshot?.scriptId || t("unknown")}
                    </p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">
                      {t("author")}
                    </label>
                    <p className="font-medium">
                      {selectedHistory.scriptSnapshot?.author || t("unknown")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Changes Details */}
              {selectedHistory.changes &&
                selectedHistory.changes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      {t("changesDetails")} ({selectedHistory.changes.length})
                    </h4>
                    <div className="space-y-4">
                      {selectedHistory.changes.map((change, index) => (
                        <div
                          key={index}
                          className="border border-border/30 rounded-lg p-4 bg-background/50"
                        >
                          <div className="font-medium mb-3 text-sm">
                            {change.fieldDisplayNameCn ||
                              change.fieldDisplayName}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-muted-foreground font-medium">
                                {t("originalValue")}
                              </label>
                              <div className="mt-1 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-400 font-mono text-xs break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
                                {formatValue(change.oldValue)}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground font-medium">
                                {t("newValue")}
                              </label>
                              <div className="mt-1 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-green-800 dark:text-green-400 font-mono text-xs break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
                                {formatValue(change.newValue)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Description */}
              {(selectedHistory.descriptionCn ||
                selectedHistory.description) && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">{t("description")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedHistory.descriptionCn ||
                      selectedHistory.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Version Display - Fixed Bottom Left */}
      <div className="fixed left-6 bottom-6 z-50">
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-mono text-xs text-muted-foreground font-medium">
            v{process.env.NEXT_PUBLIC_APP_VERSION || "0.1.7"}
          </span>
        </div>
      </div>
    </div>
  );
}
