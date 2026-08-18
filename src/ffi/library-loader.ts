import * as fs from 'fs';
import * as path from 'path';
import koffi, { type LibraryHandle } from 'koffi';

function getProcessCwd(): string {
    return process.cwd();
}

function getPlatformAliases(): string[] {
    switch (process.platform) {
        case 'win32':
            return ['win32', 'windows'];
        case 'darwin':
            return ['darwin', 'mac'];
        case 'linux':
            return ['linux'];
        default:
            return [process.platform];
    }
}

function getVendorBinDirs(): string[] {
    const root = path.resolve(getProcessCwd(), 'vendor', 'bin');
    return getPlatformAliases().map((platform) => path.join(root, platform));
}

function getLibrarySearchPaths(fileNames: string[]): string[] {
    const paths: string[] = [];
    const explicit = process.env.EDSDK_PATH;
    if (explicit) {
        paths.push(path.resolve(explicit));
    }
    const cwd = getProcessCwd();
    for (const name of fileNames) {
        paths.push(path.join(cwd, name));
    }
    for (const binDir of getVendorBinDirs()) {
        for (const name of fileNames) {
            paths.push(path.join(binDir, name));
        }
    }
    return paths;
}

const EDSDK_FILE_NAMES = ['EDSDK.dll', 'libEDSDK.so', 'libEDSDK.dylib', 'EDSDK'];

/** Returns the ordered list of file paths searched for the EDSDK library. */
export function getSearchPaths(): string[] {
    return getLibrarySearchPaths(EDSDK_FILE_NAMES);
}

/** Finds the first existing EDSDK library file in the search paths. */
export function findLibraryPath(): string | null {
    for (const p of getSearchPaths()) {
        try {
            if (fs.existsSync(p) && fs.statSync(p).isFile()) {
                return p;
            }
        } catch {
            // ignore
        }
    }
    return null;
}

let edsdkLibrary: LibraryHandle | null = null;

/** Loads and returns the EDSDK library. Throws if the library cannot be found. */
export function loadEdsdkLibrary(): LibraryHandle {
    const p = findLibraryPath();
    if (!p) {
        throw new Error(
            `EDSDK library not found; set EDSDK_PATH or run npm run vendor:sync. Searched:\n${getSearchPaths().join('\n')}`,
        );
    }
    return koffi.load(p);
}

/** Returns the cached EDSDK library, loading it on first call. */
export function getEdsdkLibrary(): LibraryHandle {
    if (!edsdkLibrary) {
        edsdkLibrary = loadEdsdkLibrary();
    }
    return edsdkLibrary;
}

const EDS_IMAGE_FILE_NAMES = ['EdsImage.dll', 'libEdsImage.so', 'libEdsImage.dylib', 'EdsImage'];

function getEdsImageSearchPaths(): string[] {
    return getLibrarySearchPaths(EDS_IMAGE_FILE_NAMES);
}

function findEdsImagePath(): string | null {
    for (const p of getEdsImageSearchPaths()) {
        try {
            if (fs.existsSync(p) && fs.statSync(p).isFile()) {
                return p;
            }
        } catch {
            // ignore
        }
    }
    return null;
}

let edsImageLibrary: LibraryHandle | null = null;

/** Loads and returns the companion EdsImage library, if available. */
export function loadEdsImageLibrary(): LibraryHandle | null {
    const p = findEdsImagePath();
    if (!p) {
        return null;
    }
    return koffi.load(p);
}

/** Returns the cached EdsImage library, loading it on first call. */
export function getEdsImageLibrary(): LibraryHandle | null {
    if (!edsImageLibrary) {
        edsImageLibrary = loadEdsImageLibrary();
    }
    return edsImageLibrary;
}
