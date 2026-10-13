import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import EDSDK from '../../src/index.js';
import {
    initializeAndConnect,
    disconnectAndTerminate,
    getCamera,
    clearEvents,
    waitForEvent,
    getTmpDir,
    sleep,
} from './setup.js';

const shouldRecord = process.env['CANON_TEST_VIDEO'] === '1';

describe('video recording', () => {
    beforeAll(async () => {
        if (!shouldRecord) {
            return;
        }
        await initializeAndConnect();
        getCamera().setProperty(EDSDK.CameraProperty.ID.SaveTo, EDSDK.Option.SaveTo.Camera);
    });

    afterAll(async () => {
        if (!shouldRecord) {
            return;
        }
        await disconnectAndTerminate();
    });

    it('records a short clip and emits a file', async () => {
        if (!shouldRecord) {
            return;
        }
        clearEvents();
        getCamera().setProperty(EDSDK.CameraProperty.ID.Record, EDSDK.Option.Record.Begin);
        await sleep(3500);
        getCamera().setProperty(EDSDK.CameraProperty.ID.Record, EDSDK.Option.Record.End);
        const event = await waitForEvent('FileCreate', 60000);
        expect(event).toBeDefined();
        const file = (event as EDSDK.FileChangeEvent).file;
        expect(file.name).toBeTruthy();
        expect(Number(file.size)).toBeGreaterThan(0);
    }, 120000);

    it('downloads the recorded clip to disk', async () => {
        if (!shouldRecord) {
            return;
        }
        clearEvents();
        getCamera().setProperty(EDSDK.CameraProperty.ID.Record, EDSDK.Option.Record.Begin);
        await sleep(3500);
        getCamera().setProperty(EDSDK.CameraProperty.ID.Record, EDSDK.Option.Record.End);
        const event = await waitForEvent('FileCreate', 60000);
        const file = (event as EDSDK.FileChangeEvent).file;
        const dest = path.join(getTmpDir(), file.name);
        const written = file.downloadToFile(dest);
        expect(fs.existsSync(written)).toBe(true);
        expect(fs.statSync(written).size).toBeGreaterThan(0);
    }, 180000);
});
