import koffi from 'koffi';
import { edsdk, createOutputPointer, readOutputPointer, freeOutputPointer, EdsProgressCallback } from './ffi/functions.js';
import { ErrorCode, FileCreateDisposition, Access, SeekOrigin, ProgressOption } from './ffi/constants.js';
import {
    EdsIStream,
    EdsReadStream,
    EdsWriteStream,
    EdsSeekStream,
    EdsTellStream,
    EdsGetStreamLength,
} from './ffi/definitions.js';
import { throwIfError } from './api-error.js';

function allocUInt64Out(): any {
    return koffi.alloc('uint64_t', 1);
}

function decodeUInt64(ptr: unknown): number {
    return Number(koffi.decode(ptr as any, 'uint64_t'));
}

/** Handlers backing a user-implemented stream passed to `Stream.fromHandlers`. */
export interface StreamHandlers {
    /** Read up to `size` bytes; must return the bytes actually read. */
    read(size: number): Uint8Array;
    /** Write the given bytes; must return the number of bytes written. */
    write(data: Uint8Array): number;
    /** Move the stream position by `offset` relative to a `SeekOrigin`. */
    seek(offset: number, origin: number): void;
    /** Current stream position. */
    tell(): number;
    /** Total stream length. */
    getLength(): number;
}

export type ProgressCallback = (percent: number) => boolean | void;

/**
 * Wraps an EDSDK stream (`EdsStreamRef`).
 *
 * Streams back file downloads, live view frames, image extraction, and
 * camera-settings transfers. Use the static factories to create file or
 * memory streams; pass a `Stream` to download/extraction APIs.
 */
export class Stream {
    [Symbol.toStringTag] = 'Stream';

    private ref_: unknown;
    private owned_: boolean;
    private progressCallback_?: bigint;
    private streamCallbacks_: bigint[] = [];

    static readonly CreateDisposition = FileCreateDisposition;
    static readonly Access = Access;
    static readonly SeekOrigin = SeekOrigin;
    static readonly ProgressOption = ProgressOption;

    /** @param ref - An EDSDK stream reference. */
    constructor(ref: unknown, owned = true) {
        this.ref_ = ref;
        this.owned_ = owned;
        if (owned) {
            edsdk.EdsRetain(this.ref_);
        }
    }

    /** Returns the underlying EDSDK stream reference. */
    getEdsReference(): unknown {
        return this.ref_;
    }

    /** Takes ownership of a freshly created stream reference without an extra `EdsRetain`. */
    private static adopt_(ref: unknown): Stream {
        const stream = new Stream(ref, false);
        stream.owned_ = true;
        return stream;
    }

    /** Creates a stream bound to a local file path (`EdsCreateFileStream`). */
    static openFile(
        filename: string,
        createDisposition: number = FileCreateDisposition.CreateAlways,
        access: number = Access.ReadWrite,
    ): Stream {
        const ptr = createOutputPointer();
        try {
            throwIfError(edsdk.EdsCreateFileStream(filename, createDisposition, access, ptr));
            return Stream.adopt_(readOutputPointer(ptr));
        } finally {
            freeOutputPointer(ptr);
        }
    }

    /**
     * Creates a stream bound to a local file path using `EdsCreateFileStreamEx`.
     *
     * On Windows the filename is passed as UTF-16; on macOS as a `CFURLRef`
     * (not supported — use {@link Stream.openFile}); on Linux it is identical
     * to `openFile`.
     */
    static openFileEx(
        filename: string,
        createDisposition: number = FileCreateDisposition.CreateAlways,
        access: number = Access.ReadWrite,
    ): Stream {
        if (process.platform === 'darwin') {
            throw new Error('EdsCreateFileStreamEx requires a CFURLRef on macOS; use Stream.openFile instead.');
        }
        const ptr = createOutputPointer();
        try {
            throwIfError(edsdk.EdsCreateFileStreamEx(filename, createDisposition, access, ptr));
            return Stream.adopt_(readOutputPointer(ptr));
        } finally {
            freeOutputPointer(ptr);
        }
    }

    /** Creates a growable in-memory stream (`EdsCreateMemoryStream`). */
    static inMemory(size: number | bigint = 0): Stream {
        const ptr = createOutputPointer();
        try {
            throwIfError(edsdk.EdsCreateMemoryStream(size, ptr));
            return Stream.adopt_(readOutputPointer(ptr));
        } finally {
            freeOutputPointer(ptr);
        }
    }

    /** Creates a memory stream backed by an existing buffer. */
    static fromBuffer(buffer: Buffer | Uint8Array): Stream {
        const ptr = createOutputPointer();
        try {
            throwIfError(edsdk.EdsCreateMemoryStreamFromPointer(buffer, buffer.byteLength, ptr));
            return Stream.adopt_(readOutputPointer(ptr));
        } finally {
            freeOutputPointer(ptr);
        }
    }

    /**
     * Creates a stream backed by user-provided handlers (`EdsCreateStream`).
     *
     * The handlers are registered as native callbacks and stay alive until
     * {@link Stream.dispose} is called. This API is not documented in the
     * EDSDK API reference but is declared in the headers.
     */
    static fromHandlers(handlers: StreamHandlers, context: unknown = 0n): Stream {
        const stream = new Stream(0n, false);
        const registered: bigint[] = [];
        const register = (fn: (...args: any[]) => any, proto: any): any =>
            koffi.register((...args: any[]) => {
                try {
                    return fn(...args);
                } catch {
                    return ErrorCode.INTERNAL_ERROR;
                }
            }, koffi.pointer(proto));

        const istream = {
            context,
            read: register((_ctx: any, size: number, outBuffer: any, outReadSize: any) => {
                const data = handlers.read(size);
                if (data.byteLength > 0) {
                    koffi.encode(outBuffer, 'uint8_t', data, data.byteLength);
                }
                koffi.encode(outReadSize, 'uint32_t', data.byteLength);
                return ErrorCode.OK;
            }, EdsReadStream),
            write: register((_ctx: any, size: number, inBuffer: any, outWrittenSize: any) => {
                const data = koffi.decode(inBuffer, 'uint8_t', size) as Uint8Array;
                const written = handlers.write(data);
                koffi.encode(outWrittenSize, 'uint32_t', written);
                return ErrorCode.OK;
            }, EdsWriteStream),
            seek: register((_ctx: any, offset: number, origin: number) => {
                handlers.seek(offset, origin);
                return ErrorCode.OK;
            }, EdsSeekStream),
            tell: register((_ctx: any, outPosition: any) => {
                koffi.encode(outPosition, 'int32_t', handlers.tell());
                return ErrorCode.OK;
            }, EdsTellStream),
            getLength: register((_ctx: any, outLength: any) => {
                koffi.encode(outLength, 'uint32_t', handlers.getLength());
                return ErrorCode.OK;
            }, EdsGetStreamLength),
        };
        // koffi.register returns the callback token; keep it for unregister()
        for (const key of ['read', 'write', 'seek', 'tell', 'getLength'] as const) {
            registered.push((istream as any)[key]);
        }

        const istreamBuf = Buffer.alloc(koffi.sizeof(EdsIStream));
        koffi.encode(istreamBuf, 'EdsIStream', istream);

        const ptr = createOutputPointer();
        try {
            const status = edsdk.EdsCreateStream(istreamBuf, ptr);
            if (status !== ErrorCode.OK) {
                for (const cb of registered) {
                    koffi.unregister(cb);
                }
                throwIfError(status);
            }
            stream.ref_ = readOutputPointer(ptr);
            stream.streamCallbacks_ = registered;
            stream.owned_ = true;
            return stream;
        } finally {
            freeOutputPointer(ptr);
        }
    }

    /** Number of bytes in the stream. */
    get length(): number {
        const ptr = allocUInt64Out();
        try {
            throwIfError(edsdk.EdsGetLength(this.ref_, ptr));
            return decodeUInt64(ptr);
        } finally {
            koffi.free(ptr);
        }
    }

    /** Current read/write position in the stream. */
    get position(): number {
        const ptr = allocUInt64Out();
        try {
            throwIfError(edsdk.EdsGetPosition(this.ref_, ptr));
            return decodeUInt64(ptr);
        } finally {
            koffi.free(ptr);
        }
    }

    /**
     * Moves the stream position.
     *
     * @param offset - Byte offset relative to `origin`.
     * @param origin - A `Stream.SeekOrigin` value (Cur, Begin, End).
     */
    seek(offset: number | bigint, origin: number = SeekOrigin.Cur): void {
        throwIfError(edsdk.EdsSeek(this.ref_, offset, origin));
    }

    /** Reads up to `size` bytes from the stream at the current position. */
    read(size: number | bigint): Buffer {
        const buffer = Buffer.alloc(Number(size));
        const outRead = allocUInt64Out();
        try {
            throwIfError(edsdk.EdsRead(this.ref_, size, buffer, outRead));
            const n = decodeUInt64(outRead);
            return buffer.subarray(0, n);
        } finally {
            koffi.free(outRead);
        }
    }

    /** Writes `data` to the stream and returns the number of bytes written. */
    write(data: Buffer | Uint8Array): number {
        const outWritten = allocUInt64Out();
        try {
            throwIfError(edsdk.EdsWrite(this.ref_, data.byteLength, data, outWritten));
            return decodeUInt64(outWritten);
        } finally {
            koffi.free(outWritten);
        }
    }

    /** Copies `size` bytes from this stream into `destination`. */
    copyTo(destination: Stream, size: number | bigint): void {
        throwIfError(edsdk.EdsCopyData(this.ref_, size, destination.ref_));
    }

    /** Reads the entire stream contents into a `Buffer`. */
    readAll(): Buffer {
        this.seek(0, SeekOrigin.Begin);
        const size = this.length;
        if (size === 0) {
            return Buffer.alloc(0);
        }
        return this.read(size);
    }

    /**
     * Registers a progress callback (`EdsSetProgressCallback`).
     *
     * @param callback - Receives the percent-complete value; return `true`
     *   (or `false`) to cancel the transfer, or nothing to continue.
     * @param option - A `Stream.ProgressOption` value controlling when the
     *   callback fires.
     */
    setProgressCallback(callback: ProgressCallback, option: number = ProgressOption.Periodically): void {
        if (this.progressCallback_ !== undefined) {
            koffi.unregister(this.progressCallback_);
            this.progressCallback_ = undefined;
        }
        const cb = koffi.register((percent: number, _context: any, outCancel: any) => {
            try {
                const cancel = callback(percent);
                koffi.encode(outCancel, 'int32_t', cancel ? 1 : 0);
            } catch {
                koffi.encode(outCancel, 'int32_t', 0);
            }
            return ErrorCode.OK;
        }, koffi.pointer(EdsProgressCallback));
        try {
            throwIfError(edsdk.EdsSetProgressCallback(this.ref_, cb, option, 0n));
            this.progressCallback_ = cb;
        } catch (err) {
            koffi.unregister(cb);
            throw err;
        }
    }

    /** Clears a previously registered progress callback. */
    clearProgressCallback(): void {
        try {
            edsdk.EdsSetProgressCallback(this.ref_, 0n, ProgressOption.NoReport, 0n);
        } catch {
            // ignore
        }
        if (this.progressCallback_ !== undefined) {
            koffi.unregister(this.progressCallback_);
            this.progressCallback_ = undefined;
        }
    }

    /** Releases the underlying stream reference and callbacks. */
    dispose(): void {
        this.clearProgressCallback();
        for (const cb of this.streamCallbacks_) {
            try {
                koffi.unregister(cb);
            } catch {
                // ignore
            }
        }
        this.streamCallbacks_ = [];
        if (this.owned_ && this.ref_ !== 0n && this.ref_ !== undefined) {
            try {
                edsdk.EdsRelease(this.ref_);
            } catch {
                // ignore
            }
        }
        this.ref_ = 0n;
    }

    [Symbol.for('nodejs.util.inspect.custom')](_depth: number, options: any) {
        return options.stylize('Stream', 'special');
    }
}
