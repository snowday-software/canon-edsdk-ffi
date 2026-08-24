import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import EDSDK from '../../src/index.js';
import { initializeAndConnect, disconnectAndTerminate, getCamera } from './setup.js';

beforeAll(initializeAndConnect);
afterAll(disconnectAndTerminate);

describe('CameraBrowser SDK lifecycle', () => {
    it('initializes and lists at least one camera', () => {
        const cameras = EDSDK.cameraBrowser.getCameras();
        expect(cameras.length).toBeGreaterThan(0);
    });

    it('getCamera returns the connected camera at index 0', () => {
        const cam = EDSDK.cameraBrowser.getCamera(0, true);
        expect(cam).toBeDefined();
        expect(cam).toBe(getCamera());
    });

    it('setEventHandler can be replaced without throwing', () => {
        expect(() => EDSDK.cameraBrowser.setEventHandler(() => {})).not.toThrow();
    });

    it('watchCameras returns a function that stops the event pump', () => {
        const stop = EDSDK.watchCameras(1000);
        expect(typeof stop).toBe('function');
        stop();
    });

    it('update refreshes the camera list without throwing', () => {
        expect(() => EDSDK.cameraBrowser.update()).not.toThrow();
    });
});
