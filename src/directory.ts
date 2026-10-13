import koffi from 'koffi';
import { edsdk, createOutputPointer, readOutputPointer, freeOutputPointer } from './ffi/functions.js';
import { ErrorCode } from './ffi/constants.js';
import { EdsDirectoryItemInfo } from './ffi/definitions.js';
import { throwIfError } from './api-error.js';
import { CameraFile } from './camera-file.js';
import { Volume } from './volume.js';

export type DirectoryEntry = Directory | CameraFile;

function readString(buf: Buffer): string {
    return buf.toString('utf-8').split('\0')[0] ?? '';
}

interface DirectoryItemInfo {
    size: number | bigint;
    isFolder: number;
    groupID: number;
    option: number;
    szFileName: Buffer;
    format: number;
    dateTime: number;
}

function getDirectoryItemInfo(ref: unknown): DirectoryItemInfo {
    const ptr = koffi.alloc(EdsDirectoryItemInfo, 1);
    try {
        throwIfError(edsdk.EdsGetDirectoryItemInfo(ref, ptr));
        return koffi.decode(ptr, 'EdsDirectoryItemInfo');
    } finally {
        koffi.free(ptr);
    }
}

/**
 * Represents a folder on a camera volume.
 *
 * `Directory` exposes the folder name and provides access to its child files
 * and sub-folders.
 */
export class Directory {
    [Symbol.toStringTag] = 'Directory';

    private ref_: unknown;
    private info_: DirectoryItemInfo;

    /** @param ref - An EDSDK directory item reference for a folder. */
    constructor(ref: unknown) {
        this.ref_ = ref;
        edsdk.EdsRetain(this.ref_);
        this.info_ = getDirectoryItemInfo(this.ref_);
        if (!this.info_.isFolder) {
            edsdk.EdsRelease(this.ref_);
            throw new Error('Reference is not a directory.');
        }
    }

    /** Returns the underlying EDSDK directory item reference. */
    getEdsReference(): unknown {
        return this.ref_;
    }

    /** File attribute bitmask (see `FileAttribute` in `edsdkConstants`). */
    get attribute(): number {
        const out: [number] = [0];
        throwIfError(edsdk.EdsGetAttribute(this.ref_, out));
        return out[0];
    }

    /** Sets the file attribute bitmask on the camera (`EdsSetAttribute`). */
    set attribute(value: number) {
        throwIfError(edsdk.EdsSetAttribute(this.ref_, value));
    }

    /** Deletes this folder from the camera (`EdsDeleteDirectoryItem`). */
    delete(): void {
        throwIfError(edsdk.EdsDeleteDirectoryItem(this.ref_));
    }

    /**
     * Returns the parent folder or volume of this directory (`EdsGetParent`).
     */
    getParent(): Directory | Volume | unknown {
        const ptr = createOutputPointer();
        try {
            throwIfError(edsdk.EdsGetParent(this.ref_, ptr));
            const parent = readOutputPointer(ptr);
            try {
                return new Directory(parent);
            } catch {
                try {
                    return new Volume(parent);
                } catch {
                    return parent;
                }
            }
        } finally {
            freeOutputPointer(ptr);
        }
    }

    /** Refreshes the cached directory-item info from the camera. */
    refreshInfo(): void {
        this.info_ = getDirectoryItemInfo(this.ref_);
    }

    /** Creates a `Directory` or `CameraFile` from a child reference. */
    static wrapChild(ref: unknown): DirectoryEntry {
        let info: DirectoryItemInfo;
        try {
            info = getDirectoryItemInfo(ref);
        } catch {
            edsdk.EdsRelease(ref);
            throw new Error('Failed to get child item info');
        }
        if (info.isFolder) {
            try {
                return new Directory(ref);
            } catch {
                edsdk.EdsRelease(ref);
                throw new Error('Failed to create Directory');
            }
        }
        return new CameraFile(ref);
    }

    /** The folder name on the camera. */
    get name(): string {
        return readString(this.info_.szFileName);
    }

    /** Number of child entries in this folder. */
    get length(): number {
        const count: [number] = [0];
        throwIfError(edsdk.EdsGetChildCount(this.ref_, count));
        return count[0];
    }

    /** Returns the child files and folders in this directory. */
    getEntries(): DirectoryEntry[] {
        const count: [number] = [0];
        throwIfError(edsdk.EdsGetChildCount(this.ref_, count));
        const entries: DirectoryEntry[] = [];
        for (let i = 0; i < count[0]; i++) {
            const refPtr = createOutputPointer();
            if (edsdk.EdsGetChildAtIndex(this.ref_, i, refPtr) !== ErrorCode.OK) {
                freeOutputPointer(refPtr);
                continue;
            }
            const ref = readOutputPointer(refPtr);
            freeOutputPointer(refPtr);
            try {
                entries.push(Directory.wrapChild(ref));
            } catch {
                // ignore items that cannot be wrapped
            } finally {
                try {
                    edsdk.EdsRelease(ref);
                } catch {
                    // ignore
                }
            }
        }
        return entries;
    }

    /** Iterates over the child entries in this folder. */
    *[Symbol.iterator](): Iterator<DirectoryEntry> {
        for (const entry of this.getEntries()) {
            yield entry;
        }
    }

    /** Returns a JSON-serializable summary of the directory. */
    toJSON() {
        return {
            name: this.name,
            length: this.length,
        };
    }

    [Symbol.for('nodejs.util.inspect.custom')](_depth: number, options: any) {
        return options.stylize('Directory', 'special') + ` <${options.stylize(this.name, 'string')}>`;
    }
}
