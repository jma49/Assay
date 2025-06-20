"use client";

import React, { useState, KeyboardEvent } from "react";
import { X, Hash, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/utils";

interface HashtagInputProps {
  hashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  helperText?: string;
  maxTags?: number;
}

export function HashtagInput({
  hashtags = [],
  onHashtagsChange,
  placeholder = "输入标签...",
  disabled = false,
  className,
  label,
  helperText,
  maxTags = 10,
}: HashtagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const validateHashtag = (tag: string): boolean => {
    // 移除首位空格，转为小写
    const cleaned = tag.trim().toLowerCase();
    
    // 检查是否为空或重复
    if (!cleaned || hashtags.includes(cleaned)) {
      return false;
    }
    
    // 检查格式：只允许字母、数字、中文和连字符
    const validFormat = /^[a-zA-Z0-9\u4e00-\u9fa5-]+$/.test(cleaned);
    
    return validFormat && cleaned.length <= 20;
  };

  const addHashtag = (tag: string) => {
    if (hashtags.length >= maxTags) {
      return;
    }

    const cleaned = tag.trim().toLowerCase();
    if (validateHashtag(cleaned)) {
      onHashtagsChange([...hashtags, cleaned]);
      setInputValue("");
    }
  };

  const removeHashtag = (indexToRemove: number) => {
    const newHashtags = hashtags.filter((_, index) => index !== indexToRemove);
    onHashtagsChange(newHashtags);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        addHashtag(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && hashtags.length > 0) {
      // 当输入框为空且按退格键时，删除最后一个标签
      removeHashtag(hashtags.length - 1);
    }
  };

  const handleAddClick = () => {
    if (inputValue.trim()) {
      addHashtag(inputValue);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Hash className="h-4 w-4" />
          {label}
        </Label>
      )}
      
      <div
        className={cn(
          "min-h-[2.5rem] rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          isFocused && "ring-2 ring-ring ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        {/* 显示现有标签 */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {hashtags.map((tag, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="group flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Hash className="h-3 w-3" />
              {tag}
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:bg-transparent group-hover:text-destructive transition-colors"
                  onClick={() => removeHashtag(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>

        {/* 输入框和添加按钮 */}
        {!disabled && hashtags.length < maxTags && (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className="border-0 px-0 py-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={disabled}
            />
            {inputValue.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddClick}
                className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
              >
                <Plus className="h-3 w-3 mr-1" />
                添加
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 辅助文本和计数 */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>
          {helperText || "按 Enter 或逗号添加标签，支持中英文、数字和连字符"}
        </span>
        <span>
          {hashtags.length}/{maxTags} 标签
        </span>
      </div>
    </div>
  );
} 