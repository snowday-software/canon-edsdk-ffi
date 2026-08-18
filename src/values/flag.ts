import type { PropertyValue } from './property-value.js';

/**
 * Represents an on/off EDSDK flag property.
 *
 * Accepts `true`/`false` or the raw numeric values `1`/`0`.
 */
export class Flag implements PropertyValue {
    [Symbol.toStringTag] = 'Flag';

    private readonly label_: string;
    private readonly value_: number;

    constructor(value: number | boolean) {
        if (typeof value === 'boolean') {
            this.value_ = value ? Flag.True : Flag.False;
        } else if (value === Flag.True) {
            this.value_ = Flag.True;
        } else {
            this.value_ = Flag.False;
        }
        this.label_ = this.value_ === Flag.True ? 'true' : 'false';
    }

    get label(): string {
        return this.label_;
    }

    get value(): number {
        return this.value_;
    }

    get flag(): boolean {
        return this.value_ !== 0;
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

    toJSON(): { label: string; value: number; flag: boolean } {
        return { label: this.label_, value: this.value_, flag: this.flag };
    }

    static forLabel(label: string): Flag | null {
        if (['true', '1', 'yes', 'on'].includes(label.toLowerCase())) {
            return new Flag(Flag.True);
        }
        return new Flag(Flag.False);
    }

    static readonly True = 1;
    static readonly False = 0;
}
