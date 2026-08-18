import { describe, it, expect } from 'vitest';
import CameraApi from '../src/index.js';

const {
    CameraProperty,
    Aperture,
    ShutterSpeed,
    ISOSensitivity,
    ImageQuality,
    Option,
    FileFormat,
    OutputDevice,
    cameraBrowser,
    watchCameras,
    ApiError,
} = CameraApi;

describe('public API', () => {
    it('exports CameraProperty.ID and resolves labels', () => {
        expect(CameraProperty.ID.ISOSpeed).toBe(0x00000402);
        expect(CameraProperty.getIDFor('ISOSpeed')).toBe(CameraProperty.ID.ISOSpeed);
        expect(CameraProperty.getIDFor('123')).toBe(123);
        expect(CameraProperty.getIDFor('does-not-exist')).toBeUndefined();
    });

    it('value classes handle option, aperture and image quality', () => {
        const aperture = new Aperture(1029);
        expect(aperture.value).toBe(1029);
        expect(typeof aperture.label).toBe('string');

        const wb = new Option(CameraProperty.ID.WhiteBalance, Option.WhiteBalance.Daylight);
        expect(wb.value).toBe(Option.WhiteBalance.Daylight);
        expect(wb.label).toBe('WhiteBalance.Daylight');

        const quality = new ImageQuality(ImageQuality.ID.LargeJPEGFine);
        expect(quality.value).toBe(ImageQuality.ID.LargeJPEGFine);
        expect(quality.main.format).toBeGreaterThanOrEqual(0);

        const iso = new ISOSensitivity(100);
        expect(iso.value).toBe(100);
    });

    it('FileFormat and OutputDevice expose value and label', () => {
        const fmt = new FileFormat(FileFormat.ID.JPEG);
        expect(fmt.value).toBe(FileFormat.ID.JPEG);
        expect(fmt.label).toBe('JPEG');

        const device = new OutputDevice(OutputDevice.ID.PC);
        expect(device.value).toBe(OutputDevice.ID.PC);
    });

    it('ApiError has correct Code labels', () => {
        const err = new ApiError(ApiError.Code.INTERNAL_ERROR);
        expect(err.identifier).toBe(ApiError.Code.INTERNAL_ERROR);
        expect(err.label).toBe('INTERNAL_ERROR');
    });

    it('cameraBrowser and watchCameras are exported', () => {
        expect(cameraBrowser).toBeDefined();
        expect(typeof watchCameras).toBe('function');
    });
});
