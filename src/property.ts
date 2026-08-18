import koffi from 'koffi';
import { edsdk } from './ffi/functions.js';
import { PropertyID, DataType, ErrorCode, SaveTo } from './ffi/constants.js';
import { EdsTime, EdsPictureStyleDesc, EdsRational, EdsPropertyDesc } from './ffi/definitions.js';
import { ApiError } from './api-error.js';
import { Aperture } from './values/aperture.js';
import { ShutterSpeed } from './values/shutter-speed.js';
import { ISOSensitivity } from './values/iso-sensitivity.js';
import { ExposureCompensation } from './values/exposure-compensation.js';
import { ImageQuality } from './values/image-quality.js';
import { OutputDevice } from './values/output-device.js';
import { Flag } from './values/flag.js';
import { Option } from './values/option.js';
import { TimeZone } from './values/time-zone.js';
import type { PropertyValue } from './values/property-value.js';

export interface ICamera {
    getEdsReference(): unknown;
}

function throwIfError(code: number): void {
    if (code !== ErrorCode.OK) {
        const apiError = new ApiError(code);
        const err = new Error(`EDSDK error: ${apiError.label}`) as any;
        err.EDS_ERROR = apiError;
        throw err;
    }
}

function getPropertySize(ref: unknown, identifier: number, specifier: number): [number, number] {
    const dataType: [number] = [0];
    const size: [number] = [0];
    throwIfError(edsdk.EdsGetPropertySize(ref as any, identifier, specifier, dataType, size));
    return [dataType[0], size[0]];
}

function wrapValue(propertyID: number, value: number): PropertyValue | number {
    switch (propertyID) {
        case PropertyID.Av:
            return new Aperture(value);
        case PropertyID.Tv:
            return new ShutterSpeed(value);
        case PropertyID.ISOSpeed:
            return new ISOSensitivity(value);
        case PropertyID.ExposureCompensation:
            return new ExposureCompensation(value);
        case PropertyID.ImageQuality:
            return new ImageQuality(value);
        case PropertyID.Evf_OutputDevice:
            return new OutputDevice(value);
        case PropertyID.TimeZone:
            return new TimeZone(value);
        case PropertyID.FlashOn:
        case PropertyID.Evf_DepthOfFieldPreview:
        case PropertyID.MirrorUpSetting:
            return new Flag(value);
    }
    if (Option.OptionGroups[propertyID]) {
        return new Option(propertyID, value);
    }
    return value;
}

function decodeString(buffer: Buffer): string {
    return buffer.toString('utf-8').split('\0')[0] ?? '';
}

function decodeBuffer(dataType: number, buffer: Buffer, size: number): any {
    switch (dataType) {
        case DataType.String:
            return decodeString(buffer);
        case DataType.Bool:
            return koffi.decode(buffer, 'int32_t');
        case DataType.Int8:
            return koffi.decode(buffer, 'int8_t');
        case DataType.Int16:
            return koffi.decode(buffer, 'int16_t');
        case DataType.Int32:
            return koffi.decode(buffer, 'int32_t');
        case DataType.UInt8:
            return koffi.decode(buffer, 'uint8_t');
        case DataType.UInt16:
            return koffi.decode(buffer, 'uint16_t');
        case DataType.UInt32:
            return koffi.decode(buffer, 'uint32_t');
        case DataType.Int64:
            return koffi.decode(buffer, 'int64_t');
        case DataType.UInt64:
            return koffi.decode(buffer, 'uint64_t');
        case DataType.Float:
            return koffi.decode(buffer, 'float');
        case DataType.Double:
            return koffi.decode(buffer, 'double');
        case DataType.Rational:
            return koffi.decode(buffer, 'EdsRational');
        case DataType.Point:
            return koffi.decode(buffer, 'EdsPoint');
        case DataType.Rect:
            return koffi.decode(buffer, 'EdsRect');
        case DataType.ByteBlock:
            return buffer;
        case DataType.Time:
            return koffi.decode(buffer, 'EdsTime');
        case DataType.PictureStyleDesc:
            return koffi.decode(buffer, 'EdsPictureStyleDesc');
        case DataType.FocusInfo:
            return koffi.decode(buffer, 'EdsFocusInfo');
        case DataType.Int32_Array:
            return koffi.decode(buffer, 'int32_t', size / 4);
        case DataType.UInt32_Array:
            return koffi.decode(buffer, 'uint32_t', size / 4);
        case DataType.Int16_Array:
            return koffi.decode(buffer, 'int16_t', size / 2);
        case DataType.UInt16_Array:
            return koffi.decode(buffer, 'uint16_t', size / 2);
        case DataType.Int8_Array:
            return koffi.decode(buffer, 'int8_t', size);
        case DataType.UInt8_Array:
            return koffi.decode(buffer, 'uint8_t', size);
        case DataType.Rational_Array:
            return koffi.decode(buffer, 'EdsRational', size / 8);
        case DataType.Bool_Array:
            return koffi.decode(buffer, 'int32_t', size / 4);
        default:
            return buffer;
    }
}

function decodeProperty(propertyID: number, dataType: number, buffer: Buffer, size: number): any {
    if (dataType === DataType.String) {
        return decodeString(buffer);
    }
    const raw = decodeBuffer(dataType, buffer, size);
    if (typeof raw === 'number') {
        return wrapValue(propertyID, raw);
    }
    return raw;
}

function encodeBuffer(dataType: number, value: any, size: number): Buffer {
    if (dataType === DataType.String) {
        const buf = Buffer.alloc(size);
        const str = String(value);
        const bytes = Buffer.byteLength(str, 'utf-8');
        buf.write(str, 0, Math.min(bytes, size - 1), 'utf-8');
        return buf;
    }
    if (dataType === DataType.ByteBlock) {
        return Buffer.isBuffer(value) ? value : Buffer.from(value as Uint8Array);
    }
    if (dataType === DataType.Time) {
        const buf = Buffer.alloc(koffi.sizeof(EdsTime));
        koffi.encode(buf, 'EdsTime', value);
        return buf;
    }
    if (dataType === DataType.PictureStyleDesc) {
        const buf = Buffer.alloc(koffi.sizeof(EdsPictureStyleDesc));
        koffi.encode(buf, 'EdsPictureStyleDesc', value);
        return buf;
    }
    if (dataType === DataType.Rational) {
        const buf = Buffer.alloc(koffi.sizeof(EdsRational));
        koffi.encode(buf, 'EdsRational', value);
        return buf;
    }

    const elementSizes: Record<number, number> = {
        [DataType.Bool]: 4,
        [DataType.Int8]: 1,
        [DataType.Int16]: 2,
        [DataType.Int32]: 4,
        [DataType.UInt8]: 1,
        [DataType.UInt16]: 2,
        [DataType.UInt32]: 4,
        [DataType.Int64]: 8,
        [DataType.UInt64]: 8,
        [DataType.Float]: 4,
        [DataType.Double]: 8,
        [DataType.Rational]: 8,
    };
    const primitiveTypes: Record<number, string> = {
        [DataType.Bool]: 'int32_t',
        [DataType.Int8]: 'int8_t',
        [DataType.Int16]: 'int16_t',
        [DataType.Int32]: 'int32_t',
        [DataType.UInt8]: 'uint8_t',
        [DataType.UInt16]: 'uint16_t',
        [DataType.UInt32]: 'uint32_t',
        [DataType.Int64]: 'int64_t',
        [DataType.UInt64]: 'uint64_t',
        [DataType.Float]: 'float',
        [DataType.Double]: 'double',
        [DataType.Rational]: 'EdsRational',
    };
    if (
        dataType === DataType.Bool_Array ||
        dataType === DataType.Int32_Array ||
        dataType === DataType.UInt32_Array ||
        dataType === DataType.Int16_Array ||
        dataType === DataType.UInt16_Array ||
        dataType === DataType.Int8_Array ||
        dataType === DataType.UInt8_Array ||
        dataType === DataType.Rational_Array
    ) {
        let type = 'uint32_t';
        let elementSize = 4;
        let length = size / 4;
        if (dataType === DataType.Int16_Array) {
            type = 'int16_t';
            elementSize = 2;
            length = size / 2;
        } else if (dataType === DataType.UInt16_Array) {
            type = 'uint16_t';
            elementSize = 2;
            length = size / 2;
        } else if (dataType === DataType.Int8_Array) {
            type = 'int8_t';
            elementSize = 1;
            length = size;
        } else if (dataType === DataType.UInt8_Array) {
            type = 'uint8_t';
            elementSize = 1;
            length = size;
        } else if (dataType === DataType.Rational_Array) {
            type = 'EdsRational';
            elementSize = 8;
            length = size / 8;
        } else if (dataType === DataType.Int32_Array) {
            type = 'int32_t';
        } else if (dataType === DataType.UInt32_Array) {
            type = 'uint32_t';
        }
        const buf = Buffer.alloc(size);
        const arr = Array.isArray(value) ? value : [value];
        if (arr.length * elementSize > size) {
            arr.length = Math.floor(size / elementSize);
        }
        koffi.encode(buf, type, arr, length);
        return buf;
    }
    const type = primitiveTypes[dataType];
    const elementSize = elementSizes[dataType] ?? size;
    if (!type) {
        throw new Error(`Unsupported property data type: ${dataType}`);
    }
    const buf = Buffer.alloc(elementSize);
    koffi.encode(buf, type, value);
    return buf;
}

function toRawValue(value: any): any {
    if (value && typeof value === 'object') {
        if ('value' in value) {
            return value.value;
        }
        if (value instanceof Date) {
            return {
                year: value.getUTCFullYear(),
                month: value.getUTCMonth() + 1,
                day: value.getUTCDate(),
                hour: value.getUTCHours(),
                minute: value.getUTCMinutes(),
                second: value.getUTCSeconds(),
                milliseconds: value.getUTCMilliseconds(),
            };
        }
    }
    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }
    return value;
}

/**
 * Provides typed access to a single camera or image property.
 *
 * Properties represent values such as aperture (Av), shutter speed (Tv), ISO,
 * and image quality. `CameraProperty` reads the raw EDSDK value, decodes it
 * into a typed value class when possible, and can write it back to the camera.
 */
export class CameraProperty {
    [Symbol.toStringTag] = 'CameraProperty';

    /**
     * @param camera - The camera (or image) that owns this property.
     * @param identifier - An EDSDK property ID. Use names from
     *   `CameraProperty.ID` for convenience.
     * @param specifier - Optional specifier for array-like properties.
     */
    constructor(
        readonly camera: ICamera,
        readonly identifier: number,
        readonly specifier: number = 0,
    ) {}

    /** Human-readable name for this property, derived from `CameraProperty.ID`. */
    get label(): string {
        return CameraProperty.getLabelFor(this.identifier);
    }

    /** Whether this property can currently be read from the object. */
    get available(): boolean {
        try {
            const ref = this.camera.getEdsReference();
            const [, size] = getPropertySize(ref, this.identifier, this.specifier);
            return size > 0;
        } catch {
            return false;
        }
    }

    /** The current decoded property value. */
    get value(): any {
        const ref = this.camera.getEdsReference();
        const [dataType, size] = getPropertySize(ref, this.identifier, this.specifier);
        const out = Buffer.alloc(size);
        throwIfError(edsdk.EdsGetPropertyData(ref as any, this.identifier, this.specifier, size, out));
        return decodeProperty(this.identifier, dataType, out, size);
    }

    /** Writes a new value for this property to the camera. */
    set value(value: any) {
        const ref = this.camera.getEdsReference();
        const [dataType, size] = getPropertySize(ref, this.identifier, this.specifier);
        let raw = toRawValue(value);
        if (dataType !== DataType.String) {
            raw = typeof raw === 'string' ? parseInt(raw, 10) : raw;
        }
        const inData = encodeBuffer(dataType, raw, size);
        throwIfError(edsdk.EdsSetPropertyData(ref as any, this.identifier, this.specifier, size, inData));
        if (this.identifier === PropertyID.SaveTo && raw === SaveTo.Host) {
            const capacity = {
                numberOfFreeClusters: 0x7fffffff,
                bytesPerSector: 0x1000,
                reset: 1,
            };
            throwIfError(edsdk.EdsSetCapacity(ref as any, capacity));
        }
    }

    /** Returns the list of values currently allowed for this property. */
    get allowedValues(): any[] {
        const ref = this.camera.getEdsReference();
        const desc = koffi.alloc(EdsPropertyDesc, 1);
        throwIfError(edsdk.EdsGetPropertyDesc(ref as any, this.identifier, desc));
        const { numElements, propDesc } = koffi.decode(desc, 'EdsPropertyDesc');
        koffi.free(desc);
        const values: any[] = [];
        for (let i = 0; i < numElements; i++) {
            values.push(wrapValue(this.identifier, propDesc[i]));
        }
        return values;
    }

    /** Returns a JSON-serializable summary of this property. */
    toJSON(): {
        label: string;
        identifier: number;
        specifier: number;
        value: any;
        allowedValues: any[];
    } {
        return {
            label: this.label,
            identifier: this.identifier,
            specifier: this.specifier,
            value: this.value,
            allowedValues: this.allowedValues,
        };
    }

    /** Returns the symbolic name for a property ID, or a hex string if unknown. */
    static getLabelFor(id: number): string {
        return (
            Object.keys(PropertyID).find((key) => (PropertyID as Record<string, number>)[key] === id) ??
            `0x${id.toString(16).padStart(8, '0')}`
        );
    }

    /** Resolves a property name or raw numeric string to the EDSDK property ID. */
    static getIDFor(label: string | number): number | undefined {
        if (typeof label === 'number') {
            return label;
        }
        if (/^\d+$/.test(label)) {
            return parseInt(label, 10);
        }
        return (PropertyID as Record<string, number>)[label];
    }

    /** Record of all known EDSDK property IDs by name. */
    static readonly ID: Record<string, number> = PropertyID as unknown as Record<string, number>;
}
