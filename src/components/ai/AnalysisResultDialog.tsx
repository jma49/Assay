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
    // 处理列表项
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // 检查是否是标题（以#开头）
      if (trimmedLine.startsWith('#')) {
        const level = trimmedLine.match(/^#{1,6}/)?.[0].length || 1;
        const content = trimmedLine.replace(/^#{1,6}\s*/, '');
        const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-xs'];
        const sizeClass = sizes[Math.min(level - 1, sizes.length - 1)];
        
        return (
          <h3 key={index} className={`${sizeClass} font-bold mt-4 mb-2 text-foreground`}>
            {content}
          </h3>
        );
      }
      
      // 检查是否是列表项
      if (trimmedLine.match(/^[-*]\s+/)) {
        const content = trimmedLine.replace(/^[-*]\s+/, '');
        return (
          <div key={index} className="flex items-start gap-2 my-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
            <span className="text-muted-foreground leading-relaxed">{content}</span>
          </div>
        );
      }
      
      // 检查是否是数字列表
      if (trimmedLine.match(/^\d+\.\s+/)) {
        const match = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
        if (match) {
          return (
            <div key={index} className="flex items-start gap-2 my-1">
              <span className="text-primary font-medium mt-0.5 flex-shrink-0">{match[1]}.</span>
              <span className="text-muted-foreground leading-relaxed">{match[2]}</span>
            </div>
          );
        }
      }
      
      // 处理粗体文本
      const formattedText = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      if (trimmedLine) {
        return (
          <p key={index} className="text-muted-foreground leading-relaxed my-2" 
             dangerouslySetInnerHTML={{ __html: formattedText }} />
        );
      }
      
      return null;
    }).filter(Boolean);
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