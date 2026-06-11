import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { FileExplorer } from './FileExplorer';

afterEach(() => cleanup());

const nodes = [
    {
        name: 'src',
        type: 'folder' as const,
        children: [{ name: 'main.ts', type: 'file' as const }],
    },
];

describe('FileExplorer', () => {
    it('renders explorer title and tree', () => {
        render(
            <FileExplorer
                nodes={nodes}
                activeFileId="root/src/main.ts"
                onSelectFile={() => {}}
                visible
                onToggle={() => {}}
            />,
        );

        expect(screen.getByText('Explorer')).toBeDefined();
        expect(screen.getByLabelText('Hide explorer sidebar')).toBeDefined();
        expect(screen.getByText('src')).toBeDefined();
    });

    it('shows collapsed toggle when hidden', () => {
        render(
            <FileExplorer
                nodes={nodes}
                activeFileId=""
                onSelectFile={() => {}}
                visible={false}
                onToggle={() => {}}
            />,
        );

        expect(screen.getByLabelText('Show explorer sidebar')).toBeDefined();
    });

    it('hides new actions when read only', () => {
        render(
            <FileExplorer
                nodes={nodes}
                activeFileId="root/src/main.ts"
                onSelectFile={() => {}}
                visible
                onToggle={() => {}}
                readOnly
            />,
        );

        expect(screen.queryByLabelText('New file or folder')).toBeNull();
    });
});
