import { describe, it, expect } from 'vitest';
import koffi from 'koffi';
import CameraApi, * as api from '../src/index.js';

const { CameraProperty, Option, Stream, CameraImage, FlashSettings } = CameraApi;
const { edsdkConstants, edsdkDefinitions, edsdk } = api;

describe('constants coverage', () => {
    const groupNames = [
        'ErrorCode',
        'PropertyID',
        'DataType',
        'CameraCommand',
        'ShutterButton',
        'CameraStatusCommand',
        'PropertyEvent',
        'ObjectEvent',
        'StateEvent',
        'EvfOutputDevice',
        'FileCreateDisposition',
        'Access',
        'StorageType',
        'SaveTo',
        'AEMode',
        'Bracket',
        'ColorSpace',
        'CompressQuality',
        'DrivePowerZoom',
        'EvfDepthOfFieldPreview',
        'EvfDriveLens',
        'EvfZoom',
        'FileAttribute',
        'ImageSize',
        'ImageSource',
        'ImageType',
        'ObjectFormat',
        'ProgressOption',
        'SeekOrigin',
        'TargetImageType',
        'TransferOption',
        'WhiteBalance',
        'BatteryLevel2',
        'PictureStyle',
        'EvfAFMode',
        'StroboMode',
        'ETTL2Mode',
        'DcStrobe',
        'DcLensBarrelState',
        'DcRemoteShootingMode',
        'MirrorLockupState',
        'MirrorUpSetting',
        'ImageQuality',
    ];

    it.each(groupNames)('exports the %s constant group', (name) => {
        const group = (edsdkConstants as any)[name];
        expect(group, name).toBeDefined();
        expect(Object.keys(group).length).toBeGreaterThan(0);
    });

    it('keeps previously exposed constant values stable', () => {
        expect(edsdkConstants.PropertyID.ISOSpeed).toBe(0x00000402);
        expect(edsdkConstants.ErrorCode.OK).toBe(0);
        expect(edsdkConstants.ObjectEvent.DirItemRequestTransfer).toBe(0x208);
        expect(edsdkConstants.EvfZoom.x5).toBe(5);
        expect(edsdkConstants.SeekOrigin.Begin).toBe(1);
    });

    it('covers the full EvfAFMode enum range', () => {
        expect(edsdkConstants.EvfAFMode.WholeArea).toBe(14);
        expect(edsdkConstants.EvfAFMode.NoTraking_ExpandAround).toBe(18);
    });
});

describe('Option groups', () => {
    it('maps new property groups for labels', () => {
        const wb = new Option(CameraProperty.ID.PictureStyle, 0x83);
        expect(wb.label).toBe('PictureStyle.Landscape');

        const battery = new Option(CameraProperty.ID.BatteryLevel, 80);
        expect(battery.label).toBe('BatteryLevel.Normal');
    });

    it('supports extended EvfAFMode and EvfZoom values', () => {
        const af = new Option(CameraProperty.ID.Evf_AFMode, 14);
        expect(af.label).toBe('Evf_AFMode.WholeArea');
        expect(Option.EvfAFMode.NoTrakingExpandAround).toBe(18);
        expect(Option.EvfZoom.x15).toBe(15);
    });
});

describe('struct definitions', () => {
    it('defines EdsPropertyDescEx with the SDK layout', () => {
        // 3 x int32 + 4 bytes alignment padding + 2048 x int64
        expect(koffi.sizeof(edsdkDefinitions.EdsPropertyDescEx)).toBe(16 + 2048 * 8);
    });

    it('defines EdsIStream as context + five function pointers', () => {
        expect(koffi.sizeof(edsdkDefinitions.EdsIStream)).toBe(6 * 8);
    });

    it('defines EdsGpsMetaData with the SDK layout', () => {
        expect(koffi.sizeof(edsdkDefinitions.EdsGpsMetaData)).toBe(88);
    });
});

describe('high-level API exports', () => {
    it('exports Stream, CameraImage and FlashSettings', () => {
        expect(Stream).toBeDefined();
        expect(CameraImage).toBeDefined();
        expect(FlashSettings).toBeDefined();
        expect(api.Stream).toBeDefined();
        expect(api.CameraImage).toBeDefined();
        expect(api.FlashSettings).toBeDefined();
    });

    it('exposes stream factory constants', () => {
        expect(Stream.SeekOrigin.Begin).toBe(1);
        expect(Stream.Access.ReadWrite).toBe(2);
        expect(Stream.ProgressOption.Periodically).toBe(2);
    });
});

describe('edsdk bindings', () => {
    const fnNames = [
        'EdsGetPropertyDescEx',
        'EdsCreateFlashSettingRef',
        'EdsGetAttribute',
        'EdsSetAttribute',
        'EdsSetMetaImage',
        'EdsGetCsdFileData',
        'EdsSetCsdFileData',
        'EdsCreateFileStreamEx',
        'EdsSetProgressCallback',
        'EdsCreateStream',
        'EdsSetFramePoint',
    ];

    it.each(fnNames)('binds %s', (name) => {
        expect(typeof (edsdk as any)[name]).toBe('function');
    });
});
