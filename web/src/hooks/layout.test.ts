import { describe, expect, it } from 'bun:test';
import {
    getOrderClass,
    getSidePanelOnSide,
    type EditorLayoutMatrix,
} from './useEditorLayout';

const base: EditorLayoutMatrix = {
    explorerVisible: true,
    explorerPosition: 'left',
    chatVisible: true,
    chatPosition: 'right',
};

describe('getOrderClass', () => {
    it('orders explorer on the left', () => {
        expect(getOrderClass('explorer', base)).toBe('order-1');
        expect(getOrderClass('editor', base)).toBe('order-3 flex-1');
        expect(getOrderClass('chat', base)).toBe('order-5');
    });

    it('orders chat on the left when configured', () => {
        const state = { ...base, chatPosition: 'left' as const };
        expect(getOrderClass('chat', state)).toBe('order-2');
    });

    it('orders explorer on the right when sides are swapped', () => {
        const state = {
            ...base,
            explorerPosition: 'right' as const,
            chatPosition: 'left' as const,
        };
        expect(getOrderClass('explorer', state)).toBe('order-4');
        expect(getOrderClass('chat', state)).toBe('order-2');
    });

    it('hides side panels from ordering when not visible', () => {
        const state = { ...base, explorerVisible: false, chatVisible: false };
        expect(getOrderClass('explorer', state)).toBe('order-3 flex-1');
        expect(getOrderClass('chat', state)).toBe('order-3 flex-1');
    });
});

describe('getSidePanelOnSide', () => {
    const base: EditorLayoutMatrix = {
        explorerVisible: true,
        explorerPosition: 'left',
        chatVisible: true,
        chatPosition: 'right',
    };

    it('maps default layout to left explorer and right chat', () => {
        expect(getSidePanelOnSide('left', base, true)).toBe('explorer');
        expect(getSidePanelOnSide('right', base, true)).toBe('chat');
    });

    it('maps swapped layout to left chat and right explorer', () => {
        const swapped = {
            ...base,
            explorerPosition: 'right' as const,
            chatPosition: 'left' as const,
        };
        expect(getSidePanelOnSide('left', swapped, true)).toBe('chat');
        expect(getSidePanelOnSide('right', swapped, true)).toBe('explorer');
    });
});
