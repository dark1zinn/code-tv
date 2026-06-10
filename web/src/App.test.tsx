import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const fetchMock = mock(async (url: string) => {
    if (url.includes('/_api/profile')) {
        return new Response(JSON.stringify({ username: 'Anon-1234' }));
    }
    if (url.includes('/_api/streams')) {
        return new Response(JSON.stringify([]));
    }
    return new Response('{}', { status: 404 });
});

globalThis.fetch = fetchMock as unknown as typeof fetch;

mock.module('./hooks/useSocket', () => ({
    useSocket: () => ({
        connected: true,
        emit: async () => ({}),
        on: () => () => {},
        socket: { current: null },
    }),
}));

mock.module('@monaco-editor/react', () => ({
    default: () => <div data-testid="monaco-editor" />,
}));

afterEach(() => cleanup());

describe('App', () => {
    it('renders home page with CodeTV title', async () => {
        const App = (await import('./App')).default;
        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>,
        );
        expect(screen.getByText('CodeTV')).toBeDefined();
        expect(screen.getByText('Live Streams')).toBeDefined();
    });
});
