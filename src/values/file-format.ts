import type { PropertyValue } from './property-value.js';

/**
 * Represents the format of a camera file, such as JPEG, CR2, CR3, HEIF, or MP4.
 */
export class FileFormat implements PropertyValue {
    [Symbol.toStringTag] = 'FileFormat';

    private readonly label_: string;

    constructor(private readonly value_: number) {
        this.label_ =
            Object.entries(FileFormat.ID).find(([, id]) => id === value_)?.[0] ??
            `0x${value_.toString(16).padStart(8, '0')}`;
    }

    get label(): string {
        return this.label_;
    }

    get value(): number {
        return this.value_;
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

    toJSON(): { label: string; value: number } {
        return { label: this.label_, value: this.value_ };
    }

    static forLabel(label: string): FileFormat | null {
        const value = FileFormat.ID[label as keyof typeof FileFormat.ID];
        return value !== undefined ? new FileFormat(value) : null;
    }

    static readonly ID = {
        Unknown: 0,
        JPEG: 0x3801,
        CR2: 0xb103,
        CR3: 0xb108,
        HEIF_CODE: 0xb10b,
        MP4: 0xb982,
    } as const;
}
