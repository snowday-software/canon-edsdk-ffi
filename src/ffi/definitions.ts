import koffi from 'koffi';

export const EdsBaseRef = koffi.opaque('EdsBaseRef');
export const EdsCameraListRef = koffi.opaque('EdsCameraListRef');
export const EdsCameraRef = koffi.opaque('EdsCameraRef');
export const EdsVolumeRef = koffi.opaque('EdsVolumeRef');
export const EdsFlashRef = koffi.opaque('EdsFlashRef');
export const EdsDirectoryItemRef = koffi.opaque('EdsDirectoryItemRef');
export const EdsStreamRef = koffi.opaque('EdsStreamRef');
export const EdsImageRef = koffi.opaque('EdsImageRef');
export const EdsEvfImageRef = koffi.opaque('EdsEvfImageRef');

export const EdsPoint = koffi.struct('EdsPoint', {
    x: 'int32_t',
    y: 'int32_t',
});

export const EdsSize = koffi.struct('EdsSize', {
    width: 'int32_t',
    height: 'int32_t',
});

export const EdsRect = koffi.struct('EdsRect', {
    point: EdsPoint,
    size: EdsSize,
});

export const EdsRational = koffi.struct('EdsRational', {
    numerator: 'int32_t',
    denominator: 'uint32_t',
});

export const EdsTime = koffi.struct('EdsTime', {
    year: 'uint32_t',
    month: 'uint32_t',
    day: 'uint32_t',
    hour: 'uint32_t',
    minute: 'uint32_t',
    second: 'uint32_t',
    milliseconds: 'uint32_t',
});

export const EdsDeviceInfo = koffi.struct('EdsDeviceInfo', {
    szPortName: koffi.array('char', 256, 'Buffer'),
    szDeviceDescription: koffi.array('char', 256, 'Buffer'),
    deviceSubType: 'uint32_t',
    reserved: 'uint32_t',
});

export const EdsVolumeInfo = koffi.struct('EdsVolumeInfo', {
    storageType: 'uint32_t',
    access: 'uint32_t',
    maxCapacity: 'uint64_t',
    freeSpaceInBytes: 'uint64_t',
    szVolumeLabel: koffi.array('char', 256, 'Buffer'),
});

export const EdsDirectoryItemInfo = koffi.struct('EdsDirectoryItemInfo', {
    size: 'uint64_t',
    isFolder: 'int32_t',
    groupID: 'uint32_t',
    option: 'uint32_t',
    szFileName: koffi.array('char', 256, 'Buffer'),
    format: 'uint32_t',
    dateTime: 'uint32_t',
});

export const EdsCapacity = koffi.struct('EdsCapacity', {
    numberOfFreeClusters: 'int32_t',
    bytesPerSector: 'int32_t',
    reset: 'int32_t',
});

export const EdsPropertyDesc = koffi.struct('EdsPropertyDesc', {
    form: 'int32_t',
    access: 'int32_t',
    numElements: 'int32_t',
    propDesc: koffi.array('int32_t', 128),
});

export const EdsPictureStyleDesc = koffi.struct('EdsPictureStyleDesc', {
    contrast: 'int32_t',
    sharpness: 'uint32_t',
    saturation: 'int32_t',
    colorTone: 'int32_t',
    filterEffect: 'uint32_t',
    toningEffect: 'uint32_t',
    sharpFineness: 'uint32_t',
    sharpThreshold: 'uint32_t',
});

export const EdsFocusPoint = koffi.struct('EdsFocusPoint', {
    valid: 'uint32_t',
    selected: 'uint32_t',
    justFocus: 'uint32_t',
    rect: EdsRect,
    reserved: 'uint32_t',
});

export const EdsFocusInfo = koffi.struct('EdsFocusInfo', {
    imageRect: EdsRect,
    pointNumber: 'uint32_t',
    focusPoint: koffi.array(EdsFocusPoint, 1053),
    executeMode: 'uint32_t',
});

export const EdsImageInfo = koffi.struct('EdsImageInfo', {
    width: 'uint32_t',
    height: 'uint32_t',
    numOfComponents: 'uint32_t',
    componentDepth: 'uint32_t',
    effectiveRect: EdsRect,
    reserved1: 'uint32_t',
    reserved2: 'uint32_t',
});
