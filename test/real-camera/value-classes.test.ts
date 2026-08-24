import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import EDSDK from '../../src/index.js';
import { initializeAndConnect, disconnectAndTerminate, getCamera } from './setup.js';

beforeAll(initializeAndConnect);
afterAll(disconnectAndTerminate);

function rawValue(value: unknown): number {
    if (value && typeof value === 'object' && 'value' in value) {
        return (value as { value: number }).value;
    }
    return Number(value);
}

describe('value type classes', () => {
    it('Aperture exposes value, label and aperture', () => {
        const prop = getCamera().getProperty(EDSDK.CameraProperty.ID.Av);
        const v = new EDSDK.Aperture(rawValue(prop.value));
        expect(v.value).toBeGreaterThanOrEqual(0);
        expect(typeof v.label).toBe('string');
        expect(v.aperture).toBeGreaterThan(0);
        expect(EDSDK.Aperture.OneHalfValues).toBeDefined();
        expect(EDSDK.Aperture.OneThirdValues).toBeDefined();
    });

    it('ShutterSpeed exposes value, label and seconds', () => {
        const prop = getCamera().getProperty(EDSDK.CameraProperty.ID.Tv);
        const v = new EDSDK.ShutterSpeed(rawValue(prop.value));
        expect(v.value).toBeGreaterThanOrEqual(0);
        expect(typeof v.label).toBe('string');
        expect(v.seconds).toBeGreaterThan(0);
        expect(EDSDK.ShutterSpeed.OneHalfValues).toBeDefined();
        expect(EDSDK.ShutterSpeed.OneThirdValues).toBeDefined();
    });

    it('ISOSensitivity exposes value, label and sensitivity', () => {
        const prop = getCamera().getProperty(EDSDK.CameraProperty.ID.ISOSpeed);
        const v = new EDSDK.ISOSensitivity(rawValue(prop.value));
        expect(v.value).toBeGreaterThanOrEqual(0);
        expect(typeof v.label).toBe('string');
        expect(v.sensitivity).toBeGreaterThan(0);
        expect(EDSDK.ISOSensitivity.ID).toBeDefined();
    });

    it('Option wraps WhiteBalance with a labeled constant', () => {
        const opt = new EDSDK.Option(EDSDK.CameraProperty.ID.WhiteBalance, EDSDK.Option.WhiteBalance.Daylight);
        expect(opt.value).toBe(EDSDK.Option.WhiteBalance.Daylight);
        expect(opt.label).toBe('WhiteBalance.Daylight');
    });

    it('OutputDevice reports PC when PC is enabled', () => {
        const dev = new EDSDK.OutputDevice(EDSDK.Option.EvfOutputDevice.PC);
        expect(dev.value).toBe(EDSDK.Option.EvfOutputDevice.PC);
        expect(dev.isEnabled(EDSDK.Option.EvfOutputDevice.PC)).toBe(true);
    });

    it('FileFormat can decode a JPEG value', () => {
        const fmt = new EDSDK.FileFormat(EDSDK.FileFormat.ID.JPEG);
        expect(fmt.value).toBe(EDSDK.FileFormat.ID.JPEG);
        expect(fmt.label).toBe('JPEG');
    });

    it('ImageQuality decodes main format/size/quality', () => {
        const q = new EDSDK.ImageQuality(EDSDK.ImageQuality.ID.LargeJPEGFine);
        expect(q.value).toBe(EDSDK.ImageQuality.ID.LargeJPEGFine);
        expect(typeof q.main.format).toBe('number');
    });

    it('Flag converts true and false', () => {
        expect(new EDSDK.Flag(true).flag).toBe(true);
        expect(new EDSDK.Flag(false).flag).toBe(false);
    });
});
