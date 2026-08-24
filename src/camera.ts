import koffi from 'koffi';
import {
    edsdk,
    EdsStateEventHandler,
    EdsPropertyEventHandler,
    EdsObjectEventHandler,
    EdsCameraAddedHandler,
    createOutputPointer,
    readOutputPointer,
    freeOutputPointer,
} from './ffi/functions.js';
import {
    ErrorCode,
    PropertyID,
    CameraCommand,
    CameraStatusCommand,
    ShutterButton,
    PropertyEvent,
    ObjectEvent,
    StateEvent,
    EvfOutputDevice,
} from './ffi/constants.js';
import { EdsDeviceInfo, EdsDirectoryItemInfo } from './ffi/definitions.js';
import { ApiError } from './api-error.js';
import { CameraProperty, type ICamera } from './property.js';
import { CameraFile } from './camera-file.js';
import { LiveViewImage } from './live-view-image.js';
import { Volume } from './volume.js';
import { Directory } from './directory.js';
import { ObjectEvent as ObjectEventValue } from './values/object-event.js';
import { StateEvent as StateEventValue } from './values/state-event.js';

function throwIfError(code: number): void {
    if (code !== ErrorCode.OK) {
        throwError(code);
    }
}

function throwError(code: number): never {
    const apiError = new ApiError(code);
    const err = new Error(`EDSDK error: ${apiError.label}`) as any;
    err.EDS_ERROR = apiError;
    throw err;
}

function readString(buf: Buffer): string {
    return buf.toString('utf-8').split('\0')[0] ?? '';
}

export interface CameraDeviceEvent {
    camera: Camera;
}

export interface PropertyChangeEvent extends CameraDeviceEvent {
    property: CameraProperty;
}

export interface FileChangeEvent extends CameraDeviceEvent {
    file: CameraFile;
}

export interface DirectoryChangeEvent extends CameraDeviceEvent {
    directory: Directory;
}

export interface VolumeChangeEvent extends CameraDeviceEvent {
    volume: Volume;
}

export interface ObjectChangeEvent extends CameraDeviceEvent {
    objectEvent: ObjectEventValue;
}

export interface StateChangeEvent extends CameraDeviceEvent {
    stateEvent: StateEventValue;
}

export type EventCallback = (eventName: string, event: CameraDeviceEvent | ApiError) => void;

/**
 * Represents a single Canon camera connected to the host PC.
 *
 * A `Camera` wraps an underlying `EdsCameraRef` and provides a high-level API
 * for opening a session, reading and writing camera properties, sending
 * commands (such as taking a picture), controlling live view, and navigating
 * the memory card volumes.
 */
export class Camera implements ICamera {
    [Symbol.toStringTag] = 'Camera';

    private ref_!: any;
    private browser_!: CameraBrowser;
    private description_ = '';
    private portName_ = '';
    private connected_ = false;
    private shouldKeepAlive_ = false;
    private hasActiveLiveView_ = false;
    private isLegacy_ = false;
    private eventHandler_?: EventCallback;

    private stateCallback_?: bigint;
    private propertyCallback_?: bigint;
    private objectCallback_?: bigint;

    static readonly EventName: Record<
        | 'CameraConnect'
        | 'CameraDisconnect'
        | 'StateChange'
        | 'KeepAlive'
        | 'LiveViewStart'
        | 'LiveViewStop'
        | 'PropertyChangeOptions'
        | 'PropertyChangeValue'
        | 'DownloadRequest'
        | 'FileCreate'
        | 'DirectoryCreate'
        | 'VolumeChange'
        | 'ObjectChange'
        | 'Error',
        string
    > = {
        CameraConnect: 'CameraConnect',
        CameraDisconnect: 'CameraDisconnect',
        DirectoryCreate: 'DirectoryCreate',
        DownloadRequest: 'DownloadRequest',
        Error: 'Error',
        FileCreate: 'FileCreate',
        KeepAlive: 'KeepAlive',
        LiveViewStart: 'LiveViewStart',
        LiveViewStop: 'LiveViewStop',
        ObjectChange: 'ObjectChange',
        PropertyChangeOptions: 'PropertyChangeOptions',
        PropertyChangeValue: 'PropertyChangeValue',
        StateChange: 'StateChange',
        VolumeChange: 'VolumeChange',
    };

    static readonly Command: Record<
        | 'MovieSelectSwON'
        | 'SetRemoteShootingMode'
        | 'TakePicture'
        | 'DoEvfAf'
        | 'ExtendShutDownTimer'
        | 'RequestRollPitchLevel'
        | 'BulbStart'
        | 'BulbEnd'
        | 'DoClickWBEvf'
        | 'PressShutterButton'
        | 'DriveLensEvf'
        | 'MovieSelectSwOFF'
        | 'DrivePowerZoom'
        | 'RequestSensorCleaning',
        number
    > = {
        BulbEnd: 3,
        BulbStart: 2,
        DoClickWBEvf: 260,
        DoEvfAf: 258,
        DriveLensEvf: 259,
        DrivePowerZoom: 269,
        ExtendShutDownTimer: 1,
        MovieSelectSwOFF: 264,
        MovieSelectSwON: 263,
        PressShutterButton: 4,
        RequestRollPitchLevel: 265,
        RequestSensorCleaning: 274,
        SetRemoteShootingMode: 271,
        TakePicture: 0,
    };

    static readonly PressShutterButton: Record<
        'HalfwayNonAF' | 'OFF' | 'Halfway' | 'Completely' | 'CompletelyNonAF',
        number
    > = {
        Completely: 3,
        CompletelyNonAF: 65539,
        Halfway: 1,
        HalfwayNonAF: 65537,
        OFF: 0,
    };

    /**
     * Creates a `Camera` instance.
     *
     * @param indexOrPort - An EDSDK camera reference (bigint), a port name
     *   string, or a numeric index into the currently enumerated camera list.
     * @param browser - Optional `CameraBrowser` to associate with this camera.
     *   A singleton browser is created automatically when omitted.
     */
    constructor(indexOrPort: number | string | bigint = 0, browser?: CameraBrowser) {
        if (typeof indexOrPort === 'bigint') {
            this.ref_ = indexOrPort;
            this.browser_ = browser ?? new CameraBrowser();
            this.initialize_();
            return;
        }

        const existing = cameraBrowser.getCamera(indexOrPort, false);
        if (!existing) {
            throwError(ErrorCode.DEVICE_NOT_FOUND);
        }
        return existing;
    }

    private initialize_() {
        const info = koffi.alloc(EdsDeviceInfo, 1);
        try {
            throwIfError(edsdk.EdsGetDeviceInfo(this.ref_, info));
            const decoded = koffi.decode(info, 'EdsDeviceInfo');
            this.description_ = readString(decoded.szDeviceDescription);
            this.portName_ = readString(decoded.szPortName);
        } finally {
            koffi.free(info);
        }

        this.stateCallback_ = koffi.register(
            (inEvent: number, inEventData: number, _inContext: any) => this.handleStateEvent_(inEvent, inEventData),
            koffi.pointer(EdsStateEventHandler),
        );
        throwIfError(edsdk.EdsSetCameraStateEventHandler(this.ref_, StateEvent.All, this.stateCallback_, 0n));

        this.propertyCallback_ = koffi.register(
            (inEvent: number, inPropertyID: number, inParam: number, _inContext: any) =>
                this.handlePropertyEvent_(inEvent, inPropertyID, inParam),
            koffi.pointer(EdsPropertyEventHandler),
        );
        throwIfError(edsdk.EdsSetPropertyEventHandler(this.ref_, PropertyEvent.All, this.propertyCallback_, 0n));

        this.objectCallback_ = koffi.register(
            (inEvent: number, inRef: any, _inContext: any) => this.handleObjectEvent_(inEvent, inRef),
            koffi.pointer(EdsObjectEventHandler),
        );
        throwIfError(edsdk.EdsSetObjectEventHandler(this.ref_, ObjectEvent.All, this.objectCallback_, 0n));

        this.browser_.addCamera(this);
    }

    /** Returns the underlying EDSDK camera reference as an opaque pointer. */
    getEdsReference(): any {
        return this.ref_;
    }

    /** The camera model description, such as "Canon EOS R6". */
    get description(): string {
        return this.description_;
    }

    /** The camera port name, typically identifying the USB connection. */
    get portName(): string {
        return this.portName_;
    }

    /** Registers an event callback for camera-specific events. */
    setEventHandler(listener: EventCallback) {
        this.eventHandler_ = listener;
    }

    /**
     * Opens a session with the camera.
     *
     * Opening a session is required before sending commands, reading or writing
     * properties, or transferring files.
     *
     * @param shouldKeepAlive - When `true`, the camera is periodically nudged
     *   to prevent automatic shut-down.
     */
    connect(shouldKeepAlive = false) {
        if (this.connected_) {
            return;
        }
        this.shouldKeepAlive_ = shouldKeepAlive;
        throwIfError(edsdk.EdsOpenSession(this.ref_));
        this.connected_ = true;
        this.emit_('CameraConnect', { camera: this });
    }

    /** Closes the camera session. */
    disconnect() {
        if (!this.connected_) {
            return;
        }
        try {
            this.stopLiveView();
        } catch {
            // ignore
        }
        throwIfError(edsdk.EdsCloseSession(this.ref_));
        this.connected_ = false;
        this.emit_('CameraDisconnect', { camera: this });
    }

    /** Releases the camera reference and unregisters all callbacks. */
    dispose() {
        if (this.ref_ === 0n || this.ref_ === undefined) {
            return;
        }
        try {
            this.disconnect();
        } catch {
            // ignore
        }
        try {
            edsdk.EdsSetCameraStateEventHandler(this.ref_, StateEvent.All, 0n, 0n);
            edsdk.EdsSetPropertyEventHandler(this.ref_, PropertyEvent.All, 0n, 0n);
            edsdk.EdsSetObjectEventHandler(this.ref_, ObjectEvent.All, 0n, 0n);
        } catch {
            // ignore
        }
        if (this.stateCallback_ !== undefined) {
            koffi.unregister(this.stateCallback_);
            this.stateCallback_ = undefined;
        }
        if (this.propertyCallback_ !== undefined) {
            koffi.unregister(this.propertyCallback_);
            this.propertyCallback_ = undefined;
        }
        if (this.objectCallback_ !== undefined) {
            koffi.unregister(this.objectCallback_);
            this.objectCallback_ = undefined;
        }
        try {
            edsdk.EdsRelease(this.ref_);
        } catch {
            // ignore
        }
        this.ref_ = 0n;
    }

    /**
     * Creates an accessor for a camera property.
     *
     * @param propertyID - A property name, such as `"Av"`, or a raw EDSDK
     *   property ID.
     * @param specifier - Optional property specifier (used for array-like
     *   properties such as drive mode).
     */
    getProperty(propertyID: string | number, specifier = 0): CameraProperty {
        const id = CameraProperty.getIDFor(propertyID);
        if (id === undefined) {
            throwError(ErrorCode.INVALID_PARAMETER);
        }
        return new CameraProperty(this, id, specifier);
    }

    /** Sets a single camera property. */
    setProperty(propertyID: string | number, value: any, specifier = 0) {
        const prop = this.getProperty(propertyID, specifier);
        prop.value = value;
    }

    /** Sets multiple camera properties from a key/value record. */
    setProperties(properties: Record<string | number, any>) {
        for (const [key, value] of Object.entries(properties)) {
            this.setProperty(key, value);
        }
    }

    /**
     * Sends a low-level camera command.
     *
     * @param command - A `CameraCommand` value.
     * @param parameter - Command-specific parameter.
     */
    sendCommand(command: number, parameter = 0) {
        if (!this.connected_) {
            throwIfError(ErrorCode.SESSION_NOT_OPEN);
        }
        throwIfError(edsdk.EdsSendCommand(this.ref_, command, parameter));
    }

    /**
     * Captures an image.
     *
     * Modern cameras use a press-shutter-button sequence. Older models fall back
     * to the legacy `TakePicture` command with a temporary UI lock.
     */
    takePicture() {
        if (!this.connected_) {
            throwIfError(ErrorCode.SESSION_NOT_OPEN);
        }
        let error: number = ErrorCode.OK;
        if (!this.isLegacy_) {
            error = edsdk.EdsSendCommand(this.ref_, CameraCommand.PressShutterButton, ShutterButton.Halfway);
            if (error === ErrorCode.OK) {
                error = edsdk.EdsSendCommand(this.ref_, CameraCommand.PressShutterButton, ShutterButton.Completely);
            }
            if (error === ErrorCode.OK) {
                error = edsdk.EdsSendCommand(this.ref_, CameraCommand.PressShutterButton, ShutterButton.OFF);
            }
        }
        if (this.isLegacy_ || error === ErrorCode.INVALID_PARAMETER) {
            this.isLegacy_ = true;
            edsdk.EdsSendStatusCommand(this.ref_, CameraStatusCommand.UILock, 0);
            error = edsdk.EdsSendCommand(this.ref_, CameraCommand.TakePicture, 0);
            edsdk.EdsSendStatusCommand(this.ref_, CameraStatusCommand.UIUnLock, 0);
        }
        throwIfError(error);
    }

    /** Locks the camera UI so only host PC commands are accepted. */
    lockUI() {
        if (!this.connected_) {
            throwIfError(ErrorCode.SESSION_NOT_OPEN);
        }
        throwIfError(edsdk.EdsSendStatusCommand(this.ref_, CameraStatusCommand.UILock, 0));
    }

    /** Releases the camera UI lock, allowing camera-side controls again. */
    unlockUI() {
        if (!this.connected_) {
            throwIfError(ErrorCode.SESSION_NOT_OPEN);
        }
        throwIfError(edsdk.EdsSendStatusCommand(this.ref_, CameraStatusCommand.UIUnLock, 0));
    }

    /** Enables live view output to the PC by setting the EVF output device. */
    startLiveView() {
        if (!this.connected_) {
            throwIfError(ErrorCode.SESSION_NOT_OPEN);
        }
        const prop = this.getProperty(PropertyID.Evf_OutputDevice);
        const current = prop.value as number | { value: number };
        const currentValue = typeof current === 'number' ? current : (current as any).value;
        const nextValue = currentValue | EvfOutputDevice.PC;
        prop.value = nextValue;
    }

    /** Disables live view output to the PC. */
    stopLiveView() {
        if (!this.connected_) {
            throwIfError(ErrorCode.SESSION_NOT_OPEN);
        }
        const prop = this.getProperty(PropertyID.Evf_OutputDevice);
        const current = prop.value as number | { value: number };
        const currentValue = typeof current === 'number' ? current : (current as any).value;
        const nextValue = currentValue & ~EvfOutputDevice.PC;
        if (nextValue !== currentValue) {
            prop.value = nextValue;
        }
    }

    /** Returns `true` when live view output is currently active. */
    isLiveViewActive(): boolean {
        return this.hasActiveLiveView_;
    }

    /** Downloads the current live view frame as a base64 JPEG data URL. */
    downloadLiveViewImage(): string | undefined {
        const img = this.getLiveViewImage();
        return img ? img.getDataURL() : undefined;
    }

    /** Creates a `LiveViewImage` for the current live view frame. */
    getLiveViewImage(): LiveViewImage | undefined {
        if (!this.hasActiveLiveView_) {
            return undefined;
        }
        return new LiveViewImage(this);
    }

    /** Returns the memory card volumes available on the connected camera. */
    getVolumes(): Volume[] {
        if (!this.connected_) {
            throwIfError(ErrorCode.SESSION_NOT_OPEN);
        }
        const count: [number] = [0];
        throwIfError(edsdk.EdsGetChildCount(this.ref_, count));
        const volumes: Volume[] = [];
        for (let i = 0; i < count[0]; i++) {
            const refPtr = createOutputPointer();
            throwIfError(edsdk.EdsGetChildAtIndex(this.ref_, i, refPtr));
            const ref = readOutputPointer(refPtr);
            freeOutputPointer(refPtr);
            try {
                volumes.push(new Volume(ref));
            } finally {
                edsdk.EdsRelease(ref);
            }
        }
        return volumes;
    }

    private updateLiveViewStatus_(): boolean {
        try {
            const prop = this.getProperty(PropertyID.Evf_OutputDevice);
            const current = prop.value as number | { value: number };
            const device = typeof current === 'number' ? current : (current as any).value;
            const active = (device & EvfOutputDevice.PC) === EvfOutputDevice.PC;
            if (active !== this.hasActiveLiveView_) {
                this.hasActiveLiveView_ = active;
                this.emit_(active ? 'LiveViewStart' : 'LiveViewStop', { camera: this });
            }
            return active;
        } catch {
            return this.hasActiveLiveView_;
        }
    }

    private emit_(eventName: string, event: any) {
        if (this.eventHandler_) {
            try {
                this.eventHandler_(eventName, event);
            } catch {
                // ignore user handler errors
            }
        }
        this.browser_.emitEvent(eventName, event);
    }

    private emitError_(err: any) {
        const apiError = err?.EDS_ERROR as ApiError | undefined;
        if (apiError) {
            this.emit_('Error', apiError);
        }
    }

    private handleStateEvent_(inEvent: number, _inEventData: number): number {
        try {
            if (inEvent === StateEvent.Shutdown) {
                this.disconnect();
                this.browser_.removeCamera(this);
                this.dispose();
                return ErrorCode.OK;
            }
            if (inEvent === StateEvent.WillSoonShutDown) {
                if (this.connected_ && this.shouldKeepAlive_) {
                    this.sendCommand(CameraCommand.ExtendShutDownTimer, 0);
                    this.emit_('KeepAlive', { camera: this });
                    return ErrorCode.OK;
                }
            }
            this.emit_('StateChange', {
                camera: this,
                stateEvent: new StateEventValue(inEvent),
            });
        } catch (err) {
            this.emitError_(err);
        }
        return ErrorCode.OK;
    }

    private handlePropertyEvent_(inEvent: number, inPropertyID: number, inParam: number): number {
        try {
            if (inPropertyID === PropertyID.Evf_OutputDevice) {
                this.updateLiveViewStatus_();
            }
            const eventName =
                inEvent === PropertyEvent.PropertyDescChanged || inEvent === PropertyEvent.PropertyDescExChanged
                    ? 'PropertyChangeOptions'
                    : 'PropertyChangeValue';
            this.emit_(eventName, {
                camera: this,
                property: new CameraProperty(this, inPropertyID, inParam),
            });
        } catch (err) {
            this.emitError_(err);
        }
        return ErrorCode.OK;
    }

    private handleObjectEvent_(inEvent: number, inRef: any): number {
        try {
            let eventName: string | undefined;
            let data: any;
            switch (inEvent) {
                case ObjectEvent.DirItemRequestTransfer: {
                    eventName = 'DownloadRequest';
                    data = { file: new CameraFile(inRef) };
                    break;
                }
                case ObjectEvent.DirItemCreated: {
                    const info = koffi.alloc(EdsDirectoryItemInfo, 1);
                    try {
                        if (edsdk.EdsGetDirectoryItemInfo(inRef, info) === ErrorCode.OK) {
                            const decoded = koffi.decode(info, 'EdsDirectoryItemInfo');
                            if (decoded.isFolder) {
                                eventName = 'DirectoryCreate';
                                data = { directory: new Directory(inRef) };
                            } else {
                                eventName = 'FileCreate';
                                data = { file: new CameraFile(inRef) };
                            }
                        }
                    } finally {
                        koffi.free(info);
                    }
                    break;
                }
                default: {
                    eventName = 'ObjectChange';
                    data = { objectEvent: new ObjectEventValue(inEvent) };
                }
            }
            if (eventName) {
                this.emit_(eventName, { camera: this, ...data });
            }
        } catch (err) {
            this.emitError_(err);
        } finally {
            try {
                edsdk.EdsRelease(inRef);
            } catch {
                // ignore
            }
        }
        return ErrorCode.OK;
    }
}

/**
 * Manages the EDSDK lifecycle and camera enumeration.
 *
 * The `CameraBrowser` initializes and terminates the SDK, keeps a list of
 * connected cameras, and dispatches events from the camera to registered
 * listeners. Use `watchCameras` to poll for events automatically.
 */
export class CameraBrowser {
    [Symbol.toStringTag] = 'CameraBrowser';

    private static instance_?: CameraBrowser;
    private initialized_ = false;
    private cameras_: Camera[] = [];
    private eventHandler_?: EventCallback;
    private cameraAddedCallback_?: bigint;

    static readonly EventName: Record<
        | 'CameraAdd'
        | 'CameraRemove'
        | 'CameraConnect'
        | 'CameraDisconnect'
        | 'StateChange'
        | 'KeepAlive'
        | 'LiveViewStart'
        | 'LiveViewStop'
        | 'PropertyChangeOptions'
        | 'PropertyChangeValue'
        | 'DownloadRequest'
        | 'FileCreate'
        | 'DirectoryCreate'
        | 'VolumeChange'
        | 'ObjectChange'
        | 'Error',
        string
    > = {
        CameraAdd: 'CameraAdd',
        CameraConnect: 'CameraConnect',
        CameraDisconnect: 'CameraDisconnect',
        CameraRemove: 'CameraRemove',
        DirectoryCreate: 'DirectoryCreate',
        DownloadRequest: 'DownloadRequest',
        Error: 'Error',
        FileCreate: 'FileCreate',
        KeepAlive: 'KeepAlive',
        LiveViewStart: 'LiveViewStart',
        LiveViewStop: 'LiveViewStop',
        ObjectChange: 'ObjectChange',
        PropertyChangeOptions: 'PropertyChangeOptions',
        PropertyChangeValue: 'PropertyChangeValue',
        StateChange: 'StateChange',
        VolumeChange: 'VolumeChange',
    };

    constructor() {
        if (CameraBrowser.instance_) {
            return CameraBrowser.instance_;
        }
        CameraBrowser.instance_ = this;
    }

    addCamera(camera: Camera) {
        if (!this.cameras_.some((c) => c.getEdsReference() === camera.getEdsReference())) {
            this.cameras_.push(camera);
        }
    }

    removeCamera(camera: Camera) {
        const idx = this.cameras_.findIndex((c) => c.getEdsReference() === camera.getEdsReference());
        if (idx >= 0) {
            this.cameras_.splice(idx, 1);
            this.emit_('CameraRemove', { camera });
        }
    }

    /** Registers a global event callback for all browser and camera events. */
    setEventHandler(listener: EventCallback) {
        this.eventHandler_ = listener;
    }

    /** Initializes the EDSDK, registers the camera-added callback, and enumerates cameras. */
    initialize() {
        if (this.initialized_) {
            return;
        }
        throwIfError(edsdk.EdsInitializeSDK());
        this.cameraAddedCallback_ = koffi.register((_inContext: any) => {
            this.enumerateCameraList();
            return ErrorCode.OK;
        }, koffi.pointer(EdsCameraAddedHandler));
        throwIfError(edsdk.EdsSetCameraAddedHandler(this.cameraAddedCallback_, 0n));
        this.initialized_ = true;
        this.enumerateCameraList();
    }

    /** Terminates the EDSDK and releases all tracked cameras. */
    terminate() {
        if (!this.initialized_) {
            return;
        }
        for (const camera of this.cameras_) {
            try {
                camera.disconnect();
            } catch {
                // ignore
            }
            try {
                camera.dispose();
            } catch {
                // ignore
            }
        }
        this.cameras_ = [];
        try {
            edsdk.EdsSetCameraAddedHandler(0n, 0n);
        } catch {
            // ignore
        }
        if (this.cameraAddedCallback_ !== undefined) {
            koffi.unregister(this.cameraAddedCallback_);
            this.cameraAddedCallback_ = undefined;
        }
        throwIfError(edsdk.EdsTerminateSDK());
        this.initialized_ = false;
    }

    /** Processes the EDSDK event queue. Call regularly or use `watchCameras`. */
    triggerEvents() {
        try {
            edsdk.EdsGetEvent();
        } catch {
            // ignore
        }
    }

    /**
     * Returns a connected camera by index or port name.
     *
     * @param at - A numeric index or a port name.
     * @param exactOnly - When `false` (default), the first camera is returned
     *   if the requested camera is not found.
     */
    getCamera(at: string | number = 0, exactOnly = false): Camera | undefined {
        this.initialize();
        let camera: Camera | undefined;
        if (typeof at === 'number') {
            camera = this.cameras_[at];
        } else {
            camera = this.cameras_.find((c) => c.portName === at);
        }
        if (!camera && !exactOnly) {
            camera = this.cameras_[0];
        }
        return camera;
    }

    /** Returns a snapshot of the currently known cameras. */
    getCameras(): Camera[] {
        this.initialize();
        return this.cameras_.slice();
    }

    /** Re-enumerates the connected camera list. */
    update() {
        this.enumerateCameraList();
    }

    private enumerateCameraList() {
        if (!this.initialized_) {
            return;
        }
        const listPtr = createOutputPointer();
        try {
            if (edsdk.EdsGetCameraList(listPtr) !== ErrorCode.OK) {
                return;
            }
            const listRef = readOutputPointer(listPtr);
            const count: [number] = [0];
            if (edsdk.EdsGetChildCount(listRef, count) !== ErrorCode.OK) {
                return;
            }
            const currentRefs: any[] = [];
            for (let i = 0; i < count[0]; i++) {
                const refPtr = createOutputPointer();
                if (edsdk.EdsGetChildAtIndex(listRef, i, refPtr) === ErrorCode.OK) {
                    currentRefs.push(readOutputPointer(refPtr));
                }
                freeOutputPointer(refPtr);
            }

            for (const camera of [...this.cameras_]) {
                if (!currentRefs.some((r) => r === camera.getEdsReference())) {
                    this.removeCamera(camera);
                    try {
                        camera.dispose();
                    } catch {
                        // ignore
                    }
                }
            }

            for (const ref of currentRefs) {
                if (!this.cameras_.some((c) => c.getEdsReference() === ref)) {
                    try {
                        new Camera(ref, this);
                        this.emit_('CameraAdd', {
                            camera: this.cameras_[this.cameras_.length - 1],
                        });
                    } catch {
                        try {
                            edsdk.EdsRelease(ref);
                        } catch {
                            // ignore
                        }
                    }
                } else {
                    try {
                        edsdk.EdsRelease(ref);
                    } catch {
                        // ignore
                    }
                }
            }
        } finally {
            const listRef = readOutputPointer(listPtr);
            freeOutputPointer(listPtr);
            if (listRef !== 0n && listRef !== null) {
                try {
                    edsdk.EdsRelease(listRef);
                } catch {
                    // ignore
                }
            }
        }
    }

    private emit_(eventName: string, event: any) {
        if (this.eventHandler_) {
            try {
                this.eventHandler_(eventName, event);
            } catch {
                // ignore user handler errors
            }
        }
    }

    public emitEvent(eventName: string, event: any) {
        this.emit_(eventName, event);
    }
}

/** Singleton `CameraBrowser` instance. */
export const cameraBrowser = new CameraBrowser();

/**
 * Starts a background interval that pumps the EDSDK event queue.
 *
 * @param timeout - Interval in milliseconds between event pumps.
 * @returns A function that stops the interval when called.
 */
export function watchCameras(timeout = 1000): () => void {
    let running = true;
    const id = setInterval(() => {
        if (running) {
            cameraBrowser.triggerEvents();
        }
    }, timeout);
    return () => {
        running = false;
        clearInterval(id);
    };
}
