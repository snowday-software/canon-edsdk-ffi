import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import EDSDK from '../../src/index.js';
import { initializeAndConnect, disconnectAndTerminate, getCamera, clearEvents, waitForEvent, sleep } from './setup.js';

beforeAll(initializeAndConnect);
afterAll(disconnectAndTerminate);

describe('live view', () => {
    it('starts live view and is reported active', async () => {
        clearEvents();
        getCamera().startLiveView();
        expect(getCamera().isLiveViewActive()).toBe(true);
        const event = await waitForEvent('LiveViewStart', 10000);
        expect(event).toBeDefined();
    });

    it('downloads a live view frame as a JPEG data URL', async () => {
        // The first EVF frame may not be ready immediately; retry briefly on
        // OBJECT_NOTREADY, matching how the booth worker polls for previews.
        const deadline = Date.now() + 5000;
        let data = '';
        while (Date.now() < deadline) {
            try {
                const img = getCamera().getLiveViewImage();
                if (img) {
                    data = img.getDataURL();
                    if (data.length > 1000) {
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
        expect(data.length).toBeGreaterThan(1000);
    });

    it('stops live view and is reported inactive', async () => {
        clearEvents();
        getCamera().stopLiveView();
        expect(getCamera().isLiveViewActive()).toBe(false);
        const event = await waitForEvent('LiveViewStop', 10000);
        expect(event).toBeDefined();
    });
});
