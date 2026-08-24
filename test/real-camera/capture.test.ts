import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import EDSDK from '../../src/index.js';
import { initializeAndConnect, disconnectAndTerminate, getCamera, clearEvents, waitForEvent, getTmpDir } from './setup.js';

beforeAll(initializeAndConnect);
afterAll(disconnectAndTerminate);

describe('still image capture', () => {
    it('sets SaveTo Host and takes a picture', async () => {
        clearEvents();
        getCamera().setProperty(EDSDK.CameraProperty.ID.SaveTo, EDSDK.Option.SaveTo.Host);
        getCamera().takePicture();
        const event = await waitForEvent('DownloadRequest', 30000);
        expect(event).toBeDefined();
        expect('file' in event).toBe(true);
    });

    it('the resulting CameraFile has name, size and format', async () => {
        clearEvents();
        getCamera().setProperty(EDSDK.CameraProperty.ID.SaveTo, EDSDK.Option.SaveTo.Host);
        getCamera().takePicture();
        const event = await waitForEvent('DownloadRequest', 30000);
        const file = (event as EDSDK.FileChangeEvent).file;
        expect(file.name).toBeTruthy();
        expect(Number(file.size)).toBeGreaterThan(0);
        expect(file.format).toBeDefined();
        expect(file.format.label).toBeTruthy();
    });

    it('downloadToString returns a base64 JPEG', async () => {
        clearEvents();
        getCamera().setProperty(EDSDK.CameraProperty.ID.SaveTo, EDSDK.Option.SaveTo.Host);
        getCamera().takePicture();
        const event = await waitForEvent('DownloadRequest', 30000);
        const file = (event as EDSDK.FileChangeEvent).file;
        const b64 = file.downloadToString();
        expect(b64.length).toBeGreaterThan(1000);
        expect(b64.startsWith('/9j/')).toBe(true);
    });

    it('downloadToFile writes the image to disk', async () => {
        clearEvents();
        getCamera().setProperty(EDSDK.CameraProperty.ID.SaveTo, EDSDK.Option.SaveTo.Host);
        getCamera().takePicture();
        const event = await waitForEvent('DownloadRequest', 30000);
        const file = (event as EDSDK.FileChangeEvent).file;
        const dest = path.join(getTmpDir(), file.name);
        const written = file.downloadToFile(dest);
        expect(fs.existsSync(written)).toBe(true);
        expect(fs.statSync(written).size).toBeGreaterThan(0);
    });
});
