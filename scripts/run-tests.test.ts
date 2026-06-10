import { describe, expect, it } from 'bun:test';
import { spawnSync } from 'bun';
import { join } from 'path';

const repoRoot = join(import.meta.dir, '..');

function runPackageTests(packageName: 'server' | 'web') {
    const cwd = join(repoRoot, packageName);
    const result = spawnSync({
        cmd: ['bun', 'test'],
        cwd,
        stdout: 'inherit',
        stderr: 'inherit',
    });
    expect(result.exitCode).toBe(0);
}

describe('workspace tests', () => {
    it('runs server test suite', () => {
        runPackageTests('server');
    });

    it('runs web test suite', () => {
        runPackageTests('web');
    });
});
