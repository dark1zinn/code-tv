import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import App from './App';

afterEach(() => {
    cleanup();
});

describe('App', () => {
    it('renders the codeTV heading', () => {
        render(<App />);
        expect(screen.getByText('codeTV')).toBeDefined();
    });
});
