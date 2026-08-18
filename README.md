# canon-edsdk-ffi

A modern, public TypeScript wrapper for the Canon EOS Digital SDK (EDSDK) using
[Koffi](https://koffi.dev/) for runtime FFI. It discovers and loads Canon SDK
libraries from the host system and exposes a high-level, async,
event-emitter-oriented camera API.

## Important: Canon SDK binaries are not included

This package does **not** redistribute any Canon EDSDK binaries. You must obtain
the Canon EDSDK yourself and make the runtime library available in one of these
ways:

- place `EDSDK.dll` / `libEDSDK.so` / `EDSDK.framework` in the working
  directory, or
- set the `EDSDK_PATH` environment variable to the directory containing the
  library, or
- place the extracted SDK in `vendor/sdk/` and run `npm run vendor:sync` to copy
  the correct runtime binaries into `vendor/bin/<platform>`.

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

1. The path pointed to by the `EDSDK_PATH` environment variable.
2. The current working directory.
3. The `vendor/bin/<platform>` directory, where `<platform>` is `win32`,
   `darwin`, or `linux`. Expected file names include `EDSDK.dll`, `libEDSDK.so`,
   `libEDSDK.dylib`, or `EDSDK`, depending on the platform.

The companion `EdsImage` library is searched similarly, using `EdsImage.dll`,
`libEdsImage.so`, `libEdsImage.dylib`, or `EdsImage`.

## Vendor SDK layout

Canon EDSDK downloads are too large and licensed to redistribute with this
package. Keep them out of version control by placing the extracted SDKs in
`vendor/sdk/` and copying the runtime libraries to `vendor/bin/<platform>`:

```bash
# On Linux, after extracting the SDK to vendor/sdk/EDSDK_v13.20.21_Linux
npm run vendor:sync
```

This copies the correct architecture's `libEDSDK.so` into `vendor/bin/linux/`
so the package can load it. For macOS, extract the `.dmg` first, then run the
sync script. You can also copy the files manually.

## API overview

- `Camera` — connect, disconnect, get/set properties, send commands, capture
  pictures, control live view, enumerate volumes.
- `CameraBrowser` — SDK lifecycle, camera enumeration, event dispatch.
- `CameraFile` — download captured images and thumbnails.
- `LiveViewImage` — create and download EVF (live view) frames.
- `Volume` / `Directory` — navigate camera storage.
- `CameraProperty` and value classes (`Aperture`, `ShutterSpeed`,
  `ISOSensitivity`, `ExposureCompensation`, `ImageQuality`, `Option`, etc.).
- `watchCameras` — simple interval-based SDK event pump.

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
| `vendor:sync`      | Copy runtime libraries from `vendor/sdk` to     |
|                    | `vendor/bin/<platform>`.                        |
| `vendor:clean`     | Remove the mirrored `vendor/bin` directory.     |
| `example:skeleton` | Run the skeleton example.                       |
