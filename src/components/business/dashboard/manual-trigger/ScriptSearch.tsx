import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, CornerDownLeft, Hash, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DashboardTranslationKeys } from "../types";
import { withHashtag } from "./script-search";

interface ScriptSearchProps {
  value: string;
  onChange: (value: string) => void;
  hashtags: string[];
  language: string;
  t: (key: DashboardTranslationKeys) => string;
}

/** The check search; typing `#` offers the known tags. */
export function ScriptSearch({ value, onChange, hashtags, language, t }: ScriptSearchProps) {
  const zh = language === "zh";
  const [showTags, setShowTags] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showTags) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setShowTags(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [showTags]);

  const handleChange = (next: string) => {
    onChange(next);
    setShowTags(next.includes("#") && hashtags.length > 0);
  };

  const selectTag = (tag: string) => {
    onChange(withHashtag(value, tag));
    setShowTags(false);
    inputRef.current?.focus();
  };

  const confirm = () => {
    setShowTags(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && showTags) {
      event.preventDefault();
      confirm();
    } else if (event.key === "Escape") {
      setShowTags(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-foreground/90 flex items-center gap-2 tracking-wide">
        <Search className="h-4 w-4 text-primary " />
        {t("searchScripts")}
      </Label>
      <div ref={containerRef} className="relative">
        <Input
          ref={inputRef}
          placeholder={zh ? "搜索脚本名称或使用 #标签 筛选..." : "Search scripts or use #tag to filter..."}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-11 border-border/60 focus:border-primary/60 transition-[color,background-color,border-color,box-shadow,opacity,width] duration-300 hover:border-primary/40 focus:ring-2 focus:ring-primary/20"
        />
        {showTags && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/30 rounded-lg z-50 max-h-48 overflow-hidden">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border/20 bg-muted/20 flex items-center justify-between">
              <span>{zh ? "点击选择标签筛选脚本：" : "Click to filter scripts by tag:"}</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground/80">
                <CornerDownLeft className="h-3 w-3" />
                <span>{zh ? "回车确认" : "Enter to confirm"}</span>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto">
              <div className="p-2 space-y-1">
                {hashtags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded-md flex items-center gap-2 transition-[color,background-color,border-color,box-shadow,opacity,width] duration-200 group"
                    onClick={() => selectTag(tag)}
                  >
                    <Hash className="h-4 w-4 text-primary" />
                    <span className="font-medium">{tag}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border/20 p-2">
              <Button
                size="sm"
                onClick={confirm}
                className="w-full h-8 text-xs font-medium bg-primary hover:bg-primary/90 flex items-center gap-2"
              >
                <Check className="h-3 w-3" />
                {zh ? "确认选择" : "Confirm Selection"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
