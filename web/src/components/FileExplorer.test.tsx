import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    it('renders file tree and toggle aria label', () => {
        render(
            <FileExplorer
                nodes={nodes}
                activeFileId="root/src/main.ts"
                onSelectFile={() => {}}
                visible
                onToggle={() => {}}
            />,
        );

        expect(
            screen.getByLabelText('Toggle active files browser sidebar visibility'),
        ).toBeDefined();
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

        expect(screen.getByText('Show Explorer')).toBeDefined();
    });
});
