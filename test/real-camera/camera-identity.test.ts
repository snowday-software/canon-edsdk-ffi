import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { initializeAndConnect, disconnectAndTerminate, getCamera } from './setup.js';

beforeAll(initializeAndConnect);
afterAll(disconnectAndTerminate);

describe('camera identity and connection', () => {
    it('has a non-empty description', () => {
        expect(getCamera().description).toBeTruthy();
        expect(typeof getCamera().description).toBe('string');
    });

    it('has a non-empty portName', () => {
        expect(getCamera().portName).toBeTruthy();
        expect(typeof getCamera().portName).toBe('string');
    });

    it('can disconnect and reconnect', () => {
        const cam = getCamera();
        expect(() => cam.disconnect()).not.toThrow();
        expect(() => cam.connect(true)).not.toThrow();
    });
});
