import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { fileIdToPath } from '@/lib/files';
import { registerMonacoCompletions } from '@/lib/monaco/completions';

interface CodeEditorProps {
    language: string;
    fileId: string;
    value: string;
    readOnly?: boolean;
    onChange?: (value: string) => void;
    onCursorChange?: (position: { line: number; column: number }) => void;
    onManualInteraction?: () => void;
}

export function CodeEditor({
    language,
    fileId,
    value,
    readOnly = false,
    onChange,
    onCursorChange,
    onManualInteraction,
}: CodeEditorProps) {
    const handleBeforeMount: BeforeMount = (monaco) => {
        registerMonacoCompletions(monaco);
    };

    const handleMount: OnMount = (editorInstance, monaco) => {
        const model = editorInstance.getModel();
        if (model) {
            monaco.editor.setModelLanguage(model, language);
        }

        editorInstance.onDidChangeCursorPosition((event) => {
            onCursorChange?.({
                line: event.position.lineNumber,
                column: event.position.column,
            });
        });
    };

    return (
        <section className="h-full min-h-0 min-w-0 w-full flex-1 bg-bg-base">
            <Editor
                key={`${fileId}:${language}`}
                height="100%"
                language={language}
                path={fileIdToPath(fileId)}
                value={value}
                theme="vs-dark"
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    fontSize: 14,
                    automaticLayout: true,
                }}
                beforeMount={handleBeforeMount}
                onChange={(nextValue) => {
                    onManualInteraction?.();
                    onChange?.(nextValue ?? '');
                }}
                onMount={handleMount}
            />
        </section>
    );
}
