import { edsdk, createOutputPointer, readOutputPointer, freeOutputPointer } from './ffi/functions.js';
import { ErrorCode } from './ffi/constants.js';
import { throwIfError, throwError } from './api-error.js';
import { CameraProperty, type ICamera, type PropertyName } from './property.js';

/**
 * Wraps an `EdsFlashRef` created by `EdsCreateFlashSettingRef`.
 *
 * Flash settings are exposed as properties on the flash reference (for
 * example `CameraProperty.ID.DC_Strobe`); use {@link FlashSettings.getProperty}
 * to read them.
 */
export class FlashSettings implements ICamera {
    [Symbol.toStringTag] = 'FlashSettings';

    private ref_: unknown;

    /** @param camera - A connected camera to create the flash settings object on. */
    constructor(camera: ICamera) {
        const ptr = createOutputPointer();
        try {
            throwIfError(edsdk.EdsCreateFlashSettingRef(camera.getEdsReference(), ptr));
            this.ref_ = readOutputPointer(ptr);
        } finally {
            freeOutputPointer(ptr);
        }
    }

    /** Returns the underlying EDSDK flash reference. */
    getEdsReference(): unknown {
        return this.ref_;
    }

    /** Creates an accessor for a flash setting property. */
    getProperty(propertyID: PropertyName | number, specifier = 0): CameraProperty {
        const id = CameraProperty.getIDFor(propertyID);
        if (id === undefined) {
            throwError(ErrorCode.INVALID_PARAMETER);
        }
        return new CameraProperty(this, id, specifier);
    }

    /** Releases the flash reference. */
    dispose(): void {
        if (this.ref_ !== 0n && this.ref_ !== undefined) {
            try {
                edsdk.EdsRelease(this.ref_);
            } catch {
                // ignore
            }
            this.ref_ = 0n;
        }
    }

    [Symbol.for('nodejs.util.inspect.custom')](_depth: number, options: any) {
        return options.stylize('FlashSettings', 'special');
    }
}
