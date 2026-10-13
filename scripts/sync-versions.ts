/**
 * Syncs package-lock.json version fields with package.json.
 *
 * Usage: tsx scripts/sync-versions.ts
 *
 * When PRE_COMMIT=1, exits with code 2 if the lockfile was updated, so a
 * pre-commit hook can distinguish "files changed" from real failures.
 */

import fs from 'node:fs';
import path from 'node:path';

function detectIndent(text: string): number {
    const match = text.match(/^ {2,}"/m);
    return match ? match[0].length - 1 : 4;
}

const pkgPath = path.join(process.cwd(), 'package.json');
const lockPath = path.join(process.cwd(), 'package-lock.json');

if (!fs.existsSync(lockPath)) {
    console.log('No package-lock.json found; nothing to sync.');
    process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const lockText = fs.readFileSync(lockPath, 'utf8');
const lock = JSON.parse(lockText);

if (!pkg.version) {
    process.exit(0);
}

let changed = false;
if (lock.version !== pkg.version) {
    lock.version = pkg.version;
    changed = true;
}
if (lock.packages?.[''] && lock.packages[''].version !== pkg.version) {
    lock.packages[''].version = pkg.version;
    changed = true;
}

if (!changed) {
    console.log('Versions already in sync.');
} else {
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, detectIndent(lockText)) + '\n');
    console.log(`package-lock.json -> ${pkg.version}`);
    if (process.env.PRE_COMMIT === '1') {
        process.exitCode = 2;
    }
}
