import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';

mock.module('@monaco-editor/react', () => ({
    default: ({ language }: { language: string }) => (
        <div data-testid="monaco-editor">language:{language}</div>
    ),
}));

afterEach(() => cleanup());

describe('CodeEditor', () => {
    it('renders monaco editor with language prop', async () => {
        const { CodeEditor } = await import('./CodeEditor');
        render(
            <CodeEditor
                language="typescript"
                fileId="root/src/main.ts"
                value="const x = 1;"
                onChange={() => {}}
            />,
        );
        expect(screen.getByTestId('monaco-editor').textContent).toContain('typescript');
    });
});
