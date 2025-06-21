import React, { useState, useMemo, useCallback } from "react";
import { Filter, X, Hash, Check, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/utils";
import { useLanguage } from "@/components/common/LanguageProvider";
import { dashboardTranslations, DashboardTranslationKeys } from "@/components/business/dashboard/types";
import { PriorityBadge } from "./priority-badge";

interface CompactHashtagFilterProps {
  availableHashtags: string[];
  selectedHashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  className?: string;
  disabled?: boolean;
}

export function CompactHashtagFilter({
  availableHashtags = [],
  selectedHashtags = [],
  onHashtagsChange,
  className,
  disabled = false,
}: CompactHashtagFilterProps) {
  const [searchValue, setSearchValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useLanguage();

  const t = (key: DashboardTranslationKeys): string => {
    const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
    return langTranslations[key as keyof typeof langTranslations] || key;
  };

  // 筛选可用的hashtag
  const filteredHashtags = useMemo(() => {
    if (!searchValue.trim()) return availableHashtags;
    
    return availableHashtags.filter((tag) =>
      tag.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [availableHashtags, searchValue]);

  // 处理单个hashtag的选择/取消选择
  const toggleHashtag = useCallback((hashtag: string) => {
    const newHashtags = selectedHashtags.includes(hashtag) 
      ? selectedHashtags.filter((tag) => tag !== hashtag)
      : [...selectedHashtags, hashtag];
    
    onHashtagsChange(newHashtags);
    
    // 选择后清空搜索，显示选择效果
    if (searchValue) {
      setSearchValue("");
    }
  }, [selectedHashtags, onHashtagsChange, searchValue]);

  // 清除所有选择
  const clearSelection = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onHashtagsChange([]);
    setSearchValue("");
  }, [onHashtagsChange]);

  // 处理搜索框的清空
  const clearSearch = useCallback(() => {
    setSearchValue("");
  }, []);

  // 应用选择并关闭弹框
  const applySelection = useCallback(() => {
    setIsOpen(false);
    setSearchValue("");
  }, []);

  if (availableHashtags.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-1">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className={cn(
                "h-10 px-4 justify-between gap-2 text-sm font-medium flex-1",
                "border-2 border-border/50 bg-background/80 backdrop-blur-sm",
                "hover:border-primary/30 focus:border-primary/50",
                "shadow-sm hover:shadow-md transition-all duration-300",
                "group relative overflow-hidden",
                selectedHashtags.length > 0 && "border-primary/40 bg-primary/5"
              )}
            >
              {/* 背景装饰 */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative flex items-center gap-2 min-w-0 flex-1">
                <Filter className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">
                  {selectedHashtags.length === 0 ? (
                    language === "zh" ? "标签筛选" : "Tag Filter"
                  ) : (
                    language === "zh" 
                      ? `已选择 ${selectedHashtags.length} 个标签`
                      : `${selectedHashtags.length} tags selected`
                  )}
                </span>
              </div>

              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0" />
            </Button>
          </PopoverTrigger>

          <PopoverContent 
            className="w-80 p-0 shadow-lg border-2 border-border/30" 
            align="start"
            sideOffset={4}
          >
            <div className="bg-gradient-to-br from-card via-card to-card/90">
              {/* 头部 */}
              <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 ring-1 ring-primary/20">
                      <Hash className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold text-sm">
                      {language === "zh" ? "标签筛选" : "Tag Filter"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {filteredHashtags.length}
                    </Badge>
                    {selectedHashtags.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onHashtagsChange([])}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-md"
                        title={language === "zh" ? "清除所有选择" : "Clear all selections"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* 搜索框 */}
              <div className="p-3 border-b border-border/20">
                <div className="relative">
                  <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={language === "zh" ? "搜索标签..." : "Search tags..."}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-9 pr-9 h-9 text-sm border-border/50 focus:border-primary/50"
                  />
                  {searchValue && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7 w-7 p-0 hover:bg-muted/50"
                      onClick={clearSearch}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 标签列表 */}
              <div className="p-2 max-h-64 overflow-y-auto">
                {filteredHashtags.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {searchValue 
                      ? (language === "zh" ? "未找到匹配的标签" : "No matching tags found")
                      : (language === "zh" ? "暂无可用标签" : "No available tags")
                    }
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredHashtags.map((tag) => {
                      const isSelected = selectedHashtags.includes(tag);
                      return (
                        <div
                          key={tag}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200",
                            "hover:bg-muted/50 group",
                            isSelected && "bg-primary/10 hover:bg-primary/15 ring-1 ring-primary/20"
                          )}
                          onClick={() => toggleHashtag(tag)}
                        >
                          <div className={cn(
                            "flex items-center justify-center w-4 h-4 rounded border-2 transition-all duration-200",
                            isSelected 
                              ? "bg-primary border-primary text-primary-foreground" 
                              : "border-muted-foreground/30 group-hover:border-primary/50"
                          )}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <PriorityBadge hashtag={tag} className="text-xs" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 底部操作栏 */}
              {selectedHashtags.length > 0 && (
                <div className="px-3 py-3 border-t border-border/20 bg-muted/20">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                      {selectedHashtags.slice(0, 3).map((tag) => (
                        <PriorityBadge 
                          key={tag} 
                          hashtag={tag} 
                          className="text-xs"
                          showRemove
                          onRemove={() => toggleHashtag(tag)}
                        />
                      ))}
                      {selectedHashtags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{selectedHashtags.length - 3}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={applySelection}
                      className="h-8 px-3 text-xs font-medium bg-primary hover:bg-primary/90 shrink-0"
                    >
                      {t("confirmAction")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* 外部清除按钮 - 只在有选择时显示 */}
        {selectedHashtags.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            title={language === "zh" ? "清除所有选择" : "Clear all selections"}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
} 