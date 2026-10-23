# canon-edsdk-ffi

A modern TypeScript wrapper for the Canon EOS Digital SDK (EDSDK) using
[Koffi](https://koffi.dev/) for runtime FFI. It discovers and loads Canon's
SDK libraries from the host system and exposes a high-level, async,
event-emitter-oriented camera API.

## Canon SDK binaries are not included

This package does **not** redistribute Canon EDSDK binaries. Obtain the SDK
from the [Canon Developer Community](https://developercommunity.usa.canon.com/s/)
and make the runtime library available in one of these ways:

- copy it into your application's working directory, or
- set the `EDSDK_PATH` environment variable to the library file or the
  directory containing it, or
- place the Canon SDK archives in `vendor/sdk/` and run
  `npm run vendor:sync` (see [Vendor SDK layout](#vendor-sdk-layout)).

The file names searched for each platform are listed under
[Library discovery](#library-discovery).

## Installation

The package is not published to npm; install it directly from this repository:

```bash
npm install git+https://github.com/snowday-software/canon-edsdk-ffi.git
```

Installing from git runs the package's `prepare` script to build `dist/`,
so make sure your package manager is configured to allow dependency build
scripts for this package.

Or install from a local checkout:

```bash
npm install file:path/to/canon-edsdk-ffi
```

Koffi ships prebuilt binaries for most platforms. If yours isn't covered,
see the [Koffi documentation](https://koffi.dev/) for the platform support
matrix and building from source.

## Requirements

- Node.js `>= 18`
- The Canon EDSDK runtime library (see above)

## Usage

```ts
import EDSDK from 'canon-edsdk-ffi';

EDSDK.cameraBrowser.setEventHandler((eventName, event) => {
    if ('camera' in event) {
        console.log(`[Event] ${eventName} - ${event.camera.description}`);
    } else {
        console.log(`[Error] ${eventName} - ${event.label}`);
    }
});

try {
    EDSDK.cameraBrowser.initialize();
    const cameras = EDSDK.cameraBrowser.getCameras();
    console.log(
        'Cameras:',
        cameras.map((c) => c.description),
    );

    const camera = EDSDK.cameraBrowser.getCamera();
    if (camera) {
        camera.connect();
        console.log('Connected to:', camera.description, 'on', camera.portName);

        // Example: set save target to host
        camera.setProperties({
            [EDSDK.CameraProperty.ID.SaveTo]: EDSDK.Option.SaveTo.Host,
        });

        // Poll SDK events every 50ms
        const stop = EDSDK.watchCameras(50);

        // Take a picture after 2 seconds
        setTimeout(() => {
            console.log('Taking picture...');
            camera.takePicture();
        }, 2000);

        // Clean up after 10 seconds
        setTimeout(() => {
            stop();
            camera.disconnect();
            EDSDK.cameraBrowser.terminate();
        }, 10000);
    }
} catch (err) {
    console.error('EDSDK failed:', err);
    process.exit(1);
}
```

A runnable example that connects to a camera, takes a picture, and downloads
it to `tmp/` is at `examples/picture-test.ts`:

```bash
npm run example:picture-test
```

## Library discovery

At runtime the package searches the following locations, in order:

1. `EDSDK_PATH` — a path to the library file or the directory containing it
2. the current working directory
3. `vendor/bin` under the working directory

Only the current platform's file names are searched, so binaries for
multiple platforms can coexist in `vendor/bin` without being picked up by
the wrong loader:

| Platform | EDSDK                                 | EdsImage                                                                   |
| -------- | ------------------------------------- | -------------------------------------------------------------------------- |
| Windows  | `EDSDK.dll`                           | `EdsImage.dll`                                                             |
| Linux    | `libEDSDK.so`                         | `libEdsImage.so`                                                           |
| macOS    | `EDSDK.framework/{,Versions/A/}EDSDK` | `…/EdsImage.bundle/Contents/MacOS/EdsImage`, `EdsImage.framework/EdsImage` |

`EdsImage` is a companion library used for camera image processing; it is
optional and not shipped with the Linux SDK. On macOS it is searched inside
`EDSDK.framework/Versions/A/EdsImage.bundle` first, since that is where the
Macintosh SDK ships it.

### macOS requires the framework bundle

The macOS EDSDK cannot run as a bare binary: its code signature seals the
framework's `Info.plist`, so a standalone copy fails `dlopen` with
"code signature invalid", and the SDK resolves its own bundle at runtime —
a flat `EDSDK` file crashes `EdsInitializeSDK`. Flat binaries are therefore
not searched at all on macOS; keep the bundle layout (`EDSDK.framework/…`)
produced by `vendor:sync`. `EDSDK_PATH` may point at the `EDSDK.framework`
directory, a directory containing it, or the binary inside it.

## Vendor SDK layout

Since Canon EDSDK downloads are not redistributable, place the SDK archives
in `vendor/sdk/` and run:

```bash
npm run vendor:sync
```

The script extracts every `*.zip` in `vendor/sdk/` into a directory named
after the archive (skipping ones already extracted; pass `--force` to
re-extract) and expands the `Macintosh.dmg` nested inside the Macintosh SDK.
Extraction uses a bundled 7-Zip binary — no system tools or mounts are
required, so it works on any host OS. To extract a single archive:

```bash
npm run vendor:sync -- /path/to/EDSDK_v13.20.21_Windows.zip
```

The script then copies the runtime libraries for **all** platforms into the
flat `vendor/bin/` directory. Since the file names never collide across
platforms, binaries for every target can coexist — e.g. when assembling a
multi-platform artifact in CI. Windows (`EDSDK_64` vs `EDSDK`) and Linux
(`x86_64`/`ARM64`/`ARM32`) architecture choices follow `process.arch` of the
machine running the script. The Linux SDK ships no `libEdsImage.so`, so that
warning is expected. You can also copy the files into `vendor/bin/` manually
instead of using the script.

When a Macintosh SDK is extracted, `EDSDK.framework` is additionally copied
into `vendor/bin/` wholesale — on macOS the SDK only works inside its
bundle (see [Library discovery](#library-discovery)). The copy preserves
Canon's original signature and directory structure.

## API overview

- `Camera` — connect, disconnect, get/set properties, send commands and status
  commands, capture pictures (including bulb and shutter-button control),
  control live view and EVF frame points, enumerate volumes, transfer camera
  settings (CSD) data, manage flash settings, format volumes, set host
  capacity, and drive power-zoom lenses.
- `CameraBrowser` — SDK lifecycle, camera enumeration, event dispatch.
- `CameraFile` — download captured images and thumbnails to paths, streams,
  or buffers; read/write file attributes and metadata; delete items; walk to
  the parent volume/folder.
- `LiveViewImage` — create and download EVF (live view) frames as JPEG
  bytes or data URLs; read zoom, histogram, and coordinate properties.
- `Volume` / `Directory` — navigate, format, and manage camera storage,
  including file attributes and parent traversal.
- `Stream` — file streams (`openFile`, `openFileEx`), memory streams
  (`inMemory`, `fromBuffer`), custom callback streams (`fromHandlers`),
  seek/read/write/copy, and progress callbacks.
- `CameraImage` — open images from files, buffers, or streams; query image
  info; extract regions in a target format; access image properties.
- `FlashSettings` — access flash-related properties via `EdsFlashRef`.
- `CameraProperty` and value classes (`Aperture`, `ShutterSpeed`,
  `ISOSensitivity`, `ExposureCompensation`, `ImageQuality`, `Option`, etc.).
- `watchCameras` — simple interval-based SDK event pump.
- `edsdkConstants` — generated constants for every EDSDK enum group
  (`PropertyID`, `ErrorCode`, `AEMode`, `WhiteBalance`, `ImageType`,
  `ObjectFormat`, `EvfAFMode`, `StroboMode`, `SeekOrigin`, `ProgressOption`,
  and more).
- `edsdk` / `call` — raw FFI bindings for the complete EDSDK API surface,
  including `EdsGetPropertyDescEx`, `EdsCreateStream`, `EdsSetProgressCallback`,
  `EdsSetMetaImage`, `EdsGetCsdFileData`/`EdsSetCsdFileData`, file attributes,
  and `EdsSetFramePoint`.

### Events

All EDSDK object events are mapped to high-level event names:

| EDSDK object event                                    | Event name                       |
| ----------------------------------------------------- | -------------------------------- |
| `DirItemRequestTransfer` / `DirItemRequestTransferDT` | `DownloadRequest`                |
| `DirItemCancelTransferDT`                             | `DownloadCancel`                 |
| `DirItemCreated`                                      | `FileCreate` / `DirectoryCreate` |
| `DirItemRemoved`                                      | `FileRemove` / `DirectoryRemove` |
| `DirItemInfoChanged` / `DirItemContentChanged`        | `FileChange` / `DirectoryChange` |
| `FolderUpdateItems`                                   | `DirectoryChange`                |
| `VolumeAdded` / `VolumeRemoved`                       | `VolumeAdd` / `VolumeRemove`     |
| `VolumeInfoChanged` / `VolumeUpdateItems`             | `VolumeChange`                   |
| anything else                                         | `ObjectChange`                   |

State events are surfaced as `StateChange` and include the raw `inEventData`
in `event.data`. Live view start/stop are emitted as `LiveViewStart` /
`LiveViewStop` when the EVF output device changes.

### Relationship to `napi-canon-cameras`

This package is inspired by
[napi-canon-cameras](https://github.com/ThomasWeinert/napi-canon-cameras)
(previously published as `@dimensional/napi-canon-cameras`). The high-level
API — `cameraBrowser`, `Camera`, `CameraProperty`, value classes, and the
event names — is intentionally similar, so application code written against
that wrapper is generally very easy to port.

### SDK coverage and platform notes

Bindings and constants are generated against Canon EDSDK **v13.20.21** (see
`vendor/sdk/`). All documented `EDSDK.h` entry points are bound, plus the
header-only `EdsCreateStream`/`EdsIStream` API. Platform caveats:

- `EdsCreateFileStreamEx` takes a `WCHAR*` filename on Windows (handled
  automatically by `Stream.openFileEx`) and a `CFURLRef` on macOS, which has
  no Node-compatible equivalent — use `Stream.openFile` there.
- `EdsCreateStream` is usable on all platforms through the callback vtable
  (`Stream.fromHandlers`), but is undocumented by Canon.

## Scripts

| Script                 | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `build`                | Clean, type-check, and build ESM + CJS bundles.      |
| `typecheck`            | Run TypeScript with no emit.                         |
| `lint`                 | Run ESLint.                                          |
| `lint:fix`             | Run ESLint and fix fixable issues.                   |
| `format`               | Check Prettier formatting.                           |
| `format:fix`           | Apply Prettier formatting.                           |
| `test`                 | Run Vitest once.                                     |
| `test:watch`           | Run Vitest in watch mode.                            |
| `test:camera`          | Run the test suite against a connected camera.       |
| `vendor:sync`          | Extract SDK archives in `vendor/sdk` (including the  |
|                        | macOS DMG) and copy all platforms' runtime libraries |
|                        | to `vendor/bin`, plus `EDSDK.framework` on macOS.    |
| `vendor:clean`         | Remove the mirrored `vendor/bin` directory.          |
| `example:picture-test` | Run the take-a-picture example.                      |
