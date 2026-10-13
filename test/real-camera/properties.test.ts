import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import EDSDK from '../../src/index.js';
import { initializeAndConnect, disconnectAndTerminate, getCamera, clearEvents, waitForEvent } from './setup.js';

beforeAll(initializeAndConnect);
afterAll(disconnectAndTerminate);

function readProperty(id: number, label: string) {
    const prop = getCamera().getProperty(id);
    expect(prop.label).toBe(label);
    expect(prop.allowedValues).toBeInstanceOf(Array);
    expect(prop.allowedValues.length).toBeGreaterThan(0);
    return prop;
}

describe('camera properties', () => {
    it('reads Av with allowed values', () => {
        const prop = readProperty(EDSDK.CameraProperty.ID.Av, 'Av');
        expect(prop.value).toBeDefined();
    });

    it('reads Tv with allowed values', () => {
        const prop = readProperty(EDSDK.CameraProperty.ID.Tv, 'Tv');
        expect(prop.value).toBeDefined();
    });

    it('reads ISOSpeed with allowed values', () => {
        const prop = readProperty(EDSDK.CameraProperty.ID.ISOSpeed, 'ISOSpeed');
        expect(prop.value).toBeDefined();
    });

    it('reads WhiteBalance with allowed values', () => {
        const prop = readProperty(EDSDK.CameraProperty.ID.WhiteBalance, 'WhiteBalance');
        expect(prop.value).toBeDefined();
    });

    it('reads SaveTo with allowed values', () => {
        const prop = readProperty(EDSDK.CameraProperty.ID.SaveTo, 'SaveTo');
        expect(prop.value).toBeDefined();
    });

    it('reads LensName when available', () => {
        const prop = getCamera().getProperty(EDSDK.CameraProperty.ID.LensName);
        expect(prop.label).toBe('LensName');
        if (prop.available) {
            expect(prop.value).toBeTruthy();
        }
    });

    it('round-trips SaveTo to Host', () => {
        getCamera().setProperty(EDSDK.CameraProperty.ID.SaveTo, EDSDK.Option.SaveTo.Host);
        const prop = getCamera().getProperty(EDSDK.CameraProperty.ID.SaveTo);
        expect((prop.value as EDSDK.PropertyValue).value).toBe(EDSDK.Option.SaveTo.Host);
    });

    it('round-trips WhiteBalance to AutoAmbiencePriority', () => {
        getCamera().setProperty(EDSDK.CameraProperty.ID.WhiteBalance, EDSDK.Option.WhiteBalance.AutoAmbiencePriority);
        const prop = getCamera().getProperty(EDSDK.CameraProperty.ID.WhiteBalance);
        expect((prop.value as EDSDK.PropertyValue).value).toBe(EDSDK.Option.WhiteBalance.AutoAmbiencePriority);
    });

    it('round-trips PictureStyle to 0x81 (Standard)', () => {
        getCamera().setProperty(EDSDK.CameraProperty.ID.PictureStyle, 0x81);
        const prop = getCamera().getProperty(EDSDK.CameraProperty.ID.PictureStyle);
        expect((prop.value as EDSDK.PropertyValue).value).toBe(0x81);
        expect((prop.value as EDSDK.PropertyValue).label).toBe('PictureStyle.Standard');
    });

    it('emits PropertyChangeValue after a setting change', async () => {
        clearEvents();
        getCamera().setProperty(EDSDK.CameraProperty.ID.WhiteBalance, EDSDK.Option.WhiteBalance.AutoAmbiencePriority);
        const event = await waitForEvent('PropertyChangeValue', 10000);
        expect(event).toBeDefined();
        expect('camera' in event).toBe(true);
        expect('property' in event).toBe(true);
    });
});
