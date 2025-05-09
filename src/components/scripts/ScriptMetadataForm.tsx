import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DashboardTranslationKeys } from '@/components/dashboard/types'; // For t function type

// Define the shape of the script metadata
export interface ScriptFormData {
  scriptId: string;
  name: string;
  cnName: string;
  description: string;
  cnDescription: string;
  author: string;
  scope: string;
  cnScope: string;
  // sqlContent will be handled separately by the CodeMirror editor
}

interface ScriptMetadataFormProps {
  formData: ScriptFormData;
  onFormChange: (fieldName: keyof ScriptFormData, value: string) => void;
  t: (key: DashboardTranslationKeys | string) => string; // Allow string for new keys initially
  isEditMode?: boolean; // To disable scriptId field in edit mode
}

export const ScriptMetadataForm: React.FC<ScriptMetadataFormProps> = ({
  formData,
  onFormChange,
  t,
  isEditMode = false,
}) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onFormChange(e.target.name as keyof ScriptFormData, e.target.value);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('scriptMetadataTitle') || 'Script Metadata'}</CardTitle>
        <CardDescription>{t('scriptMetadataDesc') || 'Provide details for the SQL script.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* First Row: scriptId and Author */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: scriptId */}
          <div className="space-y-2">
            <Label htmlFor="scriptId">{t('fieldScriptId') || 'Script ID'} <span className="text-destructive">*</span></Label>
            <Input
              id="scriptId"
              name="scriptId"
              value={formData.scriptId}
              onChange={handleChange}
              placeholder={t('scriptIdPlaceholder') || 'e.g., check-user-activity'}
              required
              disabled={isEditMode}
              className={isEditMode ? 'bg-muted/50' : ''}
            />
            {/* TODO: Add client-side validation for format and auto-generation suggestion */}
          </div>
          {/* Column 2: Author */}
          <div className="space-y-2">
            <Label htmlFor="author">{t('fieldScriptAuthor') || 'Author'}</Label>
            <Input
              id="author"
              name="author"
              value={formData.author}
              onChange={handleChange}
              placeholder="e.g., Jane Doe"
            />
          </div>
        </div>

        {/* Second Row: EN/CN fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t"> {/* Added top padding and border */} 
          {/* Column 1 (EN) */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('fieldScriptNameEn') || 'Name (EN)'} <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Check User Activity"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope">{t('fieldScriptScopeEn') || 'Scope (EN)'}</Label>
              <Input
                id="scope"
                name="scope"
                value={formData.scope}
                onChange={handleChange}
                placeholder="e.g., User Management, Orders"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('fieldScriptDescriptionEn') || 'Description (EN)'}</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Briefly describe what this script does."
                rows={3}
              />
            </div>
          </div>

          {/* Column 2 (CN) */}
          <div className="space-y-4">
             <div className="space-y-2">
              <Label htmlFor="cnName">{t('fieldScriptNameCn') || 'Name (CN)'}</Label>
              <Input
                id="cnName"
                name="cnName"
                value={formData.cnName}
                onChange={handleChange}
                placeholder="例如, 检查用户活跃度"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnScope">{t('fieldScriptScopeCn') || 'Scope (CN)'}</Label>
              <Input
                id="cnScope"
                name="cnScope"
                value={formData.cnScope}
                onChange={handleChange}
                placeholder="例如, 用户管理, 订单"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnDescription">{t('fieldScriptDescriptionCn') || 'Description (CN)'}</Label>
              <Textarea
                id="cnDescription"
                name="cnDescription"
                value={formData.cnDescription}
                onChange={handleChange}
                placeholder="简要描述此脚本的功能。"
                rows={3}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 