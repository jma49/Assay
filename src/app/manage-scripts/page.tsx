"use client";

import React, { useEffect, useState, useCallback, ChangeEvent } from 'react';
import Link from 'next/link';
import { 
  PlusCircle, Edit, Trash2, RefreshCw, Search, AlertTriangle, Save, Loader2, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  SqlScript, // ScriptInfo removed, using SqlScript for list too for consistency
  DashboardTranslationKeys, dashboardTranslations
} from '@/components/dashboard/types';
import { useLanguage } from '@/components/ClientLayoutWrapper';
import { formatDate } from '@/components/dashboard/utils';
import { containsHarmfulSql } from '@/lib/utils';
import { ScriptMetadataForm, ScriptFormData } from '@/components/scripts/ScriptMetadataForm';
import CodeMirrorEditor from '@/components/scripts/CodeMirrorEditor';
import { generateSqlTemplateWithTranslation } from '@/components/dashboard/scriptTranslations';

// Helper type for the form state, combining metadata and SQL content
type ManageScriptFormState = Partial<SqlScript>;

const ManageScriptsPage = () => {
  const [scripts, setScripts] = useState<SqlScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [currentFormScript, setCurrentFormScript] = useState<ManageScriptFormState>({});
  const [currentSqlContent, setCurrentSqlContent] = useState<string>('');
  const [initialSqlContentForEdit, setInitialSqlContentForEdit] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scriptIdManuallyEdited, setScriptIdManuallyEdited] = useState(false);

  const [scriptToDelete, setScriptToDelete] = useState<SqlScript | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const { language } = useLanguage();
  const t = useCallback(
    (key: DashboardTranslationKeys | string): string => {
      const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
      return (langTranslations as Record<string, string>)[key] || key;
    },
    [language]
  );

  const fetchScripts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/scripts');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: t('scriptLoadError') }));
        throw new Error(errorData.message || `Failed to fetch scripts: ${response.status}`);
      }
      const data: SqlScript[] = await response.json();
      setScripts(data.map(s => ({
        ...s,
        createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
        updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
      })));
    } catch (err) {
      console.error("Failed to fetch scripts:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const handleOpenDialog = (mode: 'add' | 'edit', scriptData?: SqlScript) => {
    setDialogMode(mode);
    if (mode === 'add') {
      const newScriptId = `new-script-${Date.now().toString().slice(-6)}`;
      const templateSql = generateSqlTemplateWithTranslation(newScriptId, '', '', '', '');
      setCurrentFormScript({
        scriptId: newScriptId,
        name: '', cnName: '', description: '', cnDescription: '',
        scope: '', cnScope: '', author: '',
      });
      setCurrentSqlContent(templateSql);
      setInitialSqlContentForEdit(templateSql);
      setScriptIdManuallyEdited(false);
    } else if (scriptData) {
      setCurrentFormScript({...scriptData});
      setCurrentSqlContent(scriptData.sqlContent || '');
      setInitialSqlContentForEdit(scriptData.sqlContent || '');
      setScriptIdManuallyEdited(true);
    }
    setIsDialogOpen(true);
  };

  const handleMetadataChange = (fieldName: keyof ScriptFormData, value: string) => {
    setCurrentFormScript((prev: ManageScriptFormState) => ({
      ...prev,
      [fieldName]: value,
    }));
    if (fieldName === 'scriptId') {
      setScriptIdManuallyEdited(true);
    }
    if (dialogMode === 'add' && fieldName === 'name' && !scriptIdManuallyEdited && value) {
      const suggestedId = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setCurrentFormScript((prev: ManageScriptFormState) => ({ ...prev, scriptId: suggestedId }));
    }
  };

  const handleDialogSave = async () => {
    if (!currentFormScript.scriptId || !currentFormScript.name || !currentFormScript.author || !currentSqlContent) {
      toast.error(t('fillRequiredFieldsError'));
      return;
    }
    if (containsHarmfulSql(currentSqlContent)) {
      toast.error(t('SQL content rejected due to potentially harmful DDL/DML commands.') || "Harmful SQL detected!");
      return;
    }

    setIsSubmitting(true);
    const currentPayload: Partial<SqlScript> = {
      ...currentFormScript,
      sqlContent: currentSqlContent,
    };

    let response;
    let successMessage = '';
    let errorMessageKey: DashboardTranslationKeys | string = '';

    try {
      if (dialogMode === 'add') {
        if (!currentPayload.scriptId?.trim()) {
          toast.error(t('invalidScriptIdError'));
          setIsSubmitting(false);
          return;
        }
        response = await fetch('/api/scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentPayload),
        });
        successMessage = t('scriptSavedSuccess');
        errorMessageKey = 'scriptSaveError';
      } else {
        const updatePayload: Partial<Omit<SqlScript, 'scriptId' | '_id' | 'createdAt' | 'updatedAt'>> = {
          name: currentPayload.name,
          cnName: currentPayload.cnName,
          description: currentPayload.description,
          cnDescription: currentPayload.cnDescription,
          scope: currentPayload.scope,
          cnScope: currentPayload.cnScope,
          author: currentPayload.author,
        };
        if (currentSqlContent !== initialSqlContentForEdit) {
          updatePayload.sqlContent = currentSqlContent;
        }
        Object.keys(updatePayload).forEach(key => 
          updatePayload[key as keyof typeof updatePayload] === undefined && delete updatePayload[key as keyof typeof updatePayload]
        );

        response = await fetch(`/api/scripts/${currentFormScript.scriptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
        successMessage = t('scriptUpdatedSuccess');
        errorMessageKey = 'scriptUpdateError';
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: t(errorMessageKey) }));
        throw new Error(errorData.message || `${t(errorMessageKey)}: ${response.status}`);
      }

      toast.success(successMessage);
      setIsDialogOpen(false);
      fetchScripts();
    } catch (err) {
      console.error(`Failed to ${dialogMode} script:`, err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(t(errorMessageKey) || `Failed to ${dialogMode} script`, { description: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (script: SqlScript) => {
    setScriptToDelete(script);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!scriptToDelete) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/scripts/${scriptToDelete.scriptId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: t('scriptDeleteError') }));
        throw new Error(errorData.message || `Failed to delete script: ${response.status}`);
      }
      toast.success(t('scriptDeletedSuccess'), {
        description: `${t('fieldScriptId')}: ${scriptToDelete.scriptId}`,
      });
      fetchScripts();
    } catch (err) {
      console.error("Failed to delete script:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(t('scriptDeleteError'), { description: errorMsg });
    } finally {
      setIsSubmitting(false);
      setIsAlertOpen(false);
      setScriptToDelete(null);
    }
  };
  
  const filteredScripts = scripts.filter(script =>
    script.scriptId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (script.cnName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (script.author || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const dialogTitle = dialogMode === 'add' ? t('addScriptDialogTitle') : t('editScriptDialogTitle');

  const formMetadata: ScriptFormData = {
    scriptId: currentFormScript.scriptId || '',
    name: currentFormScript.name || '',
    cnName: currentFormScript.cnName || '',
    description: currentFormScript.description || '',
    cnDescription: currentFormScript.cnDescription || '',
    author: currentFormScript.author || '',
    scope: currentFormScript.scope || '',
    cnScope: currentFormScript.cnScope || '',
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">
              {t('manageScriptsPageTitle') || 'Manage SQL Scripts'}
            </CardTitle>
            <CardDescription>
              {t('manageScriptsPageDescription') || 'Create, view, update, and delete your SQL scripts.'}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={fetchScripts} variant="outline" size="icon" disabled={isLoading || isSubmitting} aria-label={t('refresh') as string}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => handleOpenDialog('add')}>
              <PlusCircle className="mr-0 h-4 w-4" />
              {t('addNewScriptButton')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative flex items-center">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t('searchScriptsPlaceholder') || 'Search by ID, name, author...'} // TODO: add translation
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="max-w-sm pl-10"
            />
          </div>

          {isLoading && scripts.length === 0 && (
            <div className="space-y-2 pt-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && error && scripts.length === 0 && (
            <div className="text-center py-10">
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive mb-2">{t('errorTitle')}: {error}</p>
              <Button onClick={fetchScripts} variant="outline">
                <RefreshCw className="mr-0 h-4 w-4" /> {t('retry')}
              </Button>
            </div>
          )}

          {!isLoading && !error && filteredScripts.length === 0 && (
             <div className="text-center py-10">
                <p className="text-muted-foreground">{searchTerm ? t('noMatchingRecords') : t('noScriptsYet')}</p>
             </div>
          )}

          {filteredScripts.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">{t('fieldScriptId')}</TableHead>
                    <TableHead>{t('fieldScriptNameEn')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('fieldScriptAuthor')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('fieldCreatedAt')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('fieldUpdatedAt')}</TableHead>
                    <TableHead className="text-right w-[120px]">{t('tableActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScripts.map((script) => (
                    <TableRow key={script.scriptId}>
                      <TableCell className="font-mono text-sm">{script.scriptId}</TableCell>
                      <TableCell>{language === 'zh' && script.cnName ? script.cnName : script.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{script.author || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {script.createdAt ? formatDate(script.createdAt.toString(), language) : '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {script.updatedAt ? formatDate(script.updatedAt.toString(), language) : '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('edit', script)} aria-label={t('editScriptButton') as string}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(script)} aria-label={t('deleteScriptButton') as string}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[70vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'add' ? t('scriptMetadataDesc') : t('editScriptTitle')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-2 space-y-4 py-2">
            <ScriptMetadataForm
              formData={formMetadata}
              onFormChange={handleMetadataChange}
              t={t}
              isEditMode={dialogMode === 'edit'}
            />
            <div>
              <label className="text-sm font-medium mb-1 block">{t('fieldSqlContent')} <span className="text-destructive">*</span></label>
              <CodeMirrorEditor
                value={currentSqlContent}
                onChange={setCurrentSqlContent}
                minHeight='250px'
              />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>{t('cancelButton')}</Button>
            </DialogClose>
            <Button type="button" onClick={handleDialogSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-0 h-4 w-4 animate-spin" /> : <Save className="mr-0 h-4 w-4" />}
              {t('saveScriptButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteScriptTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteScriptMessage').replace('{scriptName}', String(scriptToDelete?.name || scriptToDelete?.scriptId || ''))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setScriptToDelete(null)}>{t('cancelButton')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting && <Loader2 className="mr-0 h-4 w-4 animate-spin" />} 
              {t('deleteButton') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-end mt-8">
        <Link href="/" passHref legacyBehavior>
          <Button asChild>
            <a>
              <Home className="h-4 w-4" /> 
              {t('backToDashboardButton') || 'Back to Dashboard'}
            </a>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ManageScriptsPage; 