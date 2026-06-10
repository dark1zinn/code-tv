import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';

mock.module('./hooks/useSocket', () => ({
    useSocket: () => ({
        connected: true,
        emit: async () => ({}),
        on: () => () => {},
        socket: { current: null },
    }),
}));

mock.module('./hooks/useStreamSession', () => ({
    useStreamSession: () => ({
        state: {
            profile: { username: 'Anon-1234' },
            roomSlug: 'alpha-bravo-compile',
            language: 'typescript',
            activeFileId: 'root/src/main.ts',
            code: 'export {}\n',
            isHost: true,
            isFollowingHost: true,
            messages: [],
        },
        setState: () => {},
        streamCode: async () => {},
        sendChat: async () => {},
        fileNodes: [{ name: 'src', type: 'folder', children: [{ name: 'main.ts', type: 'file' }] }],
    }),
}));

mock.module('@monaco-editor/react', () => ({
    default: () => <div data-testid="monaco-editor" />,
}));

afterEach(() => cleanup());

describe('App', () => {
    it('renders workspace panels and connection status', async () => {
        const App = (await import('./App')).default;
        render(<App />);
        expect(screen.getByText('codeTV')).toBeDefined();
        expect(screen.getByText('Anon-1234')).toBeDefined();
        expect(screen.getByText('alpha-bravo-compile')).toBeDefined();
        expect(screen.getByTestId('monaco-editor')).toBeDefined();
        expect(screen.getByLabelText('Live Room Chat Text Entry')).toBeDefined();
    });
});
