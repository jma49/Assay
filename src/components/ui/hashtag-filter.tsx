"use client";

import React, { useState, useMemo } from "react";
import { Hash, Filter, X, ChevronDown, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import { dashboardTranslations, DashboardTranslationKeys } from "@/components/dashboard/types";

interface HashtagFilterProps {
  availableHashtags: string[];
  selectedHashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  className?: string;
  disabled?: boolean;
  mode?: "single" | "multiple"; // 单选或多选模式
  showCategoryGroups?: boolean; // 是否显示分类分组
}

// 标签分类配置
const TAG_CATEGORIES = {
  priority: {
    label: "优先级",
    labelEn: "Priority",
    color: "red",
    prefix: "priority:",
    values: ["P0", "P1", "P2", "P3", "P4"]
  },
  environment: {
    label: "环境",
    labelEn: "Environment", 
    color: "blue",
    prefix: "env:",
    values: ["prod", "staging", "dev", "test"]
  },
  type: {
    label: "类型",
    labelEn: "Type",
    color: "green", 
    prefix: "type:",
    values: ["scheduled", "manual", "monitoring", "maintenance"]
  },
  team: {
    label: "团队",
    labelEn: "Team",
    color: "purple",
    prefix: "team:",
    values: ["backend", "frontend", "data", "devops", "qa"]
  }
};

// 解析标签获取分类和值
const parseTag = (tag: string) => {
  for (const [categoryKey, config] of Object.entries(TAG_CATEGORIES)) {
    if (tag.startsWith(config.prefix)) {
      return {
        category: categoryKey,
        value: tag.substring(config.prefix.length),
        fullTag: tag,
        config
      };
    }
  }
  return {
    category: "custom",
    value: tag,
    fullTag: tag,
    config: {
      label: "自定义",
      labelEn: "Custom",
      color: "gray",
      prefix: "",
      values: []
    }
  };
};

// 根据分类分组标签
const groupTagsByCategory = (tags: string[]) => {
  const groups: Record<string, string[]> = {};
  
  tags.forEach(tag => {
    const { category } = parseTag(tag);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(tag);
  });
  
  return groups;
};

// 获取标签的显示颜色
const getTagColor = (tag: string) => {
  const { config } = parseTag(tag);
  const colorMap = {
    red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800", 
    green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    purple: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
    gray: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800"
  };
  return colorMap[config.color as keyof typeof colorMap] || colorMap.gray;
};

export function HashtagFilter({
  availableHashtags = [],
  selectedHashtags = [],
  onHashtagsChange,
  className,
  disabled = false,
  mode = "multiple",
  showCategoryGroups = true,
}: HashtagFilterProps) {
  const { language } = useLanguage();
  const [searchValue, setSearchValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const t = (key: DashboardTranslationKeys | string): string => {
    const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
    return (langTranslations as Record<string, string>)[key] || key;
  };

  // 筛选可用的hashtag
  const filteredHashtags = useMemo(() => {
    let filtered = availableHashtags;
    
    // 按搜索词筛选
    if (searchValue.trim()) {
      filtered = filtered.filter((tag) =>
        tag.toLowerCase().includes(searchValue.toLowerCase())
      );
    }
    
    // 按分类筛选
    if (selectedCategory !== "all") {
      filtered = filtered.filter(tag => {
        const { category } = parseTag(tag);
        return category === selectedCategory;
      });
    }
    
    return filtered;
  }, [availableHashtags, searchValue, selectedCategory]);

  // 分组显示的标签
  const groupedHashtags = useMemo(() => {
    return groupTagsByCategory(filteredHashtags);
  }, [filteredHashtags]);

  // 获取所有存在的分类
  const existingCategories = useMemo(() => {
    const categories = new Set<string>();
    availableHashtags.forEach(tag => {
      const { category } = parseTag(tag);
      categories.add(category);
    });
    return Array.from(categories);
  }, [availableHashtags]);

  // 处理单个hashtag的选择/取消选择
  const toggleHashtag = (hashtag: string) => {
    if (mode === "single") {
      // 单选模式
      onHashtagsChange(selectedHashtags.includes(hashtag) ? [] : [hashtag]);
      setIsOpen(false);
    } else {
      // 多选模式
      if (selectedHashtags.includes(hashtag)) {
        onHashtagsChange(selectedHashtags.filter((tag) => tag !== hashtag));
      } else {
        onHashtagsChange([...selectedHashtags, hashtag]);
      }
    }
  };

  // 清除所有选择
  const clearSelection = () => {
    onHashtagsChange([]);
  };

  // 选择所有hashtag
  const selectAll = () => {
    if (mode === "multiple") {
      onHashtagsChange([...filteredHashtags]);
    }
  };

  if (availableHashtags.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        {t("noHashtags")}
      </div>
    );
  }

  // 单选模式使用 Select 组件
  if (mode === "single") {
    return (
      <div className={cn("space-y-2", className)}>
        <Label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Hash className="h-4 w-4" />
          {t("hashtagsFilter")}
        </Label>
        <Select
          value={selectedHashtags[0] || ""}
          onValueChange={(value) => onHashtagsChange(value ? [value] : [])}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("allHashtags")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("allHashtags")}</SelectItem>
            {showCategoryGroups ? (
              Object.entries(groupedHashtags).map(([category, tags]) => (
                <div key={category}>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-border/50">
                    {TAG_CATEGORIES[category as keyof typeof TAG_CATEGORIES]?.[language === 'zh' ? 'label' : 'labelEn'] || category}
                  </div>
                  {tags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3" />
                        {tag}
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))
            ) : (
              availableHashtags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  <div className="flex items-center gap-2">
                    <Hash className="h-3 w-3" />
                    {tag}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // 多选模式使用 Popover
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
        <Tag className="h-4 w-4" />
        {t("hashtagsFilter")}
      </Label>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between min-h-[2.5rem] h-auto py-2"
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedHashtags.length === 0 ? (
                <span className="text-muted-foreground">{t("selectHashtags")}</span>
              ) : (
                selectedHashtags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 text-xs",
                      getTagColor(tag)
                    )}
                  >
                    <Hash className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))
              )}
              {selectedHashtags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedHashtags.length - 3}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2">
              {selectedHashtags.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 hover:bg-transparent text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelection();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0" align="start">
          <div className="p-3 space-y-3">
            {/* 搜索框 */}
            <div className="relative">
              <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchScripts")}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* 分类筛选器 */}
            {showCategoryGroups && existingCategories.length > 1 && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有分类</SelectItem>
                  {existingCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {TAG_CATEGORIES[category as keyof typeof TAG_CATEGORIES]?.[language === 'zh' ? 'label' : 'labelEn'] || category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={selectedHashtags.length === filteredHashtags.length}
                className="text-xs"
              >
                全选
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={selectedHashtags.length === 0}
                className="text-xs"
              >
                清除
              </Button>
            </div>

            {/* Hashtag列表 */}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredHashtags.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  {searchValue ? "未找到匹配的标签" : t("noHashtags")}
                </div>
              ) : showCategoryGroups ? (
                Object.entries(groupedHashtags).map(([category, tags]) => (
                  <div key={category} className="space-y-1">
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-border/50">
                      {TAG_CATEGORIES[category as keyof typeof TAG_CATEGORIES]?.[language === 'zh' ? 'label' : 'labelEn'] || category}
                    </div>
                    {tags.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleHashtag(tag)}
                      >
                        <Checkbox
                          checked={selectedHashtags.includes(tag)}
                          onChange={() => toggleHashtag(tag)}
                          className="pointer-events-none"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{tag}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                filteredHashtags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleHashtag(tag)}
                  >
                    <Checkbox
                      checked={selectedHashtags.includes(tag)}
                      onChange={() => toggleHashtag(tag)}
                      className="pointer-events-none"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{tag}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 选中的标签显示 */}
      {selectedHashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedHashtags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className={cn(
                "group flex items-center gap-1 px-2 py-1 text-xs hover:bg-primary/20 transition-colors",
                getTagColor(tag)
              )}
            >
              <Hash className="h-3 w-3" />
              {tag}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 hover:bg-transparent group-hover:text-destructive transition-colors"
                onClick={() => toggleHashtag(tag)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
} 