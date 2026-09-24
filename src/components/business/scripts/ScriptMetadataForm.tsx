import React from "react";
import { ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { HashtagInput } from "@/components/ui/hashtag-input";
import { ScheduleSelector } from "@/components/ui/schedule-selector";
import { useLanguage } from "@/components/common/LanguageProvider";
import { DashboardTranslationKeys } from "@/components/business/dashboard/types";
import { cn } from "@/lib/utils/utils";

export interface ScriptFormData {
  scriptId: string;
  name: string;
  cnName: string;
  description: string;
  cnDescription: string;
  author: string;
  scope: string;
  cnScope: string;
  hashtags: string[];
  isScheduled: boolean;
  cronSchedule: string;
}

interface ScriptMetadataFormProps {
  formData: ScriptFormData;
  onFormChange: (
    fieldName: keyof ScriptFormData,
    value: string | boolean | string[],
  ) => void;
  /** Unused since the form carries its own labels; kept for existing callers. */
  t?: (key: DashboardTranslationKeys | string) => string;
  /** Script ID cannot change once the script exists. */
  isEditMode?: boolean;
  className?: string;
}

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium">
        {label}
        {required && <span className="text-failure">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export const ScriptMetadataForm: React.FC<ScriptMetadataFormProps> = ({
  formData,
  onFormChange,
  isEditMode = false,
  className,
}) => {
  const { language } = useLanguage();
  const zh = language === "zh";
  const hasChineseContent = Boolean(
    formData.cnName || formData.cnDescription || formData.cnScope,
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    onFormChange(e.target.name as keyof ScriptFormData, e.target.value);
  };

  return (
    <div className={cn("space-y-5", className)}>
      <Section title={zh ? "基本信息" : "Details"}>
        <Field id="name" label={zh ? "名称" : "Name"} required>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={zh ? "例如：重复下单" : "e.g. Duplicate orders"}
          />
        </Field>

        <Field
          id="scriptId"
          label={zh ? "脚本 ID" : "Script ID"}
          required
          hint={
            isEditMode
              ? zh ? "创建后不可修改" : "Cannot be changed after creation"
              : zh
                ? "根据名称自动生成，只能用小写字母、数字和连字符"
                : "Generated from the name. Lowercase letters, numbers and hyphens."
          }
        >
          <Input
            id="scriptId"
            name="scriptId"
            value={formData.scriptId}
            onChange={handleChange}
            placeholder="duplicate-orders"
            disabled={isEditMode}
            className="font-mono text-[13px]"
          />
        </Field>

        <Field id="description" label={zh ? "描述" : "Description"}>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder={
              zh
                ? "这个检查找的是什么问题，为什么重要"
                : "What this check looks for and why it matters"
            }
          />
        </Field>

        <Field id="scope" label={zh ? "范围" : "Scope"}>
          <Input
            id="scope"
            name="scope"
            value={formData.scope}
            onChange={handleChange}
            placeholder={zh ? "例如：订单、支付" : "e.g. orders, payments"}
          />
        </Field>

        <HashtagInput
          hashtags={formData.hashtags || []}
          onHashtagsChange={(hashtags) => onFormChange("hashtags", hashtags)}
          label={zh ? "标签" : "Tags"}
          placeholder={zh ? "输入后回车" : "Type and press Enter"}
          helperText={zh ? "最多 8 个" : "Up to 8"}
          maxTags={8}
        />

        <Field
          id="author"
          label={zh ? "作者" : "Author"}
          hint={zh ? "留空时使用当前账号" : "Defaults to your account"}
        >
          <Input
            id="author"
            name="author"
            value={formData.author}
            onChange={handleChange}
          />
        </Field>
      </Section>

      <Section title={zh ? "定时执行" : "Schedule"}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="isScheduled" className="text-[13px] font-medium">
              {zh ? "按计划自动执行" : "Run on a schedule"}
            </Label>
            <p className="text-[12px] text-muted-foreground">
              {zh ? "关闭时只能手动执行" : "When off, the check only runs manually"}
            </p>
          </div>
          <Switch
            id="isScheduled"
            checked={formData.isScheduled}
            onCheckedChange={(checked) => onFormChange("isScheduled", checked)}
          />
        </div>
        {formData.isScheduled && (
          <ScheduleSelector
            value={formData.cronSchedule}
            onChange={(cron) => onFormChange("cronSchedule", cron)}
            language={language}
            required
          />
        )}
      </Section>

      <details className="group border-t pt-5" open={hasChineseContent}>
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
          <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
          {zh ? "中文信息（可选）" : "Chinese translation (optional)"}
        </summary>
        <div className="mt-4 space-y-4">
          <Field id="cnName" label="名称">
            <Input id="cnName" name="cnName" value={formData.cnName} onChange={handleChange} />
          </Field>
          <Field id="cnDescription" label="描述">
            <Textarea
              id="cnDescription"
              name="cnDescription"
              value={formData.cnDescription}
              onChange={handleChange}
              rows={3}
            />
          </Field>
          <Field id="cnScope" label="范围">
            <Input id="cnScope" name="cnScope" value={formData.cnScope} onChange={handleChange} />
          </Field>
        </div>
      </details>
    </div>
  );
};
