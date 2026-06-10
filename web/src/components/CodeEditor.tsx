import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';

interface CodeEditorProps {
    language: string;
    value: string;
    readOnly?: boolean;
    onChange?: (value: string) => void;
    onCursorChange?: (position: { line: number; column: number }) => void;
    onManualInteraction?: () => void;
}

export function CodeEditor({
    language,
    value,
    readOnly = false,
    onChange,
    onCursorChange,
    onManualInteraction,
}: CodeEditorProps) {
    const handleMount: OnMount = (editorInstance: MonacoEditor.IStandaloneCodeEditor) => {
        editorInstance.onDidChangeCursorPosition((event) => {
            onCursorChange?.({
                line: event.position.lineNumber,
                column: event.position.column,
            });
        });
    };

    return (
        <section className="h-full min-h-0 bg-bg-base">
            <Editor
                height="100%"
                language={language}
                value={value}
                theme="vs-dark"
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    fontSize: 14,
                    automaticLayout: true,
                }}
                onChange={(nextValue) => {
                    onManualInteraction?.();
                    onChange?.(nextValue ?? '');
                }}
                onMount={handleMount}
            />
        </section>
    );
}
