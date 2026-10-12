import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import koffi from 'koffi';
import { edsdk, createOutputPointer, readOutputPointer, freeOutputPointer } from './ffi/functions.js';
import { ErrorCode, FileCreateDisposition, Access, FileAttribute } from './ffi/constants.js';
import { EdsDirectoryItemInfo } from './ffi/definitions.js';
import { ApiError } from './api-error.js';
import { FileFormat } from './values/file-format.js';
import { Stream } from './stream.js';
import { Directory } from './directory.js';
import { Volume } from './volume.js';

function throwIfError(code: number): void {
    if (code !== ErrorCode.OK) {
        const apiError = new ApiError(code);
        const err = new Error(`EDSDK error: ${apiError.label}`) as any;
        err.EDS_ERROR = apiError;
        throw err;
    }
}

function readString(buf: Buffer): string {
    return buf.toString('utf-8').split('\0')[0] ?? '';
}

function getDirectoryItemInfo(ref: any) {
    const ptr = koffi.alloc(EdsDirectoryItemInfo, 1);
    try {
        throwIfError(edsdk.EdsGetDirectoryItemInfo(ref, ptr));
        return koffi.decode(ptr, 'EdsDirectoryItemInfo');
    } finally {
        koffi.free(ptr);
    }
}

function readStreamToBase64(streamRef: any): string {
    const lengthPtr = koffi.alloc('uint64_t', 1);
    try {
        throwIfError(edsdk.EdsGetLength(streamRef, lengthPtr));
        const n = Number(koffi.decode(lengthPtr, 'uint64_t'));
        if (n === 0) {
            return '';
        }
        const buffer = Buffer.alloc(n);
        const outReadPtr = koffi.alloc('uint64_t', 1);
        try {
            throwIfError(edsdk.EdsRead(streamRef, BigInt(n), buffer, outReadPtr));
            const read = Number(koffi.decode(outReadPtr, 'uint64_t'));
            if (read === 0) {
                return '';
            }
            return buffer.toString('base64', 0, read);
        } finally {
            koffi.free(outReadPtr);
        }
    } finally {
        koffi.free(lengthPtr);
    }
}

/**
 * Represents an image or audio file stored on the camera.
 *
 * `CameraFile` provides methods to download the file (or just its thumbnail)
 * to a local path or to a base64 string. It also exposes the file name, size,
 * and format information from the camera.
 */
export class CameraFile {
    [Symbol.toStringTag] = 'CameraFile';

    private ref_: any;
    private info_: any;
    private isDownloaded_ = false;
    private isCanceled_ = false;
    private localFile_ = '';

    static readonly Attribute = FileAttribute;

    /** @param ref - An EDSDK directory item reference for an image/audio file. */
    constructor(ref: any) {
        this.ref_ = ref;
        edsdk.EdsRetain(this.ref_);
        this.info_ = getDirectoryItemInfo(this.ref_);
    }

    /** Returns the underlying EDSDK directory item reference. */
    getEdsReference(): any {
        return this.ref_;
    }

    private dispose_() {
        if (this.ref_ === 0n || this.ref_ === undefined) {
            return;
        }
        if (!this.isDownloaded_ && !this.isCanceled_) {
            try {
                edsdk.EdsDownloadCancel(this.ref_);
            } catch {
                // ignore
            }
            this.isCanceled_ = true;
        }
        try {
            edsdk.EdsRelease(this.ref_);
        } catch {
            // ignore
        }
        this.ref_ = 0n;
    }

    /** The file name on the camera. */
    get name(): string {
        return readString(this.info_.szFileName);
    }

    /** Local file path after a successful download. */
    get localFile(): string {
        return this.localFile_;
    }

    /** Group ID for files that belong to the same shooting operation. */
    get groupID(): number {
        return this.info_.groupID;
    }

    /** File size in bytes. */
    get size(): number | bigint {
        return this.info_.size;
    }

    /** File format (e.g. CR2, JPG). */
    get format(): FileFormat {
        return new FileFormat(this.info_.format);
    }

    /** File attribute bitmask (see `CameraFile.Attribute`). */
    get attribute(): number {
        const out: [number] = [0];
        throwIfError(edsdk.EdsGetAttribute(this.ref_, out));
        return out[0];
    }

    /** Sets the file attribute bitmask on the camera (`EdsSetAttribute`). */
    set attribute(value: number) {
        throwIfError(edsdk.EdsSetAttribute(this.ref_, value));
    }

    /** Refreshes the cached directory-item info from the camera. */
    refreshInfo(): void {
        this.info_ = getDirectoryItemInfo(this.ref_);
    }

    /**
     * Writes metadata (e.g. GPS coordinates) into the image on the camera
     * (`EdsSetMetaImage`). Metadata is expressed as an array of
     * little-endian `uint32` values; see the EDSDK reference for layout.
     */
    setMetaImage(metaType: number, metaData: number[] | Uint32Array): void {
        const size = metaData.length * 4;
        const buf = Buffer.alloc(size);
        koffi.encode(buf, 'uint32_t', Array.from(metaData), metaData.length);
        throwIfError(edsdk.EdsSetMetaImage(this.ref_, metaType, size, buf));
    }

    /** Deletes the file from the camera (`EdsDeleteDirectoryItem`). */
    delete(): void {
        throwIfError(edsdk.EdsDeleteDirectoryItem(this.ref_));
    }

    /**
     * Returns the parent folder or volume of this file (`EdsGetParent`).
     *
     * Falls back to the raw EDSDK reference if it cannot be classified.
     */
    getParent(): Directory | Volume | any {
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

    /** Downloads the file contents into an existing `Stream`. */
    downloadToStream(stream: Stream): void {
        throwIfError(edsdk.EdsDownload(this.ref_, this.info_.size, stream.getEdsReference()));
        throwIfError(edsdk.EdsDownloadComplete(this.ref_));
        this.isDownloaded_ = true;
    }

    /** Downloads the file into memory and returns a `Buffer`. */
    downloadToBuffer(): Buffer {
        const stream = Stream.inMemory(0);
        try {
            this.downloadToStream(stream);
            return stream.readAll();
        } finally {
            stream.dispose();
            this.dispose_();
        }
    }

    /** Downloads the file to a directory, creating the directory if needed. */
    downloadToPath(dirPath: string): string {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        const filePath = path.join(dirPath, this.name);
        return this.downloadToFile(filePath);
    }

    /** Downloads the file to a specific local file path. */
    downloadToFile(filePath: string): string {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const streamPtr = createOutputPointer();
        try {
            throwIfError(
                edsdk.EdsCreateFileStream(filePath, FileCreateDisposition.CreateAlways, Access.ReadWrite, streamPtr),
            );
            const stream = readOutputPointer(streamPtr);
            throwIfError(edsdk.EdsDownload(this.ref_, this.info_.size, stream));
            throwIfError(edsdk.EdsDownloadComplete(this.ref_));
            this.isDownloaded_ = true;
            this.localFile_ = filePath;
            return filePath;
        } finally {
            const stream = readOutputPointer(streamPtr);
            freeOutputPointer(streamPtr);
            if (stream !== 0n && stream !== null) {
                try {
                    edsdk.EdsRelease(stream);
                } catch {
                    // ignore
                }
            }
            this.dispose_();
        }
    }

    /** Downloads the file into memory and returns it as a base64 string. */
    downloadToString(): string {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'canon-edsdk-'));
        try {
            const tmpPath = path.join(tmpDir, this.name);
            const downloaded = this.downloadToFile(tmpPath);
            const b64 = fs.readFileSync(downloaded).toString('base64');
            this.isDownloaded_ = true;
            return b64;
        } finally {
            try {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            } catch {
                // ignore
            }
        }
    }

    /** Downloads the thumbnail into memory and returns it as a base64 string. */
    downloadThumbnailToString(): string {
        const streamPtr = createOutputPointer();
        try {
            throwIfError(edsdk.EdsCreateMemoryStream(0, streamPtr));
            const stream = readOutputPointer(streamPtr);
            throwIfError(edsdk.EdsDownloadThumbnail(this.ref_, stream));
            throwIfError(edsdk.EdsDownloadComplete(this.ref_));
            const b64 = readStreamToBase64(stream);
            this.isDownloaded_ = true;
            return b64;
        } finally {
            const stream = readOutputPointer(streamPtr);
            freeOutputPointer(streamPtr);
            if (stream !== 0n && stream !== null) {
                try {
                    edsdk.EdsRelease(stream);
                } catch {
                    // ignore
                }
            }
            this.dispose_();
        }
    }

    /** Returns a JSON-serializable summary of the file. */
    toJSON() {
        return {
            name: this.name,
            localFile: this.localFile,
            groupID: this.groupID,
            size: Number(this.size),
            format: this.format,
        };
    }

    [Symbol.for('nodejs.util.inspect.custom')](_depth: number, options: any) {
        return options.stylize('CameraFile', 'special') + ` <${options.stylize(this.name, 'string')}>`;
    }
}
