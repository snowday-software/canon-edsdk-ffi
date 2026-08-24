import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { initializeAndConnect, disconnectAndTerminate, getCamera } from './setup.js';

beforeAll(initializeAndConnect);
afterAll(disconnectAndTerminate);

describe('UI lock', () => {
    it('locks and unlocks the camera UI without throwing', () => {
        expect(() => getCamera().lockUI()).not.toThrow();
        expect(() => getCamera().unlockUI()).not.toThrow();
    });
});
