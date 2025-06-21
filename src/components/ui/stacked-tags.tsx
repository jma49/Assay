import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MoreHorizontal, Hash } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useLanguage } from "@/components/common/LanguageProvider";
import { dashboardTranslations, DashboardTranslationKeys } from "@/components/business/dashboard/types";
import { PriorityBadge } from "./priority-badge";

interface StackedTagsProps {
  tags: string[];
  className?: string;
  visibleCount?: number;
}

// 堆叠样式函数
const stackedStyle = (index: number) => ({
  "top-0.5": index === 1,
  "top-1": index === 2,
  "left-0.5": index === 1,
  "left-1": index === 2,
  "opacity-80": index === 1,
  "opacity-60": index === 2,
  "scale-95": index > 0,
});

export function StackedTags({
  tags,
  className,
  visibleCount = 3,
}: StackedTagsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useLanguage();

  const t = (key: DashboardTranslationKeys): string => {
    const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
    return langTranslations[key as keyof typeof langTranslations] || key;
  };

  if (!tags || tags.length === 0) {
    return (
      <span className="text-muted-foreground/60 text-xs italic">
        {t("noTagsAvailable")}
      </span>
    );
  }

  const visibleTags = tags.slice(0, Math.min(visibleCount, tags.length));
  const hiddenTags = tags.slice(visibleCount);

  const hasMoreTags = hiddenTags.length > 0;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* 显示的标签 - 堆叠效果 */}
      <div className="relative">
        {/* 主要标签（第一个） */}
        <PriorityBadge 
          hashtag={tags[0]} 
          className={cn(
            "transition-all duration-300 hover:scale-105 hover:z-10 relative",
            "shadow-sm hover:shadow-md",
            isOpen && "z-20 scale-105 shadow-lg"
          )}
        />
        
        {/* 堆叠的其他标签 */}
        {visibleTags.slice(1, Math.min(3, tags.length)).map((tag, index) => (
          <PriorityBadge
            key={tag}
            hashtag={tag}
            className={cn(
              "absolute transition-all duration-500 pointer-events-none",
              "shadow-sm",
              !isOpen && stackedStyle(index + 1),
              isOpen && {
                "opacity-0": true,
                "scale-95": true,
              }
            )}
          />
        ))}
      </div>

      {/* 更多标签按钮 */}
      {hasMoreTags && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreHorizontal className="h-3 w-3" />
              <span className="sr-only">{t("showAllTags")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-3 max-w-xs shadow-lg border-2 border-border/30" 
            align="start"
            side="top"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Hash className="h-4 w-4 text-primary" />
                {t("allTagsCount").replace("{count}", String(tags.length))}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {tags.map((tag) => (
                  <PriorityBadge
                    key={tag}
                    hashtag={tag}
                    className="font-medium"
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
} 