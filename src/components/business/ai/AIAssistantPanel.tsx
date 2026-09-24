"use client";

import React, { useState } from "react";
import { Lightbulb, Loader2, Wand2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/common/LanguageProvider";

interface AIAssistantPanelProps {
  value: string;
  onAnalyze: (type: "explain" | "optimize") => void;
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  isAnalyzing: boolean;
}

const copy = {
  en: {
    placeholder: "Describe what the check should find, e.g. orders paid twice",
    generate: "Generate",
    examples: [
      "Orders marked paid with no payment record",
      "Customers with a malformed email",
      "Products priced below cost",
    ],
    explain: "Explain this query",
    optimize: "Suggest optimizations",
  },
  zh: {
    placeholder: "描述这个检查要找出什么，例如：重复支付的订单",
    generate: "生成",
    examples: ["已支付但没有支付记录的订单", "邮箱格式错误的客户", "售价低于成本的商品"],
    explain: "解释这条查询",
    optimize: "优化建议",
  },
};

/** Inline AI helper shown above the SQL editor. */
const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  value,
  onAnalyze,
  onGenerate,
  isGenerating,
  isAnalyzing,
}) => {
  const { language } = useLanguage();
  const t = copy[language];
  const [prompt, setPrompt] = useState("");

  const submit = () => {
    if (prompt.trim()) onGenerate(prompt.trim());
  };

  return (
    <div className="space-y-3 border-b bg-muted/40 px-4 py-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t.placeholder}
          disabled={isGenerating}
          className="h-9 bg-background"
        />
        <Button type="submit" size="sm" className="h-9" disabled={isGenerating || !prompt.trim()}>
          {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 />}
          {t.generate}
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {t.examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              disabled={isGenerating}
              className="rounded-md border bg-background px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {example}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[12px]"
            onClick={() => onAnalyze("explain")}
            disabled={isAnalyzing || !value.trim()}
          >
            <Lightbulb className="size-3.5" />
            {t.explain}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[12px]"
            onClick={() => onAnalyze("optimize")}
            disabled={isAnalyzing || !value.trim()}
          >
            {isAnalyzing ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
            {t.optimize}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPanel;
