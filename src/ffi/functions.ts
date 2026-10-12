import koffi from 'koffi';
import { getEdsdkLibrary, getEdsImageLibrary } from './library-loader.js';

const EdsCameraAddedHandler = koffi.proto('uint32 __stdcall EdsCameraAddedHandler(void *inContext)');
const EdsPropertyEventHandler = koffi.proto(
    'uint32 __stdcall EdsPropertyEventHandler(uint32 inEvent, uint32 inPropertyID, uint32 inParam, void *inContext)',
);
const EdsObjectEventHandler = koffi.proto(
    'uint32 __stdcall EdsObjectEventHandler(uint32 inEvent, void *inRef, void *inContext)',
);
const EdsStateEventHandler = koffi.proto(
    'uint32 __stdcall EdsStateEventHandler(uint32 inEvent, uint32 inEventData, void *inContext)',
);
const EdsProgressCallback = koffi.proto(
    'uint32 __stdcall EdsProgressCallback(uint32 inPercent, void *inContext, int32 *outCancel)',
);

/**
 * Allocates a one-element pointer suitable for EDSDK output arguments.
 *
 * Many EDSDK functions write an opaque handle through an `Eds...Ref *`
 * parameter. This helper allocates a stable memory location for that output.
 */
export function createOutputPointer(): unknown {
    return koffi.alloc('void *', 1);
}

/**
 * Reads the opaque handle written by an EDSDK function into a pointer
 * allocated by {@link createOutputPointer}.
 */
export function readOutputPointer(ptr: unknown): unknown {
    return koffi.decode(ptr as any, 'void *');
}

/** Frees a pointer allocated by {@link createOutputPointer}. */
export function freeOutputPointer(ptr: unknown): void {
    koffi.free(ptr as any);
}

type AnyKoffiFunc = (...args: any[]) => any;

function getFunction(prototype: string): AnyKoffiFunc {
    let fn: AnyKoffiFunc | undefined;
    return (...args: any[]) => {
        if (fn) {
            return fn(...args);
        }
        const lib = getEdsdkLibrary();
        try {
            fn = lib.func(prototype);
        } catch (err) {
            const img = getEdsImageLibrary();
            if (img) {
                fn = img.func(prototype);
            } else {
                throw err;
            }
        }
        return fn(...args);
    };
}

export interface EdsFunctions {
    EdsInitializeSDK: () => number;
    EdsTerminateSDK: () => number;
    EdsRetain: (ref: any) => number;
    EdsRelease: (ref: any) => number;
    EdsGetChildCount: (ref: any, outCount: [number]) => number;
    EdsGetChildAtIndex: (ref: any, index: number, outRef: any) => number;
    EdsGetParent: (ref: any, outParentRef: any) => number;
    EdsGetPropertySize: (ref: any, propertyID: number, param: number, outDataType: [number], outSize: [number]) => number;
    EdsGetPropertyData: (ref: any, propertyID: number, param: number, size: number, outData: Buffer) => number;
    EdsSetPropertyData: (ref: any, propertyID: number, param: number, size: number, inData: any) => number;
    EdsGetPropertyDesc: (ref: any, propertyID: number, outDesc: any) => number;
    EdsGetPropertyDescEx: (ref: any, propertyID: number, outDesc: any) => number;
    EdsGetCameraList: (outList: any) => number;
    EdsGetDeviceInfo: (cameraRef: any, outInfo: any) => number;
    EdsOpenSession: (cameraRef: any) => number;
    EdsCloseSession: (cameraRef: any) => number;
    EdsSendCommand: (cameraRef: any, command: number, param: number) => number;
    EdsSendStatusCommand: (cameraRef: any, command: number, param: number) => number;
    EdsSetCapacity: (cameraRef: any, capacity: any) => number;
    EdsGetVolumeInfo: (volumeRef: any, outInfo: any) => number;
    EdsFormatVolume: (volumeRef: any) => number;
    EdsCreateFolder: (cameraRef: any) => number;
    EdsCreateFlashSettingRef: (cameraRef: any, outFlashRef: any) => number;
    EdsGetDirectoryItemInfo: (itemRef: any, outInfo: any) => number;
    EdsDeleteDirectoryItem: (itemRef: any) => number;
    EdsGetAttribute: (itemRef: any, outAttribute: [number]) => number;
    EdsSetAttribute: (itemRef: any, attribute: number) => number;
    EdsSetMetaImage: (itemRef: any, metaType: number, metaDataSize: number, metaData: any) => number;
    EdsGetCsdFileData: (cameraRef: any, stream: any) => number;
    EdsSetCsdFileData: (cameraRef: any, dataSize: number, dataValue: any) => number;
    EdsDownload: (itemRef: any, size: number | bigint, stream: any) => number;
    EdsDownloadCancel: (itemRef: any) => number;
    EdsDownloadComplete: (itemRef: any) => number;
    EdsDownloadThumbnail: (itemRef: any, stream: any) => number;
    EdsCreateFileStream: (filename: string, createDisposition: number, access: number, outStream: any) => number;
    EdsCreateFileStreamEx: (filename: string, createDisposition: number, access: number, outStream: any) => number;
    EdsCreateMemoryStream: (size: number | bigint, outStream: any) => number;
    EdsCreateMemoryStreamFromPointer: (buffer: any, size: number | bigint, outStream: any) => number;
    EdsGetPointer: (stream: any, outPointer: any) => number;
    EdsRead: (stream: any, size: number | bigint, outBuffer: Buffer, outRead: [number | bigint]) => number;
    EdsWrite: (stream: any, size: number | bigint, buffer: any, outWritten: [number | bigint]) => number;
    EdsSeek: (stream: any, offset: number | bigint, origin: number) => number;
    EdsGetPosition: (stream: any, outPosition: [number | bigint]) => number;
    EdsGetLength: (stream: any, outLength: [number | bigint]) => number;
    EdsCopyData: (source: any, size: number | bigint, dest: any) => number;
    EdsCreateStream: (stream: any, outStreamRef: any) => number;
    EdsSetProgressCallback: (ref: any, callback: any, option: number, context: any) => number;
    EdsCreateImageRef: (stream: any, outImageRef: any) => number;
    EdsGetImageInfo: (imageRef: any, imageSource: number, outInfo: any) => number;
    EdsGetImage: (
        imageRef: any,
        imageSource: number,
        imageType: number,
        srcRect: any,
        dstSize: any,
        outStream: any,
    ) => number;
    EdsCreateEvfImageRef: (stream: any, outEvfImageRef: any) => number;
    EdsDownloadEvfImage: (cameraRef: any, evfImageRef: any) => number;
    EdsSetCameraAddedHandler: (handler: any, context: any) => number;
    EdsSetPropertyEventHandler: (cameraRef: any, event: number, handler: any, context: any) => number;
    EdsSetObjectEventHandler: (cameraRef: any, event: number, handler: any, context: any) => number;
    EdsSetCameraStateEventHandler: (cameraRef: any, event: number, handler: any, context: any) => number;
    EdsGetEvent: () => number;
    EdsSetFramePoint: (cameraRef: any, framePoint: { x: number; y: number }, lockAfFrame: boolean) => number;
}

function bind(prototype: string): AnyKoffiFunc {
    return getFunction(prototype);
}

export const edsdk = {
    EdsInitializeSDK: bind('uint32 __stdcall EdsInitializeSDK()'),
    EdsTerminateSDK: bind('uint32 __stdcall EdsTerminateSDK()'),
    EdsRetain: bind('uint32 __stdcall EdsRetain(void *inRef)'),
    EdsRelease: bind('uint32 __stdcall EdsRelease(void *inRef)'),
    EdsGetChildCount: bind('uint32 __stdcall EdsGetChildCount(void *inRef, _Out_ uint32_t *outCount)'),
    EdsGetChildAtIndex: bind('uint32 __stdcall EdsGetChildAtIndex(void *inRef, int32_t inIndex, _Out_ void **outRef)'),
    EdsGetParent: bind('uint32 __stdcall EdsGetParent(void *inRef, _Out_ void **outParentRef)'),
    EdsGetPropertySize: bind(
        'uint32 __stdcall EdsGetPropertySize(void *inRef, uint32_t inPropertyID, int32_t inParam, _Out_ uint32_t *outDataType, _Out_ uint32_t *outSize)',
    ),
    EdsGetPropertyData: bind(
        'uint32 __stdcall EdsGetPropertyData(void *inRef, uint32_t inPropertyID, int32_t inParam, uint32_t inPropertySize, void *outPropertyData)',
    ),
    EdsSetPropertyData: bind(
        'uint32 __stdcall EdsSetPropertyData(void *inRef, uint32_t inPropertyID, int32_t inParam, uint32_t inPropertySize, const void *inPropertyData)',
    ),
    EdsGetPropertyDesc: bind(
        'uint32 __stdcall EdsGetPropertyDesc(void *inRef, uint32_t inPropertyID, _Out_ EdsPropertyDesc *outPropertyDesc)',
    ),
    EdsGetPropertyDescEx: bind(
        'uint32 __stdcall EdsGetPropertyDescEx(void *inRef, uint32_t inPropertyID, _Out_ EdsPropertyDescEx *outPropertyDesc)',
    ),
    EdsGetCameraList: bind('uint32 __stdcall EdsGetCameraList(_Out_ void **outCameraListRef)'),
    EdsGetDeviceInfo: bind('uint32 __stdcall EdsGetDeviceInfo(void *inCameraRef, _Out_ EdsDeviceInfo *outDeviceInfo)'),
    EdsOpenSession: bind('uint32 __stdcall EdsOpenSession(void *inCameraRef)'),
    EdsCloseSession: bind('uint32 __stdcall EdsCloseSession(void *inCameraRef)'),
    EdsSendCommand: bind('uint32 __stdcall EdsSendCommand(void *inCameraRef, uint32_t inCommand, int32_t inParam)'),
    EdsSendStatusCommand: bind(
        'uint32 __stdcall EdsSendStatusCommand(void *inCameraRef, uint32_t inStatusCommand, int32_t inParam)',
    ),
    EdsSetCapacity: bind('uint32 __stdcall EdsSetCapacity(void *inCameraRef, EdsCapacity inCapacity)'),
    EdsGetVolumeInfo: bind('uint32 __stdcall EdsGetVolumeInfo(void *inVolumeRef, _Out_ EdsVolumeInfo *outVolumeInfo)'),
    EdsFormatVolume: bind('uint32 __stdcall EdsFormatVolume(void *inVolumeRef)'),
    EdsCreateFolder: bind('uint32 __stdcall EdsCreateFolder(void *inCameraRef)'),
    EdsCreateFlashSettingRef: bind('uint32 __stdcall EdsCreateFlashSettingRef(void *inCameraRef, _Out_ void **outFlashRef)'),
    EdsGetDirectoryItemInfo: bind(
        'uint32 __stdcall EdsGetDirectoryItemInfo(void *inDirItemRef, _Out_ EdsDirectoryItemInfo *outDirItemInfo)',
    ),
    EdsDeleteDirectoryItem: bind('uint32 __stdcall EdsDeleteDirectoryItem(void *inDirItemRef)'),
    EdsGetAttribute: bind('uint32 __stdcall EdsGetAttribute(void *inDirItemRef, _Out_ int32_t *outFileAttribute)'),
    EdsSetAttribute: bind('uint32 __stdcall EdsSetAttribute(void *inDirItemRef, int32_t inFileAttribute)'),
    EdsSetMetaImage: bind(
        'uint32 __stdcall EdsSetMetaImage(void *inDirItemRef, uint32_t inMetaType, uint32_t inMetaDataSize, const void *inMetaData)',
    ),
    EdsGetCsdFileData: bind('uint32 __stdcall EdsGetCsdFileData(void *inCameraRef, void *outStream)'),
    EdsSetCsdFileData: bind('uint32 __stdcall EdsSetCsdFileData(void *inCameraRef, int32_t inDataSize, void *inDataValue)'),
    EdsDownload: bind('uint32 __stdcall EdsDownload(void *inDirItemRef, uint64_t inReadSize, void *outStream)'),
    EdsDownloadCancel: bind('uint32 __stdcall EdsDownloadCancel(void *inDirItemRef)'),
    EdsDownloadComplete: bind('uint32 __stdcall EdsDownloadComplete(void *inDirItemRef)'),
    EdsDownloadThumbnail: bind('uint32 __stdcall EdsDownloadThumbnail(void *inDirItemRef, void *outStream)'),
    EdsCreateFileStream: bind(
        'uint32 __stdcall EdsCreateFileStream(const char *inFileName, uint32_t inCreateDisposition, uint32_t inDesiredAccess, _Out_ void **outStream)',
    ),
    // EdsCreateFileStreamEx has a platform-specific filename argument:
    // WCHAR* on Windows, CFURLRef on macOS, const char* on Linux.
    EdsCreateFileStreamEx: bind(
        process.platform === 'win32'
            ? 'uint32 __stdcall EdsCreateFileStreamEx(const char16_t *inFileName, uint32_t inCreateDisposition, uint32_t inDesiredAccess, _Out_ void **outStream)'
            : process.platform === 'darwin'
              ? 'uint32 __stdcall EdsCreateFileStreamEx(const void *inURL, uint32_t inCreateDisposition, uint32_t inDesiredAccess, _Out_ void **outStream)'
              : 'uint32 __stdcall EdsCreateFileStreamEx(const char *inFileName, uint32_t inCreateDisposition, uint32_t inDesiredAccess, _Out_ void **outStream)',
    ),
    EdsCreateMemoryStream: bind('uint32 __stdcall EdsCreateMemoryStream(uint64_t inBufferSize, _Out_ void **outStream)'),
    EdsCreateMemoryStreamFromPointer: bind(
        'uint32 __stdcall EdsCreateMemoryStreamFromPointer(void *inUserBuffer, uint64_t inBufferSize, _Out_ void **outStream)',
    ),
    EdsGetPointer: bind('uint32 __stdcall EdsGetPointer(void *inStream, _Out_ void **outPointer)'),
    EdsRead: bind(
        'uint32 __stdcall EdsRead(void *inStreamRef, uint64_t inReadSize, void *outBuffer, _Out_ uint64_t *outReadSize)',
    ),
    EdsWrite: bind(
        'uint32 __stdcall EdsWrite(void *inStreamRef, uint64_t inWriteSize, const void *inBuffer, _Out_ uint64_t *outWrittenSize)',
    ),
    EdsSeek: bind('uint32 __stdcall EdsSeek(void *inStreamRef, int64_t inSeekOffset, uint32_t inSeekOrigin)'),
    EdsGetPosition: bind('uint32 __stdcall EdsGetPosition(void *inStreamRef, _Out_ uint64_t *outPosition)'),
    EdsGetLength: bind('uint32 __stdcall EdsGetLength(void *inStreamRef, _Out_ uint64_t *outLength)'),
    EdsCopyData: bind('uint32 __stdcall EdsCopyData(void *inStreamRef, uint64_t inWriteSize, void *outStreamRef)'),
    EdsCreateStream: bind('uint32 __stdcall EdsCreateStream(EdsIStream *inStream, _Out_ void **outStreamRef)'),
    EdsSetProgressCallback: bind(
        'uint32 __stdcall EdsSetProgressCallback(void *inRef, EdsProgressCallback *inProgressCallback, uint32_t inProgressOption, void *inContext)',
    ),
    EdsCreateImageRef: bind('uint32 __stdcall EdsCreateImageRef(void *inStreamRef, _Out_ void **outImageRef)'),
    EdsGetImageInfo: bind(
        'uint32 __stdcall EdsGetImageInfo(void *inImageRef, uint32_t inImageSource, _Out_ EdsImageInfo *outImageInfo)',
    ),
    EdsGetImage: bind(
        'uint32 __stdcall EdsGetImage(void *inImageRef, uint32_t inImageSource, uint32_t inImageType, EdsRect inSrcRect, EdsSize inDstSize, void *outStreamRef)',
    ),
    EdsCreateEvfImageRef: bind('uint32 __stdcall EdsCreateEvfImageRef(void *inStreamRef, _Out_ void **outEvfImageRef)'),
    EdsDownloadEvfImage: bind('uint32 __stdcall EdsDownloadEvfImage(void *inCameraRef, void *inEvfImageRef)'),
    EdsSetCameraAddedHandler: bind(
        'uint32 __stdcall EdsSetCameraAddedHandler(EdsCameraAddedHandler *inCameraAddedHandler, void *inContext)',
    ),
    EdsSetPropertyEventHandler: bind(
        'uint32 __stdcall EdsSetPropertyEventHandler(void *inCameraRef, uint32_t inEvnet, EdsPropertyEventHandler *inPropertyEventHandler, void *inContext)',
    ),
    EdsSetObjectEventHandler: bind(
        'uint32 __stdcall EdsSetObjectEventHandler(void *inCameraRef, uint32_t inEvnet, EdsObjectEventHandler *inObjectEventHandler, void *inContext)',
    ),
    EdsSetCameraStateEventHandler: bind(
        'uint32 __stdcall EdsSetCameraStateEventHandler(void *inCameraRef, uint32_t inEvnet, EdsStateEventHandler *inStateEventHandler, void *inContext)',
    ),
    EdsGetEvent: bind('uint32 __stdcall EdsGetEvent()'),
    EdsSetFramePoint: bind(
        'uint32 __stdcall EdsSetFramePoint(void *inCameraRef, EdsPoint inFramepoint, bool inLockAfFrame)',
    ),
} as EdsFunctions;

/**
 * Invokes a raw EDSDK function by name.
 *
 * @param name - The EDSDK function to call.
 * @param args - Arguments passed directly to the native function.
 */
export function call<T>(name: keyof EdsFunctions, ...args: any[]): T {
    return (edsdk as any)[name](...args);
}

export { EdsCameraAddedHandler, EdsPropertyEventHandler, EdsObjectEventHandler, EdsStateEventHandler, EdsProgressCallback };
