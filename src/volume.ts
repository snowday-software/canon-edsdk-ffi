import koffi from 'koffi';
import { edsdk, createOutputPointer, readOutputPointer, freeOutputPointer } from './ffi/functions.js';
import { ErrorCode, StorageType } from './ffi/constants.js';
import { EdsVolumeInfo } from './ffi/definitions.js';
import { throwIfError } from './api-error.js';
import { Directory, type DirectoryEntry } from './directory.js';

function readString(buf: Buffer): string {
    return buf.toString('utf-8').split('\0')[0] ?? '';
}

interface VolumeInfo {
    storageType: number;
    access: number;
    maxCapacity: number | bigint;
    freeSpaceInBytes: number | bigint;
    szVolumeLabel: Buffer;
}

function getVolumeInfo(ref: unknown): VolumeInfo {
    const ptr = koffi.alloc(EdsVolumeInfo, 1);
    try {
        throwIfError(edsdk.EdsGetVolumeInfo(ref, ptr));
        return koffi.decode(ptr, 'EdsVolumeInfo');
    } finally {
        koffi.free(ptr);
    }
}

/**
 * Represents a memory card volume in the camera.
 *
 * Cameras may have one or two memory cards. A `Volume` exposes the card label,
 * storage type, capacity, and the files/folders stored on it.
 */
export class Volume {
    [Symbol.toStringTag] = 'Volume';

    private ref_: unknown;
    private info_: VolumeInfo;

    static readonly StorageType: Record<'NoMemoryCard' | 'CompactFlash' | 'SDCard' | 'HardDrive' | 'CFast' | 'CFe', number> =
        {
            CFe: StorageType.CFe,
            CFast: StorageType.CFast,
            CompactFlash: StorageType.CF,
            HardDrive: StorageType.HD,
            NoMemoryCard: StorageType.Non,
            SDCard: StorageType.SD,
        };

    /** @param ref - An EDSDK volume reference. */
    constructor(ref: unknown) {
        this.ref_ = ref;
        edsdk.EdsRetain(this.ref_);
        this.info_ = getVolumeInfo(this.ref_);
    }

    /** Returns the underlying EDSDK volume reference. */
    getEdsReference(): unknown {
        return this.ref_;
    }

    /** Volume label, such as the memory card name. */
    get label(): string {
        return readString(this.info_.szVolumeLabel);
    }

    /** Storage type constant (CF, SD, HD, etc.). */
    get storageType(): number {
        return this.info_.storageType;
    }

    /** Whether files can be read from this volume. */
    get isReadable(): boolean {
        const access = this.info_.access;
        return access === 0 || access === 2;
    }

    /** Whether files can be written to this volume. */
    get isWritable(): boolean {
        const access = this.info_.access;
        return access === 1 || access === 2;
    }

    /** Free space on the volume in bytes. */
    get freeCapacity(): number | bigint {
        return this.info_.freeSpaceInBytes;
    }

    /** Total capacity of the volume in bytes. */
    get maximumCapacity(): number | bigint {
        return this.info_.maxCapacity;
    }

    /** Number of child entries (files and folders) on the volume. */
    get length(): number {
        const count: [number] = [0];
        throwIfError(edsdk.EdsGetChildCount(this.ref_, count));
        return count[0];
    }

    /** Formats the memory card (`EdsFormatVolume`). This erases all data. */
    format(): void {
        throwIfError(edsdk.EdsFormatVolume(this.ref_));
    }

    /** Refreshes the cached volume info from the camera. */
    refreshInfo(): void {
        this.info_ = getVolumeInfo(this.ref_);
    }

    /**
     * Returns the parent reference of this volume — the camera
     * (`EdsGetParent`). Compare with `camera.getEdsReference()`.
     */
    getParent(): unknown {
        const ptr = createOutputPointer();
        try {
            throwIfError(edsdk.EdsGetParent(this.ref_, ptr));
            return readOutputPointer(ptr);
        } finally {
            freeOutputPointer(ptr);
        }
    }

    /** Returns the files and folders stored on this volume. */
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

    /** Iterates over the entries on this volume. */
    *[Symbol.iterator](): Iterator<DirectoryEntry> {
        for (const entry of this.getEntries()) {
            yield entry;
        }
    }

    /** Returns a JSON-serializable summary of the volume. */
    toJSON() {
        return {
            label: this.label,
            storageType: this.storageType,
            isReadable: this.isReadable,
            isWritable: this.isWritable,
            freeCapacity: Number(this.freeCapacity),
            maximumCapacity: Number(this.maximumCapacity),
        };
    }

    [Symbol.for('nodejs.util.inspect.custom')](_depth: number, options: any) {
        return options.stylize('Volume', 'special') + ` <${options.stylize(this.label, 'string')}>`;
    }
}
