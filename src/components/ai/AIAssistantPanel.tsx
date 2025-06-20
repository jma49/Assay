"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wand2, 
  Lightbulb, 
  Rocket, 
  Sparkles, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';
import { cn } from "@/lib/utils/utils";

interface AIAssistantPanelProps {
  value: string;
  onAnalyze: (type: 'explain' | 'optimize') => void;
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  isAnalyzing: boolean;
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  value,
  onAnalyze,
  onGenerate,
  isGenerating,
  isAnalyzing
}) => {
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('generate');

  const handleGenerate = () => {
    if (generatePrompt.trim()) {
      onGenerate(generatePrompt.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const examplePrompts = [
    '查询所有用户的订单信息',
    '统计每月销售总额',
    '查找重复的邮箱地址',
    '删除过期的会话记录'
  ];

  return (
    <Card className={cn(
      "transition-all duration-300 border-border/50 shadow-sm",
      "bg-gradient-to-br from-card via-card to-muted/5",
      "hover:shadow-md hover:border-border/70"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-semibold">AI 智能助手</CardTitle>
            <Badge variant="secondary" className="text-xs font-medium">
              <Zap className="h-3 w-3 mr-1" />
              实验性功能
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                生成 SQL
              </TabsTrigger>
              <TabsTrigger value="analyze" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                分析优化
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    描述你需要的 SQL 查询
                  </label>
                  <div className="relative">
                    <Textarea
                      placeholder="例如：查询所有用户的订单信息，按创建时间排序..."
                      value={generatePrompt}
                      onChange={(e) => setGeneratePrompt(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="min-h-[80px] resize-none pr-12"
                      disabled={isGenerating}
                    />
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="outline" className="text-xs">
                        Enter 发送
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 示例提示 */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">快速开始：</span>
                  <div className="flex flex-wrap gap-2">
                    {examplePrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setGeneratePrompt(prompt)}
                        disabled={isGenerating}
                        className="h-7 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !generatePrompt.trim()}
                  className="w-full h-10"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                      AI 生成中...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      生成 SQL 代码
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="analyze" className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      当前 SQL 代码
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground bg-background/60 rounded border p-2 max-h-20 overflow-y-auto">
                    {value.trim() ? (
                      <pre className="whitespace-pre-wrap font-mono">
                        {value.length > 100 ? `${value.slice(0, 100)}...` : value}
                      </pre>
                    ) : (
                      <span className="italic">请在编辑器中输入 SQL 代码</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => onAnalyze('explain')}
                    disabled={isAnalyzing || !value.trim()}
                    variant="outline"
                    className="flex-1 h-12 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/20"
                  >
                    {isAnalyzing ? (
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <Lightbulb className="h-4 w-4 mr-2" />
                    )}
                    <div className="flex flex-col items-start">
                      <span className="font-medium">解释代码</span>
                      <span className="text-xs opacity-80">理解 SQL 逻辑</span>
                    </div>
                  </Button>

                  <Button
                    onClick={() => onAnalyze('optimize')}
                    disabled={isAnalyzing || !value.trim()}
                    variant="outline"
                    className="flex-1 h-12 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-950/20"
                  >
                    {isAnalyzing ? (
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <Rocket className="h-4 w-4 mr-2" />
                    )}
                    <div className="flex flex-col items-start">
                      <span className="font-medium">优化建议</span>
                      <span className="text-xs opacity-80">提升性能</span>
                    </div>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* 状态提示 */}
          <div className="flex items-center justify-center mt-4 pt-3 border-t border-border/50">
            <Badge variant="outline" className="text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              AI 助手已就绪
            </Badge>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AIAssistantPanel; 