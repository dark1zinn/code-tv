import { describe, expect, it } from 'bun:test';
import { addWorkspaceTag, normalizeTagInput } from './workspace-tags';

describe('workspace-tags', () => {
    it('normalizes tag input', () => {
        expect(normalizeTagInput('  React  ')).toBe('react');
        expect(normalizeTagInput('bad tag')).toBeNull();
    });

    it('adds unique tags up to the limit', () => {
        const tags = ['typescript'];
        expect(addWorkspaceTag(tags, 'react')).toEqual(['typescript', 'react']);
        expect(addWorkspaceTag(tags, 'typescript')).toBeNull();
    });
});
