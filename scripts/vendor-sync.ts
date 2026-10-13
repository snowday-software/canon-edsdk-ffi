import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { path7z } from '7zip-bin-full';

const VENDOR_ROOT = path.resolve(process.cwd(), 'vendor');
const SDK_ROOT = path.join(VENDOR_ROOT, 'sdk');
const BIN_ROOT = path.join(VENDOR_ROOT, 'bin');

function ensureDir(dir: string): void {
    fs.mkdirSync(dir, { recursive: true });
}

function dirHasFiles(dir: string): boolean {
    try {
        return fs.readdirSync(dir).length > 0;
    } catch {
        return false;
    }
}

function* walk(dir: string): Generator<string> {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__MACOSX' || entry.name.startsWith('._')) {
            continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* walk(full);
        } else if (entry.isFile()) {
            yield full;
        }
    }
}

function extract(archive: string, outDir: string): void {
    ensureDir(outDir);
    console.log(`Extracting ${path.relative(process.cwd(), archive)} -> ${path.relative(process.cwd(), outDir)}`);
    try {
        execFileSync(path7z, ['x', archive, `-o${outDir}`, '-y', '-xr!__MACOSX', '-xr!._*'], {
            stdio: ['ignore', 'ignore', 'inherit'],
        });
    } catch {
        throw new Error(`Failed to extract ${archive} (7-Zip exited non-zero)`);
    }
}

function listSdkDirs(): string[] {
    if (!fs.existsSync(SDK_ROOT)) {
        return [];
    }
    return fs
        .readdirSync(SDK_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => path.join(SDK_ROOT, d.name));
}

function listSdkZips(): string[] {
    if (!fs.existsSync(SDK_ROOT)) {
        return [];
    }
    return fs
        .readdirSync(SDK_ROOT, { withFileTypes: true })
        .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.zip') && !d.name.toLowerCase().endsWith('.dmg.zip'))
        .map((d) => path.join(SDK_ROOT, d.name))
        .sort();
}

/** Extracts each SDK ZIP into vendor/sdk/<zip basename>, skipping already-extracted archives unless forced. */
function extractSdkZips(zipPaths: string[], force: boolean): void {
    for (const zipPath of zipPaths) {
        const destDir = path.join(SDK_ROOT, path.basename(zipPath, path.extname(zipPath)));
        if (!force && dirHasFiles(destDir)) {
            console.log(`Skipping ${path.basename(zipPath)}; already extracted. Use --force to re-extract.`);
            continue;
        }
        extract(zipPath, destDir);
    }
}

/** Expands nested *.dmg.zip archives and the resulting *.dmg disk images (macOS SDK layout). */
function expandDmgFiles(): void {
    for (const pass of ['.dmg.zip', '.dmg']) {
        for (const dir of listSdkDirs()) {
            for (const file of [...walk(dir)]) {
                if (file.toLowerCase().endsWith(pass)) {
                    extract(file, path.dirname(file));
                }
            }
        }
    }
}

function windowsArchDir(): string {
    switch (process.arch) {
        case 'x64':
            return 'EDSDK_64';
        case 'ia32':
        case 'x32':
            return 'EDSDK';
        default:
            console.warn(`Unrecognized Windows architecture ${process.arch}, defaulting to EDSDK_64.`);
            return 'EDSDK_64';
    }
}

function linuxArchDir(): string {
    switch (process.arch) {
        case 'x64':
            return 'x86_64';
        case 'arm64':
            return 'ARM64';
        case 'arm':
            return 'ARM32';
        default:
            console.warn(`Unrecognized Linux architecture ${process.arch}, defaulting to x86_64.`);
            return 'x86_64';
    }
}

/** Candidates for every platform; entries missing from the extracted SDKs are skipped with a warning. */
function getCandidates(): { name: string; source: string }[] {
    const winArch = windowsArchDir();
    const linuxArch = linuxArchDir();
    return [
        { name: 'EDSDK.dll', source: `${winArch}/Dll/EDSDK.dll` },
        { name: 'EdsImage.dll', source: `${winArch}/Dll/EdsImage.dll` },
        { name: 'libEDSDK.so', source: `EDSDK/Library/${linuxArch}/libEDSDK.so` },
        { name: 'libEdsImage.so', source: `EDSDK/Library/${linuxArch}/libEdsImage.so` },
        { name: 'EDSDK', source: 'EDSDK.framework/Versions/A/EDSDK' },
        { name: 'EDSDK', source: 'EDSDK.framework/EDSDK' },
        { name: 'EDSDK', source: 'libEDSDK.dylib' },
        { name: 'EdsImage', source: 'EdsImage.bundle/Contents/MacOS/EdsImage' },
        { name: 'EdsImage', source: 'EdsImage.framework/EdsImage' },
        { name: 'EdsImage', source: 'libEdsImage.dylib' },
    ];
}

function matchesSuffix(filePath: string, candidate: string): boolean {
    const suffix = candidate.split('/').join(path.sep);
    return filePath === suffix || filePath.endsWith(path.sep + suffix);
}

function findFirstExisting(candidates: string[]): string | null {
    for (const candidate of candidates) {
        for (const dir of listSdkDirs()) {
            const full = path.join(dir, candidate);
            try {
                if (fs.existsSync(full) && fs.statSync(full).isFile()) {
                    return full;
                }
            } catch {
                // ignore
            }
        }
    }
    for (const candidate of candidates) {
        for (const dir of listSdkDirs()) {
            for (const file of walk(dir)) {
                if (matchesSuffix(file, candidate)) {
                    return file;
                }
            }
        }
    }
    return null;
}

function copyLibrary(name: string, source: string | null): void {
    if (!source) {
        console.warn(`Could not find source for ${name}.`);
        return;
    }

    const dest = path.join(BIN_ROOT, name);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(source, dest, fs.constants.COPYFILE_FICLONE);
    fs.chmodSync(dest, 0o755);
    console.log(`Copied ${path.relative(process.cwd(), source)} -> ${path.relative(process.cwd(), dest)}`);
}

function main(): void {
    const args = process.argv.slice(2);
    const force = args.includes('--force') || args.includes('-f');
    const zipArg = args.find((a) => !a.startsWith('-'));

    const zips: string[] = [];
    if (zipArg) {
        const resolved = path.resolve(zipArg);
        if (!fs.existsSync(resolved) || !resolved.toLowerCase().endsWith('.zip')) {
            console.error(`Not a ZIP file: ${zipArg}`);
            process.exit(1);
        }
        zips.push(resolved);
    } else {
        zips.push(...listSdkZips());
    }

    extractSdkZips(zips, force);
    expandDmgFiles();

    if (!fs.existsSync(SDK_ROOT)) {
        console.error(`No vendor/sdk directory found. Place Canon SDK ZIPs in ${SDK_ROOT} or pass a ZIP path to extract.`);
        process.exit(1);
    }

    const seen = new Set<string>();
    for (const { name, source } of getCandidates()) {
        if (seen.has(name)) {
            continue;
        }
        seen.add(name);
        copyLibrary(name, findFirstExisting([source]));
    }
}

main();
