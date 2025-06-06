import React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  hashtag: string;
  className?: string;
  showRemove?: boolean;
  onRemove?: () => void;
}

// 优先级标签颜色映射
const getPriorityColor = (tag: string) => {
  const lowerTag = tag.toLowerCase();
  
  switch (lowerTag) {
    case 'p0':
      return {
        bg: "bg-red-100 dark:bg-red-950/30",
        text: "text-red-700 dark:text-red-400",
        border: "border-red-300 dark:border-red-700",
        hover: "hover:bg-red-200 dark:hover:bg-red-950/50"
      };
    case 'p1':
      return {
        bg: "bg-orange-100 dark:bg-orange-950/30",
        text: "text-orange-700 dark:text-orange-400",
        border: "border-orange-300 dark:border-orange-700",
        hover: "hover:bg-orange-200 dark:hover:bg-orange-950/50"
      };
    case 'p2':
      return {
        bg: "bg-yellow-100 dark:bg-yellow-950/30",
        text: "text-yellow-700 dark:text-yellow-400",
        border: "border-yellow-300 dark:border-yellow-700",
        hover: "hover:bg-yellow-200 dark:hover:bg-yellow-950/50"
      };
    case 'p3':
      return {
        bg: "bg-blue-100 dark:bg-blue-950/30",
        text: "text-blue-700 dark:text-blue-400",
        border: "border-blue-300 dark:border-blue-700",
        hover: "hover:bg-blue-200 dark:hover:bg-blue-950/50"
      };
    case 'p4':
      return {
        bg: "bg-green-100 dark:bg-green-950/30",
        text: "text-green-700 dark:text-green-400",
        border: "border-green-300 dark:border-green-700",
        hover: "hover:bg-green-200 dark:hover:bg-green-950/50"
      };
    default:
      return {
        bg: "bg-gray-100 dark:bg-gray-800/30",
        text: "text-gray-700 dark:text-gray-400",
        border: "border-gray-300 dark:border-gray-600",
        hover: "hover:bg-gray-200 dark:hover:bg-gray-800/50"
      };
  }
};

export function PriorityBadge({ 
  hashtag, 
  className, 
  showRemove = false, 
  onRemove 
}: PriorityBadgeProps) {
  const colors = getPriorityColor(hashtag);
  
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
        colors.bg,
        colors.text,
        colors.border,
        showRemove && colors.hover,
        showRemove && "group pr-1.5 cursor-pointer",
        className
      )}
    >
      <span className="truncate font-semibold">{hashtag}</span>
      {showRemove && onRemove && (
        <span
          role="button"
          tabIndex={0}
          className="inline-flex items-center justify-center w-4 h-4 ml-0.5 opacity-60 group-hover:opacity-100 hover:bg-current/20 rounded-sm transition-all duration-200 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              onRemove();
            }
          }}
          title="移除标签"
        >
          <X className="h-3 w-3" />
        </span>
      )}
    </Badge>
  );
} 