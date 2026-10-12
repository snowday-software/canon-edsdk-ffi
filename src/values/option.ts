import type { PropertyValue } from './property-value.js';
import { PropertyID } from '../ffi/constants.js';

/**
 * Represents an EDSDK option value from a named group.
 *
 * Options are used for multi-value properties such as AE mode, AF mode, drive
 * mode, white balance, and save-to location.
 */
export class Option implements PropertyValue {
    [Symbol.toStringTag] = 'Option';

    private readonly label_: string;

    constructor(
        private readonly propertyID_: number,
        private readonly value_: number,
    ) {
        this.label_ = `0x${value_.toString(16).padStart(8, '0')}`;
        const propertyLabel = Option.getPropertyLabel(propertyID_);
        const group = Option.OptionGroups[propertyID_];
        if (propertyLabel && group) {
            const optionLabel = Object.keys(group).find((key) => group[key] === value_);
            if (optionLabel) {
                this.label_ = `${propertyLabel}.${optionLabel}`;
            }
        }
    }

    get label(): string {
        return this.label_;
    }

    get value(): number {
        return this.value_;
    }

    get propertyID(): number {
        return this.propertyID_;
    }

    [Symbol.toPrimitive](hint: string): string | number | null {
        switch (hint) {
            case 'number':
                return this.value_;
            case 'string':
                return this.label_;
            default:
                return null;
        }
    }

    static forLabel(label: string): Option | null {
        const [propertyLabel, optionLabel] = label.split('.', 2);
        const propertyID = (PropertyID as Record<string, number>)[propertyLabel!];
        if (propertyID !== undefined && optionLabel !== undefined) {
            const group = Option.OptionGroups[propertyID];
            if (group) {
                const value = group[optionLabel];
                if (value !== undefined) {
                    return new Option(propertyID, value);
                }
            }
        }
        return null;
    }

    private static getPropertyLabel(propertyID: number): string | undefined {
        return Object.keys(PropertyID).find((key) => (PropertyID as Record<string, number>)[key] === propertyID);
    }

    private static optionGroupsCache: Record<number, Record<string, number>> | null = null;

    static get OptionGroups(): Record<number, Record<string, number>> {
        if (this.optionGroupsCache) {
            return this.optionGroupsCache;
        }
        this.optionGroupsCache = {
            [PropertyID.AEMode]: Option.AEMode,
            [PropertyID.AEModeSelect]: Option.AEModeSelect,
            [PropertyID.AFMode]: Option.AFMode,
            [PropertyID.BatteryLevel]: Option.BatteryLevel,
            [PropertyID.BatteryQuality]: Option.BatteryQuality,
            [PropertyID.Bracket]: Option.Bracket,
            [PropertyID.ColorSpace]: Option.ColorSpace,
            [PropertyID.DC_Strobe]: Option.DCStrobe,
            [PropertyID.DriveMode]: Option.DriveMode,
            [PropertyID.Evf_AFMode]: Option.EvfAFMode,
            [PropertyID.Evf_HistogramStatus]: Option.EvfHistogramStatus,
            [PropertyID.Evf_OutputDevice]: Option.EvfOutputDevice,
            [PropertyID.Evf_Zoom]: Option.EvfZoom,
            [PropertyID.LensBarrelStatus]: Option.LensBarrelStatus,
            [PropertyID.LensStatus]: Option.LensStatus,
            [PropertyID.MeteringMode]: Option.MeteringMode,
            [PropertyID.MirrorLockUpState]: Option.MirrorUpStatus,
            [PropertyID.MirrorUpSetting]: Option.MirrorUpStatus,
            [PropertyID.NoiseReduction]: Option.NoiseReduction,
            [PropertyID.PictureStyle]: Option.PictureStyle,
            [PropertyID.RedEye]: Option.RedEye,
            [PropertyID.Record]: Option.Record,
            [PropertyID.SaveTo]: Option.SaveTo,
            [PropertyID.WhiteBalance]: Option.WhiteBalance,
        };
        return this.optionGroupsCache;
    }

    static readonly AEMode: Record<string, number> = {
        Program: 0,
        Tv: 1,
        Av: 2,
        Manual: 3,
        Bulb: 4,
        A_DEP: 5,
        DEP: 6,
        Custom: 7,
        Lock: 8,
        Green: 9,
        NightPortrait: 10,
        Sports: 11,
        Portrait: 12,
        Landscape: 13,
        Closeup: 14,
        FlashOff: 15,
        CreativeAuto: 19,
        Movie: 20,
        PhotoInMovie: 21,
        SceneIntelligentAuto: 22,
        NightScenes: 23,
        BacklitScenes: 24,
        SCN: 25,
        Children: 26,
        Food: 27,
        CandlelightPortraits: 28,
        CreativeFilter: 29,
        RoughMonoChrome: 30,
        SoftFocus: 31,
        ToyCamera: 32,
        Fisheye: 33,
        WaterColor: 34,
        Miniature: 35,
        Hdr_Standard: 36,
        Hdr_Vivid: 37,
        Hdr_Bold: 38,
        Hdr_Embossed: 39,
        Movie_Fantasy: 40,
        Movie_Old: 41,
        Movie_Memory: 42,
        Movie_DirectMono: 43,
        Movie_Mini: 44,
        PanningAssist: 45,
        GroupPhoto: 46,
        Myself: 50,
        PlusMovieAuto: 51,
        SmoothSkin: 52,
        Panorama: 53,
        Silent: 54,
        Flexible: 55,
        OilPainting: 56,
        Fireworks: 57,
        StarPortrait: 58,
        StarNightScape: 59,
        StarTrails: 60,
        StarTimelapseMovie: 61,
        BackgroundBlur: 62,
        VideoBlog: 63,
        Unknown: 0xffffffff,
    };

    static readonly AEModeSelect: Record<string, number> = {
        ...Option.AEMode,
        Custom2: 16,
        Custom3: 17,
    };

    static readonly AFMode: Record<string, number> = {
        OneShot: 0,
        AIServo: 1,
        AIFocus: 2,
        ManualFocus: 3,
        NotValid: 0xffffffff,
    };

    static readonly BatteryQuality: Record<string, number> = {
        Low: 0,
        Half: 1,
        High: 2,
        Full: 3,
    };

    static readonly Bracket: Record<string, number> = {
        AEBracket: 1,
        ISOBracket: 2,
        WBBracket: 4,
        FEBracket: 8,
        BracketOff: 0xffffffff,
    };

    static readonly ColorSpace: Record<string, number> = {
        sRGB: 1,
        AdobeRGB: 2,
        Unknown: 0xffffffff,
    };

    static readonly DCStrobe: Record<string, number> = {
        Auto: 0,
        On: 1,
        SlowSynchro: 2,
        Off: 3,
    };

    static readonly DriveMode: Record<string, number> = {
        SingleShooting: 0,
        ContinuousShooting: 1,
        Video: 2,
        HighSpeedContinuous: 4,
        LowSpeedContinuous: 5,
        SingleSilentShooting: 6,
        SelfTimerContinuous: 7,
        SelfTimer10sec: 16,
        SelfTimer2sec: 17,
        SuperHighSpeed14fps: 18,
        SilentSingleShooting: 19,
        SilentContinuousShooting: 20,
        SilentHSContinuous: 21,
        SilentLSContinuous: 22,
    };

    static readonly EvfAFMode: Record<string, number> = {
        Quick: 0,
        OnePointAF: 1,
        FaceTracking: 2,
        FlexiZoneMulti: 3,
        ZoneAF: 4,
        ExpandAFAreaCross: 5,
        ExpandAFAreaAround: 6,
        LargeZoneAFHorizontal: 7,
        LargeZoneAFVertical: 8,
        TrackingAF: 9,
        SpotAF: 10,
        FlexibleZone1: 11,
        FlexibleZone2: 12,
        FlexibleZone3: 13,
        WholeArea: 14,
        NoTrakingSpot: 15,
        NoTraking1Point: 16,
        NoTrakingExpandCross: 17,
        NoTrakingExpandAround: 18,
    };

    static readonly EvfHistogramStatus: Record<string, number> = {
        Hide: 0,
        Normal: 1,
        Grayout: 2,
    };

    static readonly EvfOutputDevice: Record<string, number> = {
        None: 0,
        TFT: 1,
        PC: 2,
        SmallPC: 8,
    };

    static readonly EvfZoom: Record<string, number> = {
        Fit: 1,
        x5: 5,
        x6: 6,
        x10: 10,
        x15: 15,
    };

    static readonly PictureStyle: Record<string, number> = {
        Standard: 0x81,
        Portrait: 0x82,
        Landscape: 0x83,
        Neutral: 0x84,
        Faithful: 0x85,
        Monochrome: 0x86,
        Auto: 0x87,
        FineDetail: 0x88,
        User1: 0x21,
        User2: 0x22,
        User3: 0x23,
        PC1: 0x41,
        PC2: 0x42,
        PC3: 0x43,
    };

    static readonly BatteryLevel: Record<string, number> = {
        Empty: 0,
        Low: 9,
        Quarter: 19,
        Half: 49,
        Hi: 69,
        Normal: 80,
        AC: 0xffffffff,
        Unknown: 0xfffffffe,
    };

    static readonly LensBarrelStatus: Record<string, number> = {
        Inner: 0,
        Outer: 1,
    };

    static readonly LensStatus: Record<string, number> = {
        NotAttached: 0,
        Attached: 1,
    };

    static readonly MeteringMode: Record<string, number> = {
        Spot: 1,
        Evaluative: 3,
        Partial: 4,
        CenterWeightedAverage: 5,
        NotValid: 0xffffffff,
    };

    static readonly MirrorUpStatus: Record<string, number> = {
        Disable: 0,
        Enable: 1,
        DuringShooting: 2,
    };

    static readonly NoiseReduction: Record<string, number> = {
        Off: 0,
        On1: 1,
        On2: 2,
        On3: 3,
        Auto: 4,
    };

    static readonly RedEye: Record<string, number> = {
        Off: 0,
        On: 1,
        Invalid: 0xffffffff,
    };

    static readonly Record: Record<string, number> = {
        End: 0,
        Begin: 4,
    };

    static readonly SaveTo: Record<string, number> = {
        Camera: 1,
        Host: 2,
        Both: 3,
    };

    static readonly WhiteBalance: Record<string, number> = {
        AutoAmbiencePriority: 0,
        Daylight: 1,
        Cloudy: 2,
        Tungsten: 3,
        Fluorescent: 4,
        Flash: 5,
        WhitePaper: 6,
        Shade: 8,
        ColorTemperature: 9,
        CustomPC1: 10,
        CustomPC2: 11,
        CustomPC3: 12,
        WhitePaper2: 15,
        WhitePaper3: 16,
        WhitePaper4: 18,
        WhitePaper5: 19,
        CustomPC4: 20,
        CustomPC5: 21,
        AutoWhitePriority: 23,
        Click: 0xffffffff,
        Pasted: 0xfffffffe,
    };
}
