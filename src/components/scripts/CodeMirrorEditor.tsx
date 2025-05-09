import React from 'react';
import ReactCodeMirror, { ReactCodeMirrorProps } from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { okaidia } from '@uiw/codemirror-theme-okaidia'; // Use @uiw dark theme
import { githubLight } from '@uiw/codemirror-theme-github'; 
import { useTheme } from 'next-themes';

interface CodeMirrorEditorProps extends Omit<ReactCodeMirrorProps, 'value' | 'onChange' | 'extensions' | 'theme'> {
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  minHeight = '300px',
  ...rest
}) => {
  const { theme: currentTheme } = useTheme();

  const editorTheme = React.useMemo(() => {
    return currentTheme === 'dark' ? okaidia : githubLight;
  }, [currentTheme]);

  return (
    <ReactCodeMirror
      value={value}
      onChange={onChange}
      extensions={[sql()]} 
      theme={editorTheme}
      height="auto" // Auto height based on content
      minHeight={minHeight} // Minimum height
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
        // You can customize more basicSetup options here
      }}
      className="border rounded-md text-sm" // Add some basic styling to fit in
      // Spread any additional ReactCodeMirrorProps
      {...rest}
    />
  );
};

export default CodeMirrorEditor; 