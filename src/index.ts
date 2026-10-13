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
export { ApiError, EdsError, isEdsError } from './api-error.js';
export { CameraProperty, type ICamera, type PropertyName, type PropertyData } from './property.js';
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
    type EventName,
    type EventCallback,
} from './camera.js';
export { CameraFile } from './camera-file.js';
export { LiveViewImage } from './live-view-image.js';
export { Volume } from './volume.js';
export { Directory, type DirectoryEntry } from './directory.js';
export { Stream, type StreamHandlers, type ProgressCallback } from './stream.js';
export { CameraImage, type ImageInfo } from './camera-image.js';
export { FlashSettings } from './flash-settings.js';
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

import * as camera from './camera.js';
import * as property from './property.js';
import * as cameraFile from './camera-file.js';
import * as liveViewImage from './live-view-image.js';
import * as volume from './volume.js';
import * as directory from './directory.js';
import * as stream from './stream.js';
import * as cameraImage from './camera-image.js';
import * as flashSettings from './flash-settings.js';
import * as apiError from './api-error.js';
import * as aperture from './values/aperture.js';
import * as shutterSpeed from './values/shutter-speed.js';
import * as isoSensitivity from './values/iso-sensitivity.js';
import * as exposureCompensation from './values/exposure-compensation.js';
import * as imageQuality from './values/image-quality.js';
import * as outputDevice from './values/output-device.js';
import * as timeZone from './values/time-zone.js';
import * as fileFormat from './values/file-format.js';
import * as flag from './values/flag.js';
import * as option from './values/option.js';
import type * as propertyValue from './values/property-value.js';
import * as apiIdentifier from './values/api-identifier.js';
import * as objectEvent from './values/object-event.js';
import * as stateEvent from './values/state-event.js';

/** Default namespace object exposing the entire public API. */
namespace CameraApi {
    export import Camera = camera.Camera;
    export import CameraBrowser = camera.CameraBrowser;
    export const cameraBrowser = camera.cameraBrowser;
    export const watchCameras = camera.watchCameras;
    export import CameraProperty = property.CameraProperty;
    export import CameraFile = cameraFile.CameraFile;
    export import LiveViewImage = liveViewImage.LiveViewImage;
    export import Volume = volume.Volume;
    export import Directory = directory.Directory;
    export import Stream = stream.Stream;
    export import CameraImage = cameraImage.CameraImage;
    export import FlashSettings = flashSettings.FlashSettings;
    export import ApiError = apiError.ApiError;
    export import EdsError = apiError.EdsError;
    export const isEdsError = apiError.isEdsError;
    export import ApiIdentifier = apiIdentifier.ApiIdentifier;
    export import Aperture = aperture.Aperture;
    export import ShutterSpeed = shutterSpeed.ShutterSpeed;
    export import ISOSensitivity = isoSensitivity.ISOSensitivity;
    export import ExposureCompensation = exposureCompensation.ExposureCompensation;
    export import ImageQuality = imageQuality.ImageQuality;
    export import OutputDevice = outputDevice.OutputDevice;
    export import TimeZone = timeZone.TimeZone;
    export import FileFormat = fileFormat.FileFormat;
    export import Flag = flag.Flag;
    export import Option = option.Option;
    export import ObjectEvent = objectEvent.ObjectEvent;
    export import StateEvent = stateEvent.StateEvent;
    export type CameraDeviceEvent = camera.CameraDeviceEvent;
    export type PropertyChangeEvent = camera.PropertyChangeEvent;
    export type FileChangeEvent = camera.FileChangeEvent;
    export type DirectoryChangeEvent = camera.DirectoryChangeEvent;
    export type VolumeChangeEvent = camera.VolumeChangeEvent;
    export type ObjectChangeEvent = camera.ObjectChangeEvent;
    export type StateChangeEvent = camera.StateChangeEvent;
    export type EventName = camera.EventName;
    export type EventCallback = camera.EventCallback;
    export type PropertyName = property.PropertyName;
    export type PropertyData = property.PropertyData;
    export type PropertyValue = propertyValue.PropertyValue;
    export type StreamHandlers = stream.StreamHandlers;
    export type ProgressCallback = stream.ProgressCallback;
    export type ImageInfo = cameraImage.ImageInfo;
}

export default CameraApi;
