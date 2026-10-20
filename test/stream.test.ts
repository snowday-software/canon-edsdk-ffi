import { describe, it, expect, vi, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import koffi from 'koffi';
import { edsdk } from '../src/ffi/functions.js';
import { Stream } from '../src/stream.js';

function lifecycleSpies() {
    return {
        retain: vi.spyOn(edsdk, 'EdsRetain').mockReturnValue(0),
        release: vi.spyOn(edsdk, 'EdsRelease').mockReturnValue(0),
        progress: vi.spyOn(edsdk, 'EdsSetProgressCallback').mockReturnValue(0),
    };
}

function mockCreate(name: keyof typeof edsdk, fakeRef: unknown): MockInstance {
    return vi.spyOn(edsdk, name as any).mockImplementation((...args: any[]) => {
        koffi.encode(args[args.length - 1], 'void *', fakeRef);
        return 0;
    });
}

function expectOwnedStream(stream: Stream, retain: MockInstance, release: MockInstance): void {
    expect(retain).not.toHaveBeenCalled();
    stream.dispose();
    expect(release).toHaveBeenCalledTimes(1);
    stream.dispose();
    expect(release).toHaveBeenCalledTimes(1);
    expect(stream.getEdsReference()).toBe(0n);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Stream factories', () => {
    it('inMemory adopts the created stream', () => {
        const fakeRef = koffi.alloc('uint8_t', 1);
        try {
            const { retain, release } = lifecycleSpies();
            mockCreate('EdsCreateMemoryStream', fakeRef);
            expectOwnedStream(Stream.inMemory(0), retain, release);
        } finally {
            koffi.free(fakeRef);
        }
    });

    it('fromBuffer adopts the created stream', () => {
        const fakeRef = koffi.alloc('uint8_t', 1);
        try {
            const { retain, release } = lifecycleSpies();
            mockCreate('EdsCreateMemoryStreamFromPointer', fakeRef);
            expectOwnedStream(Stream.fromBuffer(Buffer.alloc(4)), retain, release);
        } finally {
            koffi.free(fakeRef);
        }
    });

    it('openFile adopts the created stream', () => {
        const fakeRef = koffi.alloc('uint8_t', 1);
        try {
            const { retain, release } = lifecycleSpies();
            mockCreate('EdsCreateFileStream', fakeRef);
            expectOwnedStream(Stream.openFile('/tmp/x'), retain, release);
        } finally {
            koffi.free(fakeRef);
        }
    });

    it.skipIf(process.platform === 'darwin')('openFileEx adopts the created stream', () => {
        const fakeRef = koffi.alloc('uint8_t', 1);
        try {
            const { retain, release } = lifecycleSpies();
            mockCreate('EdsCreateFileStreamEx', fakeRef);
            expectOwnedStream(Stream.openFileEx('/tmp/x'), retain, release);
        } finally {
            koffi.free(fakeRef);
        }
    });
});

describe('Stream constructor', () => {
    it('retains an owned ref and releases it on dispose', () => {
        const fakeRef = koffi.alloc('uint8_t', 1);
        try {
            const { retain, release } = lifecycleSpies();
            const stream = new Stream(fakeRef);
            expect(retain).toHaveBeenCalledTimes(1);
            stream.dispose();
            expect(release).toHaveBeenCalledTimes(1);
            stream.dispose();
            expect(release).toHaveBeenCalledTimes(1);
            expect(stream.getEdsReference()).toBe(0n);
        } finally {
            koffi.free(fakeRef);
        }
    });

    it('never releases a borrowed ref', () => {
        const fakeRef = koffi.alloc('uint8_t', 1);
        try {
            const { retain, release } = lifecycleSpies();
            const stream = new Stream(fakeRef, false);
            expect(retain).not.toHaveBeenCalled();
            stream.dispose();
            expect(release).not.toHaveBeenCalled();
            expect(stream.getEdsReference()).toBe(0n);
        } finally {
            koffi.free(fakeRef);
        }
    });
});
