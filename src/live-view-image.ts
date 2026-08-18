import koffi from 'koffi';
import { edsdk, createOutputPointer, readOutputPointer, freeOutputPointer } from './ffi/functions.js';
import { ErrorCode, PropertyID } from './ffi/constants.js';
import { EdsSize, EdsRect, EdsPoint } from './ffi/definitions.js';
import { ApiError } from './api-error.js';
import { Option } from './values/option.js';
import type { ICamera } from './property.js';

function throwIfError(code: number): void {
    if (code !== ErrorCode.OK) {
        const apiError = new ApiError(code);
        const err = new Error(`EDSDK error: ${apiError.label}`) as any;
        err.EDS_ERROR = apiError;
        throw err;
    }
}

/**
 * Represents a single live view (EVF) frame downloaded from the camera.
 *
 * Live view images are created on demand from a connected camera. In addition
 * to the JPEG image, they carry auxiliary data such as histograms, zoom, and
 * visible area.
 */
export class LiveViewImage {
    [Symbol.toStringTag] = 'LiveViewImage';

    private camera_: ICamera;
    private streamRef_: any;
    private evfImageRef_: any;
    private disposed_ = false;

    /** @param camera - A connected camera that has live view enabled. */
    constructor(camera: ICamera) {
        this.camera_ = camera;

        const streamPtr = createOutputPointer();
        throwIfError(edsdk.EdsCreateMemoryStream(0, streamPtr));
        this.streamRef_ = readOutputPointer(streamPtr);
        freeOutputPointer(streamPtr);

        const evfImagePtr = createOutputPointer();
        const createError = edsdk.EdsCreateEvfImageRef(this.streamRef_, evfImagePtr);
        if (createError !== ErrorCode.OK) {
            freeOutputPointer(evfImagePtr);
            edsdk.EdsRelease(this.streamRef_);
            throwIfError(createError);
        }
        this.evfImageRef_ = readOutputPointer(evfImagePtr);
        freeOutputPointer(evfImagePtr);

        const downloadError = edsdk.EdsDownloadEvfImage(this.camera_.getEdsReference(), this.evfImageRef_);
        if (downloadError !== ErrorCode.OK) {
            edsdk.EdsRelease(this.evfImageRef_);
            edsdk.EdsRelease(this.streamRef_);
            throwIfError(downloadError);
        }
    }

    private ensureNotDisposed_() {
        if (this.disposed_) {
            throw new Error('LiveViewImage has already been disposed');
        }
    }

    private getImageProperty_<T>(identifier: number, size: number, type: string): T {
        this.ensureNotDisposed_();
        const out = Buffer.alloc(size);
        throwIfError(edsdk.EdsGetPropertyData(this.evfImageRef_, identifier, 0, size, out));
        return koffi.decode(out, type);
    }

    /** Coordinate system size (width/height) of the live view image. */
    get coordinateSystem(): { width: number; height: number } {
        const decoded = this.getImageProperty_<{
            width: number;
            height: number;
        }>(PropertyID.Evf_CoordinateSystem, koffi.sizeof(EdsSize), 'EdsSize');
        return { width: decoded.width, height: decoded.height };
    }

    /** Y/R/G/B histogram data for the live view frame. */
    get histogram(): { y: number[]; r: number[]; g: number[]; b: number[] } {
        this.ensureNotDisposed_();
        const propertySize = 256 * 4;
        const readHistogram = (id: number): number[] => {
            const out = Buffer.alloc(propertySize);
            throwIfError(edsdk.EdsGetPropertyData(this.evfImageRef_, id, 0, propertySize, out));
            return Array.from(koffi.decode(out, 'uint32_t', 256));
        };
        return {
            y: readHistogram(PropertyID.Evf_HistogramY),
            r: readHistogram(PropertyID.Evf_HistogramR),
            g: readHistogram(PropertyID.Evf_HistogramG),
            b: readHistogram(PropertyID.Evf_HistogramB),
        };
    }

    /** Status of the histogram overlay. */
    get histogramStatus(): Option {
        this.ensureNotDisposed_();
        const out = Buffer.alloc(4);
        throwIfError(edsdk.EdsGetPropertyData(this.evfImageRef_, PropertyID.Evf_HistogramStatus, 0, 4, out));
        const status = koffi.decode(out, 'uint32_t');
        return new Option(PropertyID.Evf_HistogramStatus, status);
    }

    /** Top-left position of the image clip area. */
    get position(): { left: number; top: number } {
        const decoded = this.getImageProperty_<{
            x: number;
            y: number;
        }>(PropertyID.Evf_ImagePosition, koffi.sizeof(EdsPoint), 'EdsPoint');
        return { left: decoded.x, top: decoded.y };
    }

    /** Visible rectangle of the live view frame. */
    get visibleArea(): {
        left: number;
        top: number;
        width: number;
        height: number;
    } {
        const decoded = this.getImageProperty_<{
            point: { x: number; y: number };
            size: { width: number; height: number };
        }>(PropertyID.Evf_VisibleRect, koffi.sizeof(EdsRect), 'EdsRect');
        return {
            left: decoded.point.x,
            top: decoded.point.y,
            width: decoded.size.width,
            height: decoded.size.height,
        };
    }

    /** Current zoom level of the live view. */
    get zoom(): Option {
        this.ensureNotDisposed_();
        const out = Buffer.alloc(4);
        throwIfError(edsdk.EdsGetPropertyData(this.evfImageRef_, PropertyID.Evf_Zoom, 0, 4, out));
        const value = koffi.decode(out, 'uint32_t');
        return new Option(PropertyID.Evf_Zoom, value);
    }

    /** Rectangle showing the zoomed area of the live view. */
    get zoomArea(): {
        left: number;
        top: number;
        width: number;
        height: number;
    } {
        const decoded = this.getImageProperty_<{
            point: { x: number; y: number };
            size: { width: number; height: number };
        }>(PropertyID.Evf_ZoomRect, koffi.sizeof(EdsRect), 'EdsRect');
        return {
            left: decoded.point.x,
            top: decoded.point.y,
            width: decoded.size.width,
            height: decoded.size.height,
        };
    }

    /** Position of the zoom area on the live view canvas. */
    get zoomPosition(): { left: number; top: number } {
        const decoded = this.getImageProperty_<{
            x: number;
            y: number;
        }>(PropertyID.Evf_ZoomPosition, koffi.sizeof(EdsPoint), 'EdsPoint');
        return { left: decoded.x, top: decoded.y };
    }

    /** Returns the live view frame as a JPEG base64 data URL. */
    getDataURL(): string {
        this.ensureNotDisposed_();
        const length: [number | bigint] = [0];
        throwIfError(edsdk.EdsGetLength(this.streamRef_, length));
        const n = Number(length[0]);
        const buffer = Buffer.alloc(n);
        const outRead: [number | bigint] = [0];
        throwIfError(edsdk.EdsRead(this.streamRef_, length[0], buffer, outRead));
        const read = Number(outRead[0]);
        const b64 = buffer.toString('base64', 0, read);
        this.dispose();
        return `data:image/jpeg;base64,${b64}`;
    }

    /** Releases the live view image and stream references. */
    dispose() {
        if (this.disposed_) {
            return;
        }
        this.disposed_ = true;
        if (this.evfImageRef_ !== undefined && this.evfImageRef_ !== 0n) {
            try {
                edsdk.EdsRelease(this.evfImageRef_);
            } catch {
                // ignore
            }
        }
        if (this.streamRef_ !== undefined && this.streamRef_ !== 0n) {
            try {
                edsdk.EdsRelease(this.streamRef_);
            } catch {
                // ignore
            }
        }
        this.evfImageRef_ = 0n;
        this.streamRef_ = 0n;
    }

    [Symbol.for('nodejs.util.inspect.custom')](_depth: number, options: any) {
        return options.stylize('LiveViewImage', 'special');
    }
}
