import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import type { CursorCoordinates, MonacoContentChange } from '@/lib/code-stream';
import { fileIdToPath } from '@/lib/files';
import { registerMonacoCompletions } from '@/lib/monaco/completions';
import { cn } from '@/lib/utils';

let focusEditorHandler: (() => void) | null = null;

export function focusCodeEditor() {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.id === 'live-room-chat') {
        active.blur();
        requestAnimationFrame(() => focusEditorHandler?.());
        return;
    }
    focusEditorHandler?.();
}

export interface CodeEditorHandle {
    setDocument: (value: string, cursor?: CursorCoordinates) => void;
    setRemoteCursor: (cursor: CursorCoordinates) => void;
    applyRemoteEdits: (
        changes: MonacoContentChange[],
        cursor?: CursorCoordinates,
        fallbackValue?: string,
    ) => boolean;
}

interface CodeEditorProps {
    language: string;
    fileId: string;
    value: string;
    readOnly?: boolean;
    liveRemote?: boolean;
    showHostCursor?: boolean;
    editorRevision?: number;
    onChange?: (value: string) => void;
    onModelContentChange?: (
        changes: MonacoContentChange[],
        value: string,
        cursor: CursorCoordinates,
    ) => void;
    onCursorChange?: (position: CursorCoordinates) => void;
    onEditorReady?: () => void;
}

function serializeChanges(
    changes: MonacoEditor.IModelContentChange[],
): MonacoContentChange[] {
    return changes.map((change) => ({
        range: {
            startLineNumber: change.range.startLineNumber,
            startColumn: change.range.startColumn,
            endLineNumber: change.range.endLineNumber,
            endColumn: change.range.endColumn,
        },
        rangeOffset: change.rangeOffset,
        rangeLength: change.rangeLength,
        text: change.text,
    }));
}

function readCursor(editor: MonacoEditor.IStandaloneCodeEditor): CursorCoordinates {
    const position = editor.getPosition();
    return {
        line: position?.lineNumber ?? 1,
        column: position?.column ?? 1,
    };
}

function modelUri(fileId: string, liveRemote: boolean, editorRevision: number): string {
    const path = fileIdToPath(fileId);
    if (!liveRemote) return path;
    return `live://${path}?rev=${editorRevision}`;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
    {
        language,
        fileId,
        value,
        readOnly = false,
        liveRemote = false,
        showHostCursor = false,
        editorRevision = 0,
        onChange,
        onModelContentChange,
        onCursorChange,
        onEditorReady,
    },
    ref,
) {
    const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
    const applyingRemoteRef = useRef(false);
    const liveRemoteRef = useRef(liveRemote);
    const onModelContentChangeRef = useRef(onModelContentChange);
    const onChangeRef = useRef(onChange);
    const onCursorChangeRef = useRef(onCursorChange);
    const onEditorReadyRef = useRef(onEditorReady);

    liveRemoteRef.current = liveRemote;
    onModelContentChangeRef.current = onModelContentChange;
    onChangeRef.current = onChange;
    onCursorChangeRef.current = onCursorChange;
    onEditorReadyRef.current = onEditorReady;

    const replaceModelContent = (
        editor: MonacoEditor.IStandaloneCodeEditor,
        nextValue: string,
        cursor?: CursorCoordinates,
    ) => {
        const model = editor.getModel();
        if (!model) return;

        applyingRemoteRef.current = true;
        editor.pushUndoStop();
        model.setValue(nextValue);
        applyingRemoteRef.current = false;

        if (cursor) {
            editor.setPosition({
                lineNumber: cursor.line,
                column: cursor.column,
            });
            editor.revealPositionInCenter({
                lineNumber: cursor.line,
                column: cursor.column,
            });
        }
    };

    useImperativeHandle(ref, () => ({
        setDocument(nextValue: string, cursor?: CursorCoordinates) {
            const editor = editorRef.current;
            if (!editor) return;
            replaceModelContent(editor, nextValue, cursor);
        },
        setRemoteCursor(cursor: CursorCoordinates) {
            const editor = editorRef.current;
            if (!editor) return;

            editor.setPosition({
                lineNumber: cursor.line,
                column: cursor.column,
            });
            editor.revealPositionInCenter({
                lineNumber: cursor.line,
                column: cursor.column,
            });
        },
        applyRemoteEdits(
            _changes: MonacoContentChange[],
            cursor?: CursorCoordinates,
            fallbackValue?: string,
        ) {
            const editor = editorRef.current;
            if (!editor || fallbackValue === undefined) return false;

            replaceModelContent(editor, fallbackValue, cursor);
            return true;
        },
    }));

    useEffect(() => {
        focusEditorHandler = () => {
            editorRef.current?.focus();
        };
        return () => {
            focusEditorHandler = null;
        };
    }, []);

    useEffect(() => {
        const editor = editorRef.current;
        const model = editor?.getModel();
        if (!editor || !model || !liveRemote || applyingRemoteRef.current) return;
        if (model.getValue() !== value) {
            replaceModelContent(editor, value);
        }
    }, [value, liveRemote]);

    const handleMount: OnMount = (editorInstance, monaco) => {
        editorRef.current = editorInstance;
        monacoRef.current = monaco;
        focusEditorHandler = () => {
            editorInstance.focus();
        };
        const model = editorInstance.getModel();
        if (model) {
            monaco.editor.setModelLanguage(model, language);
            if (liveRemoteRef.current && model.getValue() !== value) {
                replaceModelContent(editorInstance, value);
            }
        }

        editorInstance.onDidChangeCursorPosition((event) => {
            onCursorChangeRef.current?.({
                line: event.position.lineNumber,
                column: event.position.column,
            });
        });

        editorInstance.onDidChangeModelContent((event) => {
            if (applyingRemoteRef.current || event.isFlush) return;

            const nextValue = editorInstance.getModel()?.getValue() ?? '';
            const cursorCoordinates = readCursor(editorInstance);

            if (!readOnly) {
                onModelContentChangeRef.current?.(
                    serializeChanges(event.changes),
                    nextValue,
                    cursorCoordinates,
                );
            }
        });

        onEditorReadyRef.current?.();
    };

    const handleBeforeMount: BeforeMount = (monaco) => {
        registerMonacoCompletions(monaco);
    };

    const handleEditorChange = (nextValue: string | undefined) => {
        if (readOnly || applyingRemoteRef.current) return;
        onChangeRef.current?.(nextValue ?? '');
    };

    return (
        <section
            className={cn(
                'h-full min-h-0 min-w-0 w-full flex-1 bg-bg-base',
                showHostCursor && 'codetv-viewer-editor',
            )}
        >
            <Editor
                height="100%"
                language={language}
                path={modelUri(fileId, liveRemote, editorRevision)}
                value={value}
                theme="vs-dark"
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    fontSize: 14,
                    automaticLayout: true,
                    cursorBlinking: 'blink',
                    cursorStyle: showHostCursor ? 'block' : 'line',
                    renderLineHighlight: liveRemote ? 'line' : 'all',
                }}
                beforeMount={handleBeforeMount}
                onMount={handleMount}
                onChange={handleEditorChange}
            />
        </section>
    );
});
