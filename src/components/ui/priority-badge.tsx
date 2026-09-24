import React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/utils";

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
        bg: "bg-failure/10 ",
        text: "text-failure ",
        border: "border-failure/30 ",
        hover: "hover:bg-failure/20 "
      };
    case 'p1':
      return {
        bg: "bg-attention/10 ",
        text: "text-attention ",
        border: "border-attention/30 ",
        hover: "hover:bg-attention/20 "
      };
    case 'p2':
      return {
        bg: "bg-attention/10 ",
        text: "text-attention ",
        border: "border-attention/30 ",
        hover: "hover:bg-attention/20 "
      };
    case 'p3':
      return {
        bg: "bg-muted ",
        text: "text-foreground ",
        border: "border-border ",
        hover: "hover:bg-muted "
      };
    case 'p4':
      return {
        bg: "bg-success/10 ",
        text: "text-success ",
        border: "border-success/30 ",
        hover: "hover:bg-success/20 "
      };
    default:
      return {
        bg: "bg-muted ",
        text: "text-foreground ",
        border: "border-border ",
        hover: "hover:bg-accent "
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