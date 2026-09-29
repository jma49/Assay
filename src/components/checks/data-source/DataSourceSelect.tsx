import { Database } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DataSourceOption } from "./useDataSourceOptions";

const COPY = {
  en: { label: "Data source", hint: "The database this check runs against. Templates, AI drafts and dry runs use it too." },
  zh: { label: "数据源", hint: "这个检查读取的数据库。模板、AI 生成和试运行也会使用它。" },
};

/**
 * Picks the database a check runs against. Shown only when there is a
 * choice: with one source every check uses it and the field is noise.
 */
export function DataSourceSelect({
  id = "dataSourceId",
  value,
  options,
  onChange,
  language,
  withHint = true,
}: {
  id?: string;
  value: string;
  options: DataSourceOption[];
  onChange: (sourceId: string) => void;
  language: "en" | "zh";
  /** The hint explains the choice in the check editors; pages that only filter by source leave it out. */
  withHint?: boolean;
}) {
  if (options.length <= 1) return null;
  const t = COPY[language];
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-body-sm font-medium">
        {t.label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.sourceId} value={option.sourceId}>
              <Database className="size-4" />
              <span className="truncate">{option.label}</span>
              <span className="font-mono text-caption text-muted-foreground">{option.sourceId}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {withHint && <p className="text-caption text-muted-foreground">{t.hint}</p>}
    </div>
  );
}
