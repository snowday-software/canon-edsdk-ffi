import fs from 'node:fs';
import path from 'node:path';
import EDSDK from '../../src/index.js';

let camera: EDSDK.Camera | undefined;
let stopWatcher: (() => void) | undefined;
const events: { name: string; event: any }[] = [];
const originalValues: Record<string, unknown> = {};

const snapshotProperties = ['SaveTo', 'WhiteBalance', 'ISOSpeed', 'Tv', 'Av', 'PictureStyle', 'Evf_OutputDevice'];

function onEvent(name: string, event: any): void {
    events.push({ name, event });
}

export function getTmpDir(): string {
    const tmp = path.join(process.cwd(), 'tmp', 'real-camera-tests');
    fs.mkdirSync(tmp, { recursive: true });
    return tmp;
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function initializeAndConnect(): Promise<EDSDK.Camera> {
    if (camera) {
        return camera;
    }

    EDSDK.cameraBrowser.setEventHandler(onEvent);
    EDSDK.cameraBrowser.initialize();

    const cam = EDSDK.cameraBrowser.getCamera();
    if (!cam) {
        throw new Error('No Canon camera detected for real-camera tests.');
    }

    cam.connect(true);
    camera = cam;
    stopWatcher = EDSDK.watchCameras(500);

    for (const key of snapshotProperties) {
        try {
            const id = EDSDK.CameraProperty.ID[key];
            if (id === undefined) {
                continue;
            }
            const prop = cam.getProperty(id);
            if (prop.available) {
                originalValues[key] =
                    typeof prop.value === 'object' && prop.value !== null && 'value' in prop.value
                        ? (prop.value as { value: unknown }).value
                        : prop.value;
            }
        } catch {
            // Not all properties are available on all bodies.
        }
    }

    await sleep(500);
    return cam;
}

export async function disconnectAndTerminate(): Promise<void> {
    if (camera) {
        for (const [key, value] of Object.entries(originalValues)) {
            if (value === undefined) {
                continue;
            }
            try {
                const id = EDSDK.CameraProperty.ID[key];
                if (id !== undefined) {
                    camera.setProperty(id, value);
                }
            } catch {
                // Best-effort restore.
            }
        }

        try {
            camera.stopLiveView();
        } catch {
            // ignore
        }

        camera.disconnect();
    }

    if (stopWatcher) {
        stopWatcher();
        stopWatcher = undefined;
    }

    try {
        EDSDK.cameraBrowser.terminate();
    } catch {
        // ignore
    }

    camera = undefined;
    events.length = 0;
}

export function getCamera(): EDSDK.Camera {
    if (!camera) {
        throw new Error('Camera not initialized; call initializeAndConnect() first.');
    }
    return camera;
}

export function getEvents(): { name: string; event: any }[] {
    return events;
}

export function clearEvents(): void {
    events.length = 0;
}

export async function waitForEvent(name: string, timeout = 30000): Promise<any> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        EDSDK.cameraBrowser.triggerEvents();
        const index = events.findIndex((e) => e.name === name);
        if (index >= 0) {
            return events.splice(index, 1)[0]!.event;
        }
        await sleep(100);
    }
    throw new Error(`Timed out waiting for event "${name}"`);
}
