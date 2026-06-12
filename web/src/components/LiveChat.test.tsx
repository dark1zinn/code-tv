import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { LiveChat } from './LiveChat';
import { FOCUS_CHAT_SHORTCUT_LABEL } from '@/lib/keyboard-shortcuts';

afterEach(() => cleanup());

describe('LiveChat', () => {
    it('renders aria-live log and shortcut placeholder', () => {
        const { container } = render(
            <LiveChat messages={[]} onSend={() => {}} onToggle={() => {}} />,
        );

        expect(container.querySelector('[aria-live="log"]')).toBeDefined();
        expect(screen.getByLabelText('Live Room Chat Text Entry')).toBeDefined();
        expect(screen.getByPlaceholderText(FOCUS_CHAT_SHORTCUT_LABEL)).toBeDefined();
        expect(screen.getByLabelText('Hide chat sidebar')).toBeDefined();
    });
});
