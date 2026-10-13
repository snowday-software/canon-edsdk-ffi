# canon-edsdk-ffi

A modern, public TypeScript wrapper for the Canon EOS Digital SDK (EDSDK) using
[Koffi](https://koffi.dev/) for runtime FFI. It discovers and loads Canon SDK
libraries from the host system and exposes a high-level, async,
event-emitter-oriented camera API.

## Important: Canon SDK binaries are not included

This package does **not** redistribute any Canon EDSDK binaries. You must obtain
the Canon EDSDK yourself (from the [Canon Developer Community](https://developercommunity.usa.canon.com/s/)) and make the runtime library available in one of these
ways:

- place `EDSDK.dll` / `libEDSDK.so` / `EDSDK.framework` in the working
  directory, or
- set the `EDSDK_PATH` environment variable to the directory containing the
  library, or
- place the Canon SDK ZIPs (or extracted SDKs) in `vendor/sdk/` and run
  `npm run vendor:sync` to copy the runtime binaries into `vendor/bin/`.

This package is not currently published to npm. Use it as a local or workspace
dependency.

## Installation

This package is not published to npm. Install it from the local checkout or as
a workspace dependency:

```bash
npm install file:path/to/canon-edsdk-ffi
```

Koffi builds a native addon during installation. The project already keeps a
project-specific `allowScripts` list in `package.json` for npm, so only
necessary build scripts are allowed. On pnpm you can approve just Koffi:

```bash
pnpm approve-builds koffi
```

## Requirements

- Node.js `>= 18.0.0`
- Canon EDSDK libraries set up via the local vendor mirror (see
  [Vendor SDK layout](#vendor-sdk-layout) below)
- TypeScript `^6.0.0`

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

        // Poll SDK events
        const stop = EDSDK.watchCameras(500);

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

A runnable skeleton is provided at `examples/camera-skeleton.ts`:

```bash
npm run example:skeleton
```

## Library discovery

At runtime the package looks for the EDSDK library in the following locations
(in order):

1. The path pointed to by the `EDSDK_PATH` environment variable. It may point
   to the library file itself or to the directory containing it.
2. The current working directory.
3. The `vendor/bin` directory.

Only the current platform's file names are searched: `EDSDK.dll` on Windows,
`libEDSDK.so` on Linux, and `EDSDK` or `libEDSDK.dylib` on macOS — so binaries
for multiple platforms can coexist in `vendor/bin` without being picked up by
the wrong loader.

The companion `EdsImage` library is searched similarly, using `EdsImage.dll`,
`libEdsImage.so`, `libEdsImage.dylib`, or `EdsImage`, as appropriate for the
platform.

## Vendor SDK layout

Since Canon EDSDK downloads are not redistributable, they must be manually placed in
`vendor/sdk/` and the sync script run to extract them:

```bash
npm run vendor:sync
```

The script extracts every `*.zip` at the top of `vendor/sdk/` into a directory
named after the archive (skipping ones already extracted; pass `--force` to
re-extract) and expands the `Macintosh.dmg` nested inside the Macintosh SDK.
All archives are handled by a bundled 7-Zip binary — no system tools or mounts
are required, so this works on any host OS. You can also extract a single ZIP
explicitly:

```bash
npm run vendor:sync -- /path/to/EDSDK_v13.20.21_Windows.zip
```

After extraction, the script copies the runtime libraries for **all**
platforms into the flat `vendor/bin/` directory: `EDSDK.dll`/`EdsImage.dll`
(Windows), `libEDSDK.so` (Linux), `EDSDK`/`EdsImage` (macOS). The file names
never collide across platforms, so binaries for every target can coexist — e.g.
when assembling a multi-platform artifact in CI. Windows (`EDSDK_64` vs
`EDSDK`) and Linux (`x86_64`/`ARM64`/`ARM32`) architecture choices follow
`process.arch` of the machine running the script. The Linux SDK ships no
`libEdsImage.so`, so that warning is expected. You can also copy the files into
`vendor/bin/` manually instead of using the script.

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
that wrapper is often easy to port.

It is **not** a drop-in replacement. Naming and constants follow the current
Canon EDSDK headers (`kEdsPropID_*`, `kEdsObjectEvent_*`, etc.) rather than
the older wrapper's names, so legacy property names that no longer exist in
the SDK (e.g. `JpegQuality`, `FlashCompensation`, `DepthOfField`,
`PictureStyleDescription`) are not aliased — use the canonical names from
`edsdkConstants.PropertyID` instead.

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

| Script             | Description                                     |
| ------------------ | ----------------------------------------------- |
| `build`            | Clean, type-check, and build ESM + CJS bundles. |
| `typecheck`        | Run TypeScript with no emit.                    |
| `lint`             | Run ESLint.                                     |
| `lint:fix`         | Run ESLint and fix fixable issues.              |
| `format`           | Check Prettier formatting.                      |
| `format:fix`       | Apply Prettier formatting.                      |
| `test`             | Run Vitest once.                                |
| `test:watch`       | Run Vitest in watch mode.                       |
| `vendor:sync`      | Extract SDK ZIPs in `vendor/sdk` (including the |
|                    | macOS DMG) and copy all platforms' runtime      |
|                    | libraries to `vendor/bin`.                      |
| `vendor:clean`     | Remove the mirrored `vendor/bin` directory.     |
| `example:skeleton` | Run the skeleton example.                       |
