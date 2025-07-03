import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { 
  PRESET_SCHEDULES, 
  ScheduleOption,
  getNextExecutionTime,
  formatNextExecutionTime,
  validateCronExpression,
  getPresetValueFromCron,
  getPresetCronExpression
} from "@/lib/utils/schedule-utils-v2";

interface ScheduleSelectorProps {
  value: string; // cron表达式
  onChange: (cronExpression: string) => void;
  language?: 'en' | 'zh';
  disabled?: boolean;
  required?: boolean;
}

export const ScheduleSelector: React.FC<ScheduleSelectorProps> = ({
  value,
  onChange,
  language = 'zh',
  disabled = false,
  required = false,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customCron, setCustomCron] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');
  const [nextExecution, setNextExecution] = useState<Date | null>(null);

  // 初始化状态
  useEffect(() => {
    if (value) {
      const presetValue = getPresetValueFromCron(value);
      if (presetValue === 'custom') {
        setSelectedPreset('custom');
        setCustomCron(value);
        setShowCustomInput(true);
      } else {
        setSelectedPreset(presetValue);
        setShowCustomInput(false);
      }
      
      // 计算下次执行时间
      const nextTime = getNextExecutionTime(value);
      setNextExecution(nextTime);
    } else {
      setSelectedPreset('none');
      setCustomCron('');
      setShowCustomInput(false);
      setNextExecution(null);
    }
  }, [value]);

  // 处理预设选项变化
  const handlePresetChange = (presetValue: string) => {
    setSelectedPreset(presetValue);
    setValidationError('');

    if (presetValue === 'custom') {
      setShowCustomInput(true);
      // 如果选择自定义但没有现有值，不立即调用onChange
      if (customCron) {
        const validation = validateCronExpression(customCron);
        if (validation.valid) {
          onChange(customCron);
          const nextTime = getNextExecutionTime(customCron);
          setNextExecution(nextTime);
        } else {
          setValidationError(validation.error || '');
        }
      }
    } else if (presetValue === 'none') {
      setShowCustomInput(false);
      onChange('');
      setNextExecution(null);
    } else {
      setShowCustomInput(false);
      const cronExpression = getPresetCronExpression(presetValue);
      onChange(cronExpression);
      const nextTime = getNextExecutionTime(cronExpression);
      setNextExecution(nextTime);
    }
  };

  // 处理自定义cron表达式变化
  const handleCustomCronChange = (newCron: string) => {
    setCustomCron(newCron);
    
    if (newCron.trim() === '') {
      setValidationError('');
      onChange('');
      setNextExecution(null);
      return;
    }

    const validation = validateCronExpression(newCron);
    if (validation.valid) {
      setValidationError('');
      onChange(newCron);
      const nextTime = getNextExecutionTime(newCron);
      setNextExecution(nextTime);
    } else {
      setValidationError(validation.error || '');
      setNextExecution(null);
    }
  };

  const getPresetLabel = (option: ScheduleOption) => {
    return language === 'zh' ? option.labelCn : option.label;
  };

  const getPresetDescription = (option: ScheduleOption) => {
    return language === 'zh' ? option.descriptionCn : option.description;
  };

  const t = (key: string) => {
    const translations: Record<string, { en: string; zh: string }> = {
      schedulePreset: { en: "Schedule Preset", zh: "定时模板" },
      selectSchedule: { en: "Select a schedule...", zh: "选择定时模板..." },
      customCronExpression: { en: "Custom Cron Expression", zh: "自定义 Cron 表达式" },
      cronPlaceholder: { en: "e.g., 0 9 * * *", zh: "例如：0 9 * * *" },
      nextExecution: { en: "Next Execution", zh: "下次执行时间" },
      scheduleStatus: { en: "Schedule Status", zh: "定时状态" },
      valid: { en: "Valid", zh: "有效" },
      invalid: { en: "Invalid", zh: "无效" },
    };
    return translations[key]?.[language] || key;
  };

  return (
    <div className="space-y-4">
      {/* 预设选项选择器 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          {t('schedulePreset')}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <Select 
          value={selectedPreset} 
          onValueChange={handlePresetChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('selectSchedule')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              {language === 'zh' ? '不设置定时任务' : 'No schedule'}
            </SelectItem>
            {PRESET_SCHEDULES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{getPresetLabel(option)}</span>
                  <span className="text-xs text-muted-foreground">
                    {getPresetDescription(option)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 自定义cron表达式输入 */}
      {showCustomInput && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            {t('customCronExpression')}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            value={customCron}
            onChange={(e) => handleCustomCronChange(e.target.value)}
            placeholder={t('cronPlaceholder')}
            disabled={disabled}
            className={`font-mono ${validationError ? 'border-destructive' : ''}`}
          />
          {validationError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {validationError}
            </div>
          )}
        </div>
      )}

      {/* 下次执行时间显示 */}
      {(value && !validationError) && (
        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  {t('valid')}
                </Badge>
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  {t('scheduleStatus')}
                </span>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <span className="font-medium">{t('nextExecution')}:</span>
                </p>
                <p className="text-sm font-mono text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded">
                  {formatNextExecutionTime(nextExecution, language)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 无效状态显示 */}
      {validationError && (
        <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  {t('invalid')}
                </Badge>
                <span className="text-sm font-medium text-red-900 dark:text-red-100">
                  {t('scheduleStatus')}
                </span>
              </div>
              <p className="text-sm text-red-800 dark:text-red-200">
                {validationError}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 