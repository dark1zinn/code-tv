import { describe, expect, it } from 'bun:test';
import { registerSpaFallback } from './spa-fallback';

describe('registerSpaFallback', () => {
    it('exports spa fallback registrar', () => {
        expect(typeof registerSpaFallback).toBe('function');
    });
});
