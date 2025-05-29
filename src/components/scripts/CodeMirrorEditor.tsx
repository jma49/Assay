import React, { useState } from 'react';
import ReactCodeMirror, { ReactCodeMirrorProps } from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { okaidia } from '@uiw/codemirror-theme-okaidia'; // Use @uiw dark theme
import { githubLight } from '@uiw/codemirror-theme-github'; 
import { useTheme } from 'next-themes';
import { format } from 'sql-formatter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Code, 
  Sparkles, 
  Eye, 
  FileCode,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardTranslationKeys } from '../dashboard/types';

interface CodeMirrorEditorProps extends Omit<ReactCodeMirrorProps, 'value' | 'onChange' | 'extensions' | 'theme'> {
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
  t?: (key: DashboardTranslationKeys | string) => string;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  minHeight = '300px',
  t = (key) => key.toString(),
  ...rest
}) => {
  const { theme: currentTheme } = useTheme();
  const [showPreview, setShowPreview] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);

  const editorTheme = React.useMemo(() => {
    return currentTheme === 'dark' ? okaidia : githubLight;
  }, [currentTheme]);

  const handleFormat = async () => {
    if (!value.trim()) {
      toast.warning(t('noCodeToFormat'));
      return;
    }

    setIsFormatting(true);
    try {
      const formatted = format(value, {
        language: 'sql',
        keywordCase: 'upper',
        dataTypeCase: 'upper',
        functionCase: 'upper',
        identifierCase: 'preserve',
        indentStyle: 'standard',
        logicalOperatorNewline: 'before',
        expressionWidth: 50,
        linesBetweenQueries: 2,
        denseOperators: false,
        newlineBeforeSemicolon: false,
      });
      onChange(formatted);
      toast.success(t('formatSuccess'), {
        description: t('formatSuccessDesc'),
        duration: 3000,
      });
    } catch (error) {
      console.error('SQL formatting error:', error);
      toast.error(t('formatError'), {
        description: error instanceof Error ? error.message : t('formatErrorDesc'),
        duration: 5000,
      });
    } finally {
      setIsFormatting(false);
    }
  };

  const getLineCount = (text: string) => text.split('\n').length;
  const getCharCount = (text: string) => text.length;

  return (
    <div className="space-y-4">
      {/* 编辑器工具栏 */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/40 to-muted/20 rounded-lg border border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 ring-2 ring-primary/20">
              <FileCode className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">{t('sqlEditorTitle')}</h3>
              <p className="text-xs text-muted-foreground">{t('sqlEditorDescription')}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 代码统计 */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-background/60 border border-border/40">
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-700">
              {getLineCount(value)} {t('codeStatisticsLines')}
            </Badge>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-700">
              {getCharCount(value)} {t('codeStatisticsChars')}
            </Badge>
          </div>

          {/* 预览切换 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-8 px-3 text-xs"
          >
            {showPreview ? (
              <><Code className="h-3.5 w-3.5 mr-1.5" />{t('editMode')}</>
            ) : (
              <><Eye className="h-3.5 w-3.5 mr-1.5" />{t('previewMode')}</>
            )}
          </Button>

          {/* 格式化按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFormat}
            disabled={isFormatting || !value.trim()}
            className="h-8 px-3 text-xs shadow-sm transition-all duration-200 hover:shadow-md hover:bg-primary/10 hover:border-primary/50 hover:text-primary focus:ring-2 focus:ring-primary/20"
          >
            {isFormatting ? (
              <><div className="animate-spin h-3.5 w-3.5 mr-1.5 border-2 border-current border-t-transparent rounded-full" />{t('formatting')}</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5 mr-1.5" />{t('formatCode')}</>
            )}
          </Button>
        </div>
      </div>

      {/* 编辑器容器 */}
      <div className="relative overflow-hidden rounded-lg border-2 border-border/40 bg-gradient-to-br from-background via-background to-muted/5 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-border/60">
        {/* 装饰性顶部条 */}
        <div className="h-1 bg-gradient-to-r from-primary/60 via-primary/40 to-primary/60"></div>
        
        {showPreview ? (
          // 预览模式
          <div className="p-6 bg-gradient-to-br from-muted/10 to-muted/5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">{t('sqlPreviewLabel')}</span>
            </div>
            <pre className="whitespace-pre-wrap text-sm font-mono bg-background/80 border border-border/40 rounded-md p-4 max-h-96 overflow-auto">
              {value || <span className="italic text-muted-foreground">{t('noCodeContent')}</span>}
            </pre>
          </div>
        ) : (
          // 编辑模式
          <div className="relative">
            <ReactCodeMirror
              value={value}
              onChange={onChange}
              extensions={[sql()]} 
              theme={editorTheme}
              height="auto"
              minHeight={minHeight}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                history: true,
                drawSelection: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                syntaxHighlighting: true,
                autocompletion: true,
                bracketMatching: true,
                closeBrackets: true,
                highlightActiveLine: true,
                searchKeymap: true,
              }}
              className="text-sm leading-relaxed"
              placeholder={t('sqlPlaceholder')}
              {...rest}
            />
            
            {/* 编辑器状态指示器 */}
            <div className="absolute bottom-2 right-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm border border-border/40 shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground font-mono">{t('editorStatusReady')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 编辑器提示信息 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-lg border border-blue-200/60 dark:border-blue-800/60">
        <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/40">
          <Palette className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-xs text-blue-700 dark:text-blue-300">
          <span className="font-medium">提示:</span> {t('editorHelpText')}
        </div>
      </div>
    </div>
  );
};

export default CodeMirrorEditor; 