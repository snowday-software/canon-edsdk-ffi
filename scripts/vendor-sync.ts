import fs from 'node:fs';
import path from 'node:path';

const VENDOR_ROOT = path.resolve(process.cwd(), 'vendor');
const SDK_ROOT = path.join(VENDOR_ROOT, 'sdk');
const BIN_ROOT = path.join(VENDOR_ROOT, 'bin');

function ensureDir(dir: string): void {
    fs.mkdirSync(dir, { recursive: true });
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
    return null;
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

function getCandidates(): { name: string; source: string | null }[] {
    if (process.platform === 'win32') {
        const archDir = windowsArchDir();
        return [
            { name: 'EDSDK.dll', source: `${archDir}/Dll/EDSDK.dll` },
            { name: 'EdsImage.dll', source: `${archDir}/Dll/EdsImage.dll` },
        ];
    }

    if (process.platform === 'linux') {
        const archDir = linuxArchDir();
        return [
            { name: 'libEDSDK.so', source: `EDSDK/Library/${archDir}/libEDSDK.so` },
            { name: 'libEdsImage.so', source: `EDSDK/Library/${archDir}/libEdsImage.so` },
        ];
    }

    if (process.platform === 'darwin') {
        return [
            { name: 'EDSDK', source: 'EDSDK/EDSDK.framework/EDSDK' },
            { name: 'EDSDK', source: 'EDSDK.framework/EDSDK' },
            { name: 'EDSDK', source: 'EDSDK' },
            { name: 'EDSDK', source: 'libEDSDK.dylib' },
            { name: 'EdsImage', source: 'EdsImage/EdsImage.framework/EdsImage' },
            { name: 'EdsImage', source: 'EdsImage.framework/EdsImage' },
            { name: 'EdsImage', source: 'EdsImage' },
            { name: 'EdsImage', source: 'libEdsImage.dylib' },
        ];
    }

    console.error(`Unsupported platform: ${process.platform}`);
    return [];
}

function copyLibrary(name: string, source: string | null): void {
    if (!source) {
        console.warn(`Could not find source for ${name}.`);
        return;
    }

    const dest = path.join(BIN_ROOT, process.platform, name);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(source, dest, fs.constants.COPYFILE_FICLONE);
    fs.chmodSync(dest, 0o755);
    console.log(`Copied ${path.relative(process.cwd(), source)} -> ${path.relative(process.cwd(), dest)}`);
}

function main(): void {
    if (!fs.existsSync(SDK_ROOT)) {
        console.error(`No vendor/sdk directory found. Extract the Canon SDK downloads into ${SDK_ROOT}.`);
        process.exit(1);
    }

    const candidates = getCandidates();
    const seen = new Set<string>();
    for (const { name, source } of candidates) {
        if (seen.has(name)) {
            continue;
        }
        seen.add(name);
        const resolved = source ? findFirstExisting([source]) : null;
        copyLibrary(name, resolved);
    }
}

main();
