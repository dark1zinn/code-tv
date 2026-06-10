import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { LiveChat } from './LiveChat';

afterEach(() => cleanup());

describe('LiveChat', () => {
    it('renders aria-live log and labeled input', () => {
        const { container } = render(
            <LiveChat messages={[]} onSend={() => {}} visible onToggle={() => {}} />,
        );

        expect(container.querySelector('[aria-live="log"]')).toBeDefined();
        expect(screen.getByLabelText('Live Room Chat Text Entry')).toBeDefined();
    });
});
