import type { PropertyValue } from './property-value.js';

/** Bit-packed components of an image quality setting. */
export interface ImageQualityProperties {
    format: number;
    size: number;
    quality: number;
}

/**
 * Represents the camera image quality setting.
 *
 * The raw value packs the main and secondary recording settings into a single
 * 32-bit number. `ImageQuality` decodes that into format, size, and compression
 * components.
 */
export class ImageQuality implements PropertyValue {
    [Symbol.toStringTag] = 'ImageQuality';

    private readonly label_: string;

    constructor(private readonly value_: number) {
        this.label_ =
            Object.entries(ImageQuality.ID).find(([, v]) => v === value_)?.[0] ??
            '0x' + value_.toString(16).padStart(8, '0');
    }

    private static extractBits(buffer: number, offset: number, length: number): number {
        return ((1 << length) - 1) & (buffer >> offset);
    }

    get label(): string {
        return this.label_;
    }

    get value(): number {
        return this.value_;
    }

    get main(): ImageQualityProperties {
        return {
            format: ImageQuality.extractBits(this.value_, 24, 8),
            size: ImageQuality.extractBits(this.value_, 20, 4),
            quality: ImageQuality.extractBits(this.value_, 16, 4),
        };
    }

    get secondary(): ImageQualityProperties {
        return {
            format: ImageQuality.extractBits(this.value_, 8, 4),
            size: ImageQuality.extractBits(this.value_, 4, 4),
            quality: ImageQuality.extractBits(this.value_, 0, 4),
        };
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

    toJSON(): {
        label: string;
        value: number;
        main: ImageQualityProperties;
        secondary: ImageQualityProperties;
    } {
        return {
            label: this.label_,
            value: this.value_,
            main: this.main,
            secondary: this.secondary,
        };
    }

    static forLabel(label: string): ImageQuality | null {
        const value = ImageQuality.ID[label as keyof typeof ImageQuality.ID];
        return value !== undefined ? new ImageQuality(value) : null;
    }

    static readonly ID = {
        CR: 6553359,
        CRHEIFL: 6488192,
        CRHEIFLF: 6488195,
        CRHEIFLN: 6488194,
        CRHEIFMF: 6488451,
        CRHEIFMN: 6488450,
        CRHEIFS1F: 6491779,
        CRHEIFS1N: 6491778,
        CRHEIFS2F: 6492035,
        CRLJ: 6488080,
        CRLJF: 6488083,
        CRLJN: 6488082,
        CRM1J: 6489360,
        CRM1JF: 6489363,
        CRM1JN: 6489362,
        CRM2J: 6489616,
        CRM2JF: 6489619,
        CRM2JN: 6489618,
        CRMJ: 6488336,
        CRMJF: 6488339,
        CRMJN: 6488338,
        CRS1J: 6491664,
        CRS1JF: 6491667,
        CRS1JN: 6491666,
        CRS2J: 6491920,
        CRS2JF: 6491923,
        CRS3JF: 6492179,
        CRSJ: 6488592,
        CRSJF: 6488595,
        CRSJN: 6488594,
        HEIFL: 8453903,
        HEIFLF: 8650511,
        HEIFLN: 8584975,
        HEIFMF: 25427727,
        HEIFMN: 25362191,
        HEIFS1F: 243531535,
        LargeJPEG: 1113871,
        LargeJPEGFine: 1310479,
        LargeJPEGNormal: 1244943,
        Middle1JPEG: 84999951,
        Middle2JPEG: 101777167,
        MiddleJPEG: 17891087,
        MiddleJPEGFine: 18087695,
        MiddleJPEGNormal: 18022159,
        MR: 23396111,
        MRLJ: 23330832,
        MRLJF: 23330835,
        MRLJN: 23330834,
        MRM1J: 23332112,
        MRM2J: 23332368,
        MRMJF: 23331091,
        MRMJN: 23331090,
        MRS1JF: 23334419,
        MRS1JN: 23334418,
        MRS2JF: 23334675,
        MRS3JF: 23334931,
        MRSJ: 23331344,
        MRSJF: 23331347,
        MRSJN: 23331346,
        RAW: 6618895,
        RAWAndLargeJPEG: 6553616,
        RAWAndLargeJPEGFine: 6553619,
        RAWAndLargeJPEGNormal: 6553618,
        RAWAndMiddle1JPEG: 6554896,
        RAWAndMiddle2JPEG: 6555152,
        RAWAndMiddleJPEG: 6553872,
        RAWAndMiddleJPEGFine: 6553875,
        RAWAndMiddleJPEGNormal: 6553874,
        RAWAndSmall1JPEG: 6557200,
        RAWAndSmall1JPEGFine: 6557203,
        RAWAndSmall1JPEGNormal: 6557202,
        RAWAndSmall2JPEG: 6557456,
        RAWAndSmall2JPEGFine: 6557459,
        RAWAndSmall3JPEGFine: 6557715,
        RAWAndSmallJPEG: 6554128,
        RAWAndSmallJPEGFine: 6554131,
        RAWAndSmallJPEGNormal: 6554130,
        RHEIFL: 6553728,
        RHEIFLF: 6553731,
        RHEIFLN: 6553730,
        RHEIFMF: 6553987,
        RHEIFMN: 6553986,
        RHEIFS1F: 6557315,
        RHEIFS1N: 6557314,
        RHEIFS2F: 6557571,
        Small1JPEGFine: 236191503,
        Small1JPEGNormal: 236125967,
        Small2JPEGFine: 252968719,
        Small3JPEGFine: 269745935,
        SmallJPEG: 34668303,
        SmallJPEG1: 235994895,
        SmallJPEG2: 252772111,
        SmallJPEGFine: 34864911,
        SmallJPEGNormal: 34799375,
        SR: 40173327,
        SRLJ: 40108048,
        SRLJF: 40108051,
        SRLJN: 40108050,
        SRM1J: 40109328,
        SRM2J: 40109584,
        SRMJF: 40108307,
        SRMJN: 40108306,
        SRS1JF: 40111635,
        SRS1JN: 40111634,
        SRS2JF: 40111891,
        SRS3JF: 40112147,
        SRSJ: 40108560,
        SRSJF: 40108563,
        SRSJN: 40108562,
        Unknown: 4294967295,
    } as const;

    static readonly Format = {
        Unknown: 0,
        JPEG: 1,
        CRW: 2,
        RAW: 4,
        CR2: 6,
        HEIF: 8,
    } as const;

    static readonly Size = {
        Large: 0,
        Middle: 1,
        Small: 2,
        Middle1: 5,
        Middle2: 6,
        Small1: 14,
        Small2: 15,
        Small3: 16,
        Unknown: 0xffffffff,
    } as const;

    static readonly CompressionQuality = {
        Normal: 2,
        Fine: 3,
        Lossless: 4,
        SuperFine: 5,
        Unknown: 0xffffffff,
    } as const;
}
