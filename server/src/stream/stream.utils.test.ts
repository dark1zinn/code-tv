import { describe, expect, it } from 'bun:test';
import { generateStreamSlug } from './stream.utils';

describe('generateStreamSlug', () => {
    it('returns a three-part alpha slug', () => {
        const slug = generateStreamSlug();
        expect(slug.split('-')).toHaveLength(3);
        expect(slug).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
    });
});
