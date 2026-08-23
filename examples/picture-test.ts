/// <reference types="node" />
import EDSDK from '../src/index.js';
import type { ApiError, CameraFile } from '../src/index.js';
import * as fs from 'fs';
import * as path from 'path';

let tmpRoot: string;
let sessionId: string;

EDSDK.cameraBrowser.setEventHandler((eventName, event) => {
    if (eventName === 'DownloadRequest' && 'file' in event) {
        const file = (event as any).file as CameraFile;
        const dest = path.join(tmpRoot, `${sessionId}_${file.name}`);
        const downloaded = file.downloadToFile(dest);
        console.log(`[Download] -> ${downloaded}`);
        return;
    }

    if ('camera' in event) {
        console.log(`[Event] ${eventName} - ${event.camera.description}`);
    } else {
        console.log(`[Error] ${eventName} - ${(event as ApiError).label}`);
    }
});

try {
    EDSDK.cameraBrowser.initialize();
    console.log(
        'Cameras:',
        EDSDK.cameraBrowser.getCameras().map((c) => c.description),
    );

    tmpRoot = path.join(process.cwd(), 'tmp');
    fs.mkdirSync(tmpRoot, { recursive: true });
    const tmpRunDir = fs.mkdtempSync(path.join(tmpRoot, 'skeleton-'));
    sessionId = path.basename(tmpRunDir).replace(/^skeleton-/, '');
    fs.rmdirSync(tmpRunDir);

    const camera = EDSDK.cameraBrowser.getCamera();
    if (camera) {
        camera.connect();
        console.log('Connected to:', camera.description, 'on', camera.portName);

        camera.setProperties({
            [EDSDK.CameraProperty.ID.SaveTo]: EDSDK.Option.SaveTo.Host,
        });

        const stop = EDSDK.watchCameras(500);

        setTimeout(() => {
            console.log('Taking picture...');
            camera.takePicture();
        }, 2000);

        setTimeout(() => {
            stop();
            camera.disconnect();
            EDSDK.cameraBrowser.terminate();
            console.log('Done.');
        }, 10000);
    } else {
        console.log('No camera found.');
        EDSDK.cameraBrowser.terminate();
    }
} catch (err: any) {
    console.error('EDSDK skeleton failed:', err.EDS_ERROR ? err.EDS_ERROR.toJSON() : err.message);
    process.exit(1);
}
