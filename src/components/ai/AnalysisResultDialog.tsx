"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lightbulb, Rocket, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';

interface AnalysisResultDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  result: string | null;
  type: 'explain' | 'optimize';
  title?: string;
}

const AnalysisResultDialog: React.FC<AnalysisResultDialogProps> = ({
  isOpen,
  onOpenChange,
  result,
  type,
  title
}) => {
  const { theme } = useTheme();
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const parseAnalysisResult = (text: string) => {
    // 分割文本，查找代码块
    const sections: Array<{ type: 'text' | 'code', content: string, language?: string }> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      // 添加代码块前的文本
      if (match.index > lastIndex) {
        const textContent = text.slice(lastIndex, match.index).trim();
        if (textContent) {
          sections.push({ type: 'text', content: textContent });
        }
      }
      
      // 添加代码块
      const language = match[1] || 'sql';
      const code = match[2].trim();
      if (code) {
        sections.push({ type: 'code', content: code, language });
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // 添加最后的文本
    if (lastIndex < text.length) {
      const textContent = text.slice(lastIndex).trim();
      if (textContent) {
        sections.push({ type: 'text', content: textContent });
      }
    }
    
    return sections;
  };

  const formatTextContent = (text: string) => {
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];
    let currentListItems: React.ReactNode[] = [];
    let currentListType: 'ul' | 'ol' | null = null;
    let keyCounter = 0;
    
    const getNextKey = () => `item-${++keyCounter}`;
    
    const finishCurrentList = () => {
      if (currentListItems.length > 0) {
        if (currentListType === 'ul') {
          result.push(
            <ul key={getNextKey()} className="space-y-2 my-4 ml-4">
              {currentListItems}
            </ul>
          );
        } else {
          result.push(
            <ol key={getNextKey()} className="space-y-2 my-4 ml-4 list-decimal">
              {currentListItems}
            </ol>
          );
        }
        currentListItems = [];
        currentListType = null;
      }
    };

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      
      // 空行处理
      if (!trimmedLine) {
        finishCurrentList();
        return;
      }
      
      // 检查是否是标题（以#开头）
      if (trimmedLine.startsWith('#')) {
        finishCurrentList();
        const level = trimmedLine.match(/^#{1,6}/)?.[0].length || 1;
        const content = trimmedLine.replace(/^#{1,6}\s*/, '');
        const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-xs'];
        const sizeClass = sizes[Math.min(level - 1, sizes.length - 1)];
        
        result.push(
          <h3 key={getNextKey()} className={`${sizeClass} font-bold mt-6 mb-3 text-foreground`}>
            {formatInlineText(content)}
          </h3>
        );
        return;
      }
      
      // 检查是否是无序列表项
      if (trimmedLine.match(/^[-*+]\s+/)) {
        if (currentListType !== 'ul') {
          finishCurrentList();
          currentListType = 'ul';
        }
        const content = trimmedLine.replace(/^[-*+]\s+/, '');
        currentListItems.push(
          <li key={getNextKey()} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 flex-shrink-0" />
            <span className="text-muted-foreground leading-relaxed">
              {formatInlineText(content)}
            </span>
          </li>
        );
        return;
      }
      
      // 检查是否是有序列表项
      if (trimmedLine.match(/^\d+\.\s+/)) {
        if (currentListType !== 'ol') {
          finishCurrentList();
          currentListType = 'ol';
        }
        const match = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
        if (match) {
          currentListItems.push(
            <li key={getNextKey()} className="flex items-start gap-3">
              <span className="text-primary font-medium mt-0.5 flex-shrink-0 min-w-[1.5rem]">
                {match[1]}.
              </span>
              <span className="text-muted-foreground leading-relaxed">
                {formatInlineText(match[2])}
              </span>
            </li>
          );
        }
        return;
      }
      
      // 普通段落
      finishCurrentList();
      if (trimmedLine) {
        result.push(
          <p key={getNextKey()} className="text-muted-foreground leading-relaxed my-3">
            {formatInlineText(trimmedLine)}
          </p>
        );
      }
    });
    
    // 处理最后的列表
    finishCurrentList();
    
    return result;
  };

  // 处理行内格式化（粗体、斜体、代码等）
  const formatInlineText = (text: string): React.ReactNode => {
    // 处理行内代码 `code`
    const codeRegex = /`([^`]+)`/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let codeCounter = 0;

    while ((match = codeRegex.exec(text)) !== null) {
      // 添加代码前的文本
      if (match.index > lastIndex) {
        const beforeCode = text.slice(lastIndex, match.index);
        const beforeCodeFormatted = formatTextStyles(beforeCode);
        if (beforeCodeFormatted) {
          parts.push(
            <span key={`before-code-${codeCounter}`}>
              {beforeCodeFormatted}
            </span>
          );
        }
      }
      
      // 添加行内代码
      parts.push(
        <code key={`code-${++codeCounter}`} className="px-1.5 py-0.5 bg-muted/60 text-foreground rounded text-sm font-mono border">
          {match[1]}
        </code>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // 添加剩余文本
    if (lastIndex < text.length) {
      const remainingText = formatTextStyles(text.slice(lastIndex));
      if (remainingText) {
        parts.push(
          <span key={`remaining-${codeCounter}`}>
            {remainingText}
          </span>
        );
      }
    }
    
    return parts.length > 1 ? <>{parts}</> : (parts.length === 1 ? parts[0] : formatTextStyles(text));
  };

  // 处理文本样式（粗体、斜体）
  const formatTextStyles = (text: string): React.ReactNode => {
    if (!text) return null;
    
    // 处理粗体和斜体的组合
    const formatted = text
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>') // 粗斜体
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>') // 粗体
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>') // 斜体
      .replace(/~~(.*?)~~/g, '<del class="line-through opacity-75">$1</del>'); // 删除线

    if (formatted !== text) {
      return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
    }
    
    return text;
  };

  if (!result) return null;

  const sections = parseAnalysisResult(result);
  const isDark = theme === 'dark';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            {type === 'explain' ? (
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <Lightbulb className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/40">
                <Rocket className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            )}
            <span className="text-lg">
              {title || (type === 'explain' ? 'SQL 语句解释' : 'SQL 优化建议')}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto mt-4 space-y-6">
          {sections.map((section, index) => (
            <div key={index}>
              {section.type === 'text' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {formatTextContent(section.content)}
                </div>
              ) : (
                <div className="relative group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {section.language?.toUpperCase() || 'SQL'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(section.content, index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2"
                    >
                      {copiedIndex === index ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <SyntaxHighlighter
                      language={section.language || 'sql'}
                      style={isDark ? oneDark : oneLight}
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        backgroundColor: 'transparent',
                      }}
                      showLineNumbers={section.content.split('\n').length > 5}
                      wrapLines={true}
                      wrapLongLines={true}
                    >
                      {section.content}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {sections.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>暂无分析结果</p>
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0 border-t border-border pt-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnalysisResultDialog; 