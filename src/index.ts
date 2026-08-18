/**
 * Public API for `canon-edsdk-ffi`.
 *
 * This package wraps the Canon EOS Digital SDK (EDSDK) with a high-level,
 * event-driven camera API. The default export (`CameraApi`) and all named
 * exports are stable entry points for applications.
 */

export {
    loadEdsdkLibrary,
    getEdsdkLibrary,
    findLibraryPath,
    getSearchPaths,
    loadEdsImageLibrary,
    getEdsImageLibrary,
} from './ffi/library-loader.js';
export * as edsdkConstants from './ffi/constants.js';
export * as edsdkDefinitions from './ffi/definitions.js';
export { edsdk, call, type EdsFunctions } from './ffi/functions.js';
export { ApiError } from './api-error.js';
export { CameraProperty, type ICamera } from './property.js';
export {
    Camera,
    CameraBrowser,
    cameraBrowser,
    watchCameras,
    type CameraDeviceEvent,
    type PropertyChangeEvent,
    type FileChangeEvent,
    type DirectoryChangeEvent,
    type VolumeChangeEvent,
    type ObjectChangeEvent,
    type StateChangeEvent,
    type EventCallback,
} from './camera.js';
export { CameraFile } from './camera-file.js';
export { LiveViewImage } from './live-view-image.js';
export { Volume } from './volume.js';
export { Directory, type DirectoryEntry } from './directory.js';
export { Aperture } from './values/aperture.js';
export { ShutterSpeed } from './values/shutter-speed.js';
export { ISOSensitivity } from './values/iso-sensitivity.js';
export { ExposureCompensation } from './values/exposure-compensation.js';
export { ImageQuality } from './values/image-quality.js';
export { OutputDevice } from './values/output-device.js';
export { TimeZone } from './values/time-zone.js';
export { FileFormat } from './values/file-format.js';
export { Flag } from './values/flag.js';
export { Option } from './values/option.js';
export { type PropertyValue } from './values/property-value.js';
export { ApiIdentifier } from './values/api-identifier.js';
export { ObjectEvent } from './values/object-event.js';
export { StateEvent } from './values/state-event.js';

import { Camera, CameraBrowser, cameraBrowser, watchCameras } from './camera.js';
import { CameraProperty } from './property.js';
import { CameraFile } from './camera-file.js';
import { LiveViewImage } from './live-view-image.js';
import { Volume } from './volume.js';
import { Directory } from './directory.js';
import { ApiError } from './api-error.js';
import { Aperture } from './values/aperture.js';
import { ShutterSpeed } from './values/shutter-speed.js';
import { ISOSensitivity } from './values/iso-sensitivity.js';
import { ExposureCompensation } from './values/exposure-compensation.js';
import { ImageQuality } from './values/image-quality.js';
import { OutputDevice } from './values/output-device.js';
import { TimeZone } from './values/time-zone.js';
import { FileFormat } from './values/file-format.js';
import { Flag } from './values/flag.js';
import { Option } from './values/option.js';
import { ApiIdentifier } from './values/api-identifier.js';
import { ObjectEvent } from './values/object-event.js';
import { StateEvent } from './values/state-event.js';

/** Default namespace object exposing the entire public API. */
const CameraApi = {
    Camera,
    CameraBrowser,
    CameraProperty,
    CameraFile,
    LiveViewImage,
    Volume,
    Directory,
    ApiError,
    ApiIdentifier,
    Aperture,
    ShutterSpeed,
    ISOSensitivity,
    ExposureCompensation,
    ImageQuality,
    OutputDevice,
    TimeZone,
    FileFormat,
    Flag,
    Option,
    ObjectEvent,
    StateEvent,
    cameraBrowser,
    watchCameras,
};

export default CameraApi;
