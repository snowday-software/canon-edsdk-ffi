import fs from 'node:fs';
import path from 'node:path';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import EDSDK from '../../src/index.js';
import {
    initializeAndConnect,
    disconnectAndTerminate,
    getCamera,
    clearEvents,
    waitForEvent,
    sleep,
    getTmpDir,
} from './setup.js';

beforeAll(initializeAndConnect);
afterAll(disconnectAndTerminate);

describe('live view', () => {
    it('starts live view and is reported active', async () => {
        clearEvents();
        getCamera().startLiveView();
        const event = await waitForEvent('LiveViewStart', 10000);
        expect(event).toBeDefined();
        expect(getCamera().isLiveViewActive()).toBe(true);
    });

    it('downloads three live view frames as JPEGs to tmp', async () => {
        const tmp = getTmpDir();
        const deadline = Date.now() + 5000;
        for (let i = 1; i <= 3; i++) {
            let data: string | undefined;
            while (Date.now() < deadline) {
                try {
                    const img = getCamera().getLiveViewImage();
                    if (img) {
                        data = img.getDataURL();
                        if (data && data.length > 1000) {
                            break;
                        }
                    }
                } catch (e) {
                    const err = e as { EDS_ERROR?: { identifier: number } };
                    if (err.EDS_ERROR?.identifier !== EDSDK.ApiError.Code.OBJECT_NOTREADY) {
                        throw e;
                    }
                }
                await sleep(100);
            }
            expect(data).toMatch(/^data:image\/jpeg;base64,/);
            expect(data!.length).toBeGreaterThan(1000);
            const b64 = data!.slice('data:image/jpeg;base64,'.length);
            const buffer = Buffer.from(b64, 'base64');
            const filePath = path.join(tmp, `live-view-frame-${i}.jpg`);
            fs.writeFileSync(filePath, buffer);
            console.log(`saved live view frame ${i} to ${filePath} (${buffer.length} bytes)`);
            if (i < 3) {
                await sleep(100);
            }
        }
    });

    it('stops live view and is reported inactive', async () => {
        clearEvents();
        getCamera().stopLiveView();
        const event = await waitForEvent('LiveViewStop', 10000);
        expect(event).toBeDefined();
        expect(getCamera().isLiveViewActive()).toBe(false);
    });
});
