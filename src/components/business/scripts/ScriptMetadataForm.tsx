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
  /** Messages for fields that stop the save; each marks its field invalid. */
  errors?: Partial<Record<"name" | "scriptId" | "cronSchedule", string>>;
  className?: string;
}

function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  /** Replaces the hint and names the field's problem; the input carries aria-invalid itself. */
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-body-sm font-medium">
        {label}
        {required && <span className="text-failure">*</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-caption text-failure">
          {error}
        </p>
      ) : (
        hint && <p className="text-caption text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

const invalidProps = (id: string, error: string | undefined) =>
  error ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-label-caps uppercase text-muted-foreground">
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
  errors = {},
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
        <Field id="name" label={zh ? "名称" : "Name"} required error={errors.name}>
          <Input
            id="name"
            name="name"
            {...invalidProps("name", errors.name)}
            value={formData.name}
            onChange={handleChange}
            placeholder={zh ? "例如：重复下单" : "e.g. Duplicate orders"}
          />
        </Field>

        <Field
          id="scriptId"
          label={zh ? "检查 ID" : "Check ID"}
          required
          error={errors.scriptId}
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
            {...invalidProps("scriptId", errors.scriptId)}
            value={formData.scriptId}
            onChange={handleChange}
            placeholder="duplicate-orders"
            disabled={isEditMode}
            className="font-mono text-body-sm [font-variant-ligatures:none]"
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
            <Label htmlFor="isScheduled" className="text-body-sm font-medium">
              {zh ? "按计划自动执行" : "Run on a schedule"}
            </Label>
            <p className="text-caption text-muted-foreground">
              {zh ? "关闭时只能手动执行" : "When off, the check only runs manually"}
            </p>
          </div>
          <Switch
            id="isScheduled"
            checked={formData.isScheduled}
            onCheckedChange={(checked) => {
              onFormChange("isScheduled", checked);
              // Start from a sensible schedule instead of an empty one.
              if (checked && !formData.cronSchedule.trim()) onFormChange("cronSchedule", "0 9 * * *");
            }}
          />
        </div>
        {formData.isScheduled && (
          <ScheduleSelector
            value={formData.cronSchedule}
            onChange={(cron) => onFormChange("cronSchedule", cron)}
            language={language}
          />
        )}
        {errors.cronSchedule && <p className="text-caption text-failure">{errors.cronSchedule}</p>}
      </Section>

      <details className="group border-t pt-5" open={hasChineseContent}>
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-body-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
          {zh ? "中文名称与描述" : "Chinese name and description"}
          <span className="font-normal text-muted-foreground">{zh ? "（可选）" : "(optional)"}</span>
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
