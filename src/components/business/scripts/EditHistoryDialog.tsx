"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  History,
  User,
  Calendar,
  Edit,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/components/business/dashboard/utils";
import { DashboardTranslationKeys } from "@/components/business/dashboard/types";

interface EditHistoryItem {
  _id: string;
  scriptId: string;
  operation: "create" | "update" | "delete";
  userId: string;
  userEmail?: string;
  userName?: string;
  changes?: {
    field: string;
    fieldDisplayName: string;
    fieldDisplayNameCn: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  operationTime: string;
  description?: string;
  descriptionCn?: string;
}

interface EditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scriptId?: string;
  t: (key: DashboardTranslationKeys | string) => string;
}

export function EditHistoryDialog({
  open,
  onOpenChange,
  scriptId,
  t,
}: EditHistoryDialogProps) {
  const [histories, setHistories] = useState<EditHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fetchHistories = useCallback(
    async (page: number = 1) => {
      if (!scriptId) {
        console.warn("fetchHistories: scriptId为空，跳过请求");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          scriptId,
          page: page.toString(),
          limit: "20",
        });

        console.log("正在获取编辑历史:", { scriptId, page });
        const response = await fetch(`/api/edit-history?${params}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || 
            `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log("编辑历史获取成功:", data);
        
        if (!data.histories || !Array.isArray(data.histories)) {
          console.warn("API返回数据格式异常:", data);
          setHistories([]);
          setTotalPages(0);
          setCurrentPage(1);
          return;
        }
        
        setHistories(data.histories);
        setTotalPages(data.pagination?.totalPages || 1);
        setCurrentPage(page);
      } catch (err) {
        console.error("Failed to fetch edit history:", err);
        const errorMessage = err instanceof Error 
          ? err.message 
          : (t("editHistoryErrorUnknown") || "获取编辑历史失败");
        setError(errorMessage);
        setHistories([]);
        setTotalPages(0);
        setCurrentPage(1);
      } finally {
        setLoading(false);
      }
    },
    [scriptId, t],
  );

  useEffect(() => {
    if (open && scriptId) {
      fetchHistories(1);
    }
  }, [open, scriptId, fetchHistories]);

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
        return "bg-green-100 text-green-800 border-green-200";
      case "update":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "delete":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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
    if (value === null || value === undefined) {
      return t("noData");
    }
    if (typeof value === "boolean") {
      return value ? t("scheduled") : t("manual");
    }
    if (typeof value === "string" && value.length > 100) {
      return value.substring(0, 100) + "...";
    }
    return String(value);
  };

  const getFieldDisplayName = (field: string) => {
    const fieldNames: Record<string, string> = {
      name: "脚本名称",
      cnName: "中文名称",
      description: "描述",
      cnDescription: "中文描述",
      scope: "作用域",
      cnScope: "中文作用域",
      author: "作者",
      isScheduled: "是否定时执行",
      cronSchedule: "定时设置",
      sqlContent: "SQL内容",
    };
    return fieldNames[field] || field;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader className="px-1">
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {t("editHistoryTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("editHistoryDesc")} {scriptId || ""}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-2">
          <div className="px-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>{t("loadingEditHistory")}</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-red-600">
                <AlertCircle className="w-6 h-6 mr-2" />
                <span>{error}</span>
              </div>
            ) : histories.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <History className="w-6 h-6 mr-2" />
                <span>{t("noEditHistory")}</span>
              </div>
            ) : (
              <div className="space-y-3">
                {histories.map((history, index) => (
                  <Card key={history._id || index} className="relative mx-1">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getOperationIcon(history.operation)}
                        <div>
                          <CardTitle className="text-sm">
                            <Badge
                              variant="outline"
                              className={getOperationBadgeColor(
                                history.operation,
                              )}
                            >
                              {getOperationText(history.operation)}
                            </Badge>
                          </CardTitle>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>
                                {history.userName ||
                                  history.userEmail ||
                                  history.userId}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {formatDate(
                                  typeof history.operationTime === "string"
                                    ? history.operationTime
                                    : new Date(
                                        history.operationTime,
                                      ).toISOString(),
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {history.changes && history.changes.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">
                          {t("changesDetails")}：
                        </h4>
                        {history.changes.map((change, changeIndex) => (
                          <div
                            key={changeIndex}
                            className="bg-gray-50 rounded-lg p-2"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                {change.fieldDisplayNameCn ||
                                  change.fieldDisplayName ||
                                  getFieldDisplayName(change.field)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-gray-500">
                                  {t("originalValue")}：
                                </span>
                                <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-800 font-mono">
                                  {formatValue(change.oldValue)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  {t("newValue")}：
                                </span>
                                <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-green-800 font-mono">
                                  {formatValue(change.newValue)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}

                  {(history.descriptionCn || history.description) && (
                    <CardContent className="pt-0">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">
                          {t("description")}：
                        </span>
                        {history.descriptionCn || history.description}
                      </div>
                    </CardContent>
                  )}

                  {index < histories.length - 1 && (
                    <Separator className="mt-2" />
                  )}
                </Card>
                              ))}
                </div>
              )}
            </div>
          </ScrollArea>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchHistories(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
            >
              {t("previous")}
            </Button>
            <span className="text-sm text-gray-500">
              {t("pageInfoShort")} {currentPage}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchHistories(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
            >
              {t("next")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
