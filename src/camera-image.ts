import koffi from 'koffi';
import { edsdk, createOutputPointer, readOutputPointer, freeOutputPointer } from './ffi/functions.js';
import {
    ErrorCode,
    FileCreateDisposition,
    Access,
    ImageSource,
    TargetImageType,
    ImageType,
    CompressQuality,
    ObjectFormat,
} from './ffi/constants.js';
import { EdsImageInfo } from './ffi/definitions.js';
import { throwIfError, throwError } from './api-error.js';
import { CameraProperty, type ICamera, type PropertyName } from './property.js';
import { Stream } from './stream.js';

export interface ImageInfo {
    width: number;
    height: number;
    numOfComponents: number;
    componentDepth: number;
    effectiveRect: { left: number; top: number; width: number; height: number };
}

/**
 * Represents a camera image opened for reading/processing (`EdsImageRef`).
 *
 * An image can be created from a downloaded file, a memory stream, or a
 * camera file stream. It supports image info queries, source-region
 * extraction into a target format, and property access (EXIF-like metadata).
 */
export class CameraImage implements ICamera {
    [Symbol.toStringTag] = 'CameraImage';

    private ref_: unknown;
    private stream_?: Stream;
    private ownsStream_ = false;

    static readonly ImageSource = ImageSource;
    static readonly ImageType = ImageType;
    static readonly TargetImageType = TargetImageType;
    static readonly CompressQuality = CompressQuality;
    static readonly ObjectFormat = ObjectFormat;

    /** @param ref - An EDSDK image reference (`EdsImageRef`). */
    constructor(ref: unknown) {
        this.ref_ = ref;
        edsdk.EdsRetain(this.ref_);
    }

    /** Creates an image from a local image file path. */
    static fromFile(filename: string): CameraImage {
        const stream = Stream.openFile(filename, FileCreateDisposition.OpenExisting, Access.Read);
        try {
            const image = CameraImage.fromStream(stream);
            image.stream_ = stream;
            image.ownsStream_ = true;
            return image;
        } catch (err) {
            stream.dispose();
            throw err;
        }
    }

    /** Creates an image from an existing stream (`EdsCreateImageRef`). */
    static fromStream(stream: Stream): CameraImage {
        const ptr = createOutputPointer();
        try {
            throwIfError(edsdk.EdsCreateImageRef(stream.getEdsReference(), ptr));
            return new CameraImage(readOutputPointer(ptr));
        } finally {
            freeOutputPointer(ptr);
        }
    }

    /** Creates an image from an in-memory buffer (e.g. a downloaded file). */
    static fromBuffer(buffer: Buffer | Uint8Array): CameraImage {
        const stream = Stream.fromBuffer(buffer);
        try {
            const image = CameraImage.fromStream(stream);
            image.stream_ = stream;
            image.ownsStream_ = true;
            return image;
        } catch (err) {
            stream.dispose();
            throw err;
        }
    }

    /** Returns the underlying EDSDK image reference. */
    getEdsReference(): unknown {
        return this.ref_;
    }

    /** Queries image information for a given source (`EdsGetImageInfo`). */
    getImageInfo(source: number = ImageSource.FullView): ImageInfo {
        const ptr = koffi.alloc(EdsImageInfo, 1);
        try {
            throwIfError(edsdk.EdsGetImageInfo(this.ref_, source, ptr));
            const info = koffi.decode(ptr, 'EdsImageInfo');
            return {
                width: info.width,
                height: info.height,
                numOfComponents: info.numOfComponents,
                componentDepth: info.componentDepth,
                effectiveRect: {
                    left: info.effectiveRect.point.x,
                    top: info.effectiveRect.point.y,
                    width: info.effectiveRect.size.width,
                    height: info.effectiveRect.size.height,
                },
            };
        } finally {
            koffi.free(ptr);
        }
    }

    /**
     * Extracts image data in a target format into a stream (`EdsGetImage`).
     *
     * @param source - `ImageSource` value (Thumbnail, FullView, ...).
     * @param imageType - `TargetImageType` value (Jpeg, TIFF, RGB, ...).
     * @param srcRect - Source crop rectangle (native `EdsRect` layout).
     * @param dstSize - Output size (native `EdsSize` layout).
     * @param outStream - Destination stream; defaults to a memory stream.
     */
    getImage(
        source: number,
        imageType: number,
        srcRect: { point: { x: number; y: number }; size: { width: number; height: number } },
        dstSize: { width: number; height: number },
        outStream?: Stream,
    ): Stream {
        const stream = outStream ?? Stream.inMemory(0);
        const rect = {
            point: { x: srcRect.point.x, y: srcRect.point.y },
            size: { width: srcRect.size.width, height: srcRect.size.height },
        };
        try {
            throwIfError(edsdk.EdsGetImage(this.ref_, source, imageType, rect, dstSize, stream.getEdsReference()));
        } catch (err) {
            if (!outStream) {
                stream.dispose();
            }
            throw err;
        }
        return stream;
    }

    /**
     * Extracts the full image (or thumbnail) into a `Buffer`.
     *
     * For `TargetImageType.Jpeg`/`TIFF` the buffer is a complete image file;
     * for `RGB`/`RGB16`/`DIB` it is raw pixel data.
     */
    toBuffer(source: number = ImageSource.FullView, imageType: number = TargetImageType.Jpeg): Buffer {
        const info = this.getImageInfo(source);
        const stream = this.getImage(
            source,
            imageType,
            {
                point: { x: info.effectiveRect.left, y: info.effectiveRect.top },
                size: { width: info.width, height: info.height },
            },
            { width: info.width, height: info.height },
        );
        try {
            return stream.readAll();
        } finally {
            stream.dispose();
        }
    }

    /** Creates an accessor for an image property (EXIF/metadata values). */
    getProperty(propertyID: PropertyName | number, specifier = 0): CameraProperty {
        const id = CameraProperty.getIDFor(propertyID);
        if (id === undefined) {
            throwError(ErrorCode.INVALID_PARAMETER);
        }
        return new CameraProperty(this, id, specifier);
    }

    /** Releases the image reference (and owned source stream). */
    dispose(): void {
        if (this.ref_ !== 0n && this.ref_ !== undefined) {
            try {
                edsdk.EdsRelease(this.ref_);
            } catch {
                // ignore
            }
            this.ref_ = 0n;
        }
        if (this.ownsStream_ && this.stream_) {
            this.stream_.dispose();
            this.stream_ = undefined;
        }
    }

    [Symbol.for('nodejs.util.inspect.custom')](_depth: number, options: any) {
        return options.stylize('CameraImage', 'special');
    }
}
