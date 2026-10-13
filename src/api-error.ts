import { ErrorCode } from './ffi/constants.js';
import { ApiIdentifier } from './values/api-identifier.js';

/**
 * Wraps an EDSDK error code.
 *
 * Most EDSDK APIs return a numeric error code. `ApiError` maps that code to a
 * human-readable label and makes it easy to compare against the well-known
 * error constants.
 */
export class ApiError extends ApiIdentifier {
    override [Symbol.toStringTag] = 'ApiError';

    /** @param identifier - An EDSDK error code. */
    constructor(identifier: number) {
        super(identifier, ApiError.Code);
    }

    /** Returns `true` when this error matches the given code or `ApiError`. */
    override equalTo(other: number | ApiError): boolean {
        return super.equalTo(+other);
    }

    /** Creates an `ApiError` from a known error label. */
    static forLabel(label: string): ApiError | null {
        const value = ApiError.Code[label as keyof typeof ApiError.Code];
        if (value !== undefined) {
            return new ApiError(value);
        }
        return null;
    }

    static readonly Code = {
        UNIMPLEMENTED: 1,
        INTERNAL_ERROR: 2,
        MEM_ALLOC_FAILED: 3,
        MEM_FREE_FAILED: 4,
        OPERATION_CANCELLED: 5,
        INCOMPATIBLE_VERSION: 6,
        NOT_SUPPORTED: 7,
        UNEXPECTED_EXCEPTION: 8,
        PROTECTION_VIOLATION: 9,
        MISSING_SUBCOMPONENT: 10,
        SELECTION_UNAVAILABLE: 11,
        FILE_IO_ERROR: 32,
        FILE_TOO_MANY_OPEN: 33,
        FILE_NOT_FOUND: 34,
        FILE_OPEN_ERROR: 35,
        FILE_CLOSE_ERROR: 36,
        FILE_SEEK_ERROR: 37,
        FILE_TELL_ERROR: 38,
        FILE_READ_ERROR: 39,
        FILE_WRITE_ERROR: 40,
        FILE_PERMISSION_ERROR: 41,
        FILE_DISK_FULL_ERROR: 42,
        FILE_ALREADY_EXISTS: 43,
        FILE_FORMAT_UNRECOGNIZED: 44,
        FILE_DATA_CORRUPT: 45,
        FILE_NAMING_NA: 46,
        DIR_NOT_FOUND: 64,
        DIR_IO_ERROR: 65,
        DIR_ENTRY_NOT_FOUND: 66,
        DIR_ENTRY_EXISTS: 67,
        DIR_NOT_EMPTY: 68,
        PROPERTIES_UNAVAILABLE: 80,
        PROPERTIES_MISMATCH: 81,
        PROPERTIES_NOT_LOADED: 83,
        INVALID_PARAMETER: 96,
        INVALID_HANDLE: 97,
        INVALID_POINTER: 98,
        INVALID_INDEX: 99,
        INVALID_LENGTH: 100,
        INVALID_FN_POINTER: 101,
        INVALID_SORT_FN: 102,
        DEVICE_NOT_FOUND: 128,
        DEVICE_BUSY: 129,
        DEVICE_INVALID: 130,
        DEVICE_EMERGENCY: 131,
        DEVICE_MEMORY_FULL: 132,
        DEVICE_INTERNAL_ERROR: 133,
        DEVICE_INVALID_PARAMETER: 134,
        DEVICE_NO_DISK: 135,
        DEVICE_DISK_ERROR: 136,
        DEVICE_CF_GATE_CHANGED: 137,
        DEVICE_DIAL_CHANGED: 138,
        DEVICE_NOT_INSTALLED: 139,
        DEVICE_STAY_AWAKE: 140,
        DEVICE_NOT_RELEASED: 141,
        STREAM_IO_ERROR: 160,
        STREAM_NOT_OPEN: 161,
        STREAM_ALREADY_OPEN: 162,
        STREAM_OPEN_ERROR: 163,
        STREAM_CLOSE_ERROR: 164,
        STREAM_SEEK_ERROR: 165,
        STREAM_TELL_ERROR: 166,
        STREAM_READ_ERROR: 167,
        STREAM_WRITE_ERROR: 168,
        STREAM_PERMISSION_ERROR: 169,
        STREAM_COULDNT_BEGIN_THREAD: 170,
        STREAM_BAD_OPTIONS: 171,
        STREAM_END_OF_STREAM: 172,
        COMM_PORT_IS_IN_USE: 192,
        COMM_DISCONNECTED: 193,
        COMM_DEVICE_INCOMPATIBLE: 194,
        COMM_BUFFER_FULL: 195,
        COMM_USB_BUS_ERR: 196,
        USB_DEVICE_LOCK_ERROR: 208,
        USB_DEVICE_UNLOCK_ERROR: 209,
        STI_UNKNOWN_ERROR: 224,
        STI_INTERNAL_ERROR: 225,
        STI_DEVICE_CREATE_ERROR: 226,
        STI_DEVICE_RELEASE_ERROR: 227,
        DEVICE_NOT_LAUNCHED: 228,
        ENUM_NA: 240,
        INVALID_FN_CALL: 241,
        HANDLE_NOT_FOUND: 242,
        INVALID_ID: 243,
        WAIT_TIMEOUT_ERROR: 244,
        UNKNOWN_COMMAND: 40961,
        OPERATION_REFUSED: 40965,
        LENS_COVER_CLOSE: 40966,
        LOW_BATTERY: 41217,
        OBJECT_NOTREADY: 41218,
        CANNOT_MAKE_OBJECT: 41220,
        MEMORYSTATUS_NOTREADY: 41222,
        SESSION_NOT_OPEN: 8195,
        INVALID_TRANSACTIONID: 8196,
        INCOMPLETE_TRANSFER: 8199,
        INVALID_STRAGEID: 8200,
        DEVICEPROP_NOT_SUPPORTED: 8202,
        INVALID_OBJECTFORMATCODE: 8203,
        SELF_TEST_FAILED: 8209,
        PARTIAL_DELETION: 8210,
        SPECIFICATION_BY_FORMAT_UNSUPPORTED: 8212,
        NO_VALID_OBJECTINFO: 8213,
        INVALID_CODE_FORMAT: 8214,
        UNKNOWN_VENDOR_CODE: 8215,
        CAPTURE_ALREADY_TERMINATED: 8216,
        PTP_DEVICE_BUSY: 8217,
        INVALID_PARENTOBJECT: 8218,
        INVALID_DEVICEPROP_FORMAT: 8219,
        INVALID_DEVICEPROP_VALUE: 8220,
        SESSION_ALREADY_OPEN: 8222,
        TRANSACTION_CANCELLED: 8223,
        SPECIFICATION_OF_DESTINATION_UNSUPPORTED: 8224,
        NOT_CAMERA_SUPPORT_SDK_VERSION: 8225,
        TAKE_PICTURE_AF_NG: 36097,
        TAKE_PICTURE_RESERVED: 36098,
        TAKE_PICTURE_MIRROR_UP_NG: 36099,
        TAKE_PICTURE_SENSOR_CLEANING_NG: 36100,
        TAKE_PICTURE_SILENCE_NG: 36101,
        TAKE_PICTURE_NO_CARD_NG: 36102,
        TAKE_PICTURE_CARD_NG: 36103,
        TAKE_PICTURE_CARD_PROTECT_NG: 36104,
        TAKE_PICTURE_MOVIE_CROP_NG: 36105,
        TAKE_PICTURE_STROBO_CHARGE_NG: 36106,
        TAKE_PICTURE_NO_LENS_NG: 36107,
        TAKE_PICTURE_SPECIAL_MOVIE_MODE_NG: 36108,
        TAKE_PICTURE_LV_REL_PROHIBIT_MODE_NG: 36109,
        TAKE_PICTURE_MOVIE_MODE_NG: 36110,
        TAKE_PICTURE_RETRUCTED_LENS_NG: 36111,
        OK: 0,
    } as const;
}

/**
 * Error thrown when an EDSDK API call returns a non-OK status.
 *
 * The `EDS_ERROR` property carries the `ApiError` so callers can inspect the
 * numeric code or label in `catch` blocks. Use {@link isEdsError} to narrow.
 */
export class EdsError extends Error {
    /** The `ApiError` that describes the EDSDK failure. */
    readonly EDS_ERROR: ApiError;

    constructor(apiError: ApiError) {
        super(`EDSDK error: ${apiError.label}`);
        this.name = 'EdsError';
        this.EDS_ERROR = apiError;
    }
}

/** Returns `true` when `err` is an `EdsError` thrown by this library. */
export function isEdsError(err: unknown): err is EdsError {
    return err instanceof EdsError;
}

/** Throws an `EdsError` for `code`. */
export function throwError(code: number): never {
    throw new EdsError(new ApiError(code));
}

/** Throws an `EdsError` when `code` is not `EDS_ERR_OK`. */
export function throwIfError(code: number): void {
    if (code !== ErrorCode.OK) {
        throwError(code);
    }
}
