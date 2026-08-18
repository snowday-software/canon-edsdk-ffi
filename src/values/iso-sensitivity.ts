import type { PropertyValue } from './property-value.js';

/**
 * Represents the ISO sensitivity setting.
 *
 * Decodes the raw EDSDK value into the actual ISO number, including an
 * "Auto" value.
 */
export class ISOSensitivity implements PropertyValue {
    [Symbol.toStringTag] = 'ISOSensitivity';

    private readonly label_: string;
    private readonly sensitivity_: number;

    constructor(private readonly value_: number) {
        if (value_ === 0) {
            this.label_ = 'Auto';
            this.sensitivity_ = 0;
        } else {
            this.sensitivity_ = ISOSensitivity.Values[`${value_}`] ?? 0;
            this.label_ = this.sensitivity_.toString();
        }
    }

    get label(): string {
        return this.label_;
    }

    get value(): number {
        return this.value_;
    }

    get sensitivity(): number {
        return this.sensitivity_;
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

    toJSON(): { label: string; value: number; sensitivity: number } {
        return { label: this.label_, value: this.value_, sensitivity: this.sensitivity_ };
    }

    static findNearest(valueOrLabel: number | string, filter?: (iso: ISOSensitivity) => boolean): ISOSensitivity | null {
        let sensitivity: number;
        if (typeof valueOrLabel === 'string') {
            const iso = ISOSensitivity.forLabel(valueOrLabel);
            if (!iso) {
                return null;
            }
            sensitivity = iso.sensitivity;
        } else {
            sensitivity = new ISOSensitivity(valueOrLabel).sensitivity;
        }
        const found = Object.keys(ISOSensitivity.Values).reduce<{ value: number; difference: number } | null>(
            (carry, key) => {
                const current = ISOSensitivity.Values[key]!;
                const difference = Math.abs(current - sensitivity);
                if (!carry || difference < carry.difference) {
                    if (filter && !filter(new ISOSensitivity(+key))) {
                        return carry;
                    }
                    return { value: +key, difference };
                }
                return carry;
            },
            null,
        );
        return found ? new ISOSensitivity(found.value) : null;
    }

    static forLabel(label: string): ISOSensitivity | null {
        if (label in ISOSensitivity.ID) {
            return new ISOSensitivity(ISOSensitivity.ID[label]!);
        }
        const key = Object.keys(ISOSensitivity.Values).find((k) => ISOSensitivity.Values[k] === +label);
        return key ? new ISOSensitivity(+key) : null;
    }

    static readonly ID: Record<string, number> = {
        Auto: 0,
    };

    static readonly Values: Record<string, number> = {
        '40': 6,
        '48': 12,
        '56': 25,
        '64': 50,
        '72': 100,
        '75': 125,
        '77': 160,
        '80': 200,
        '83': 250,
        '85': 320,
        '88': 400,
        '91': 500,
        '93': 640,
        '96': 800,
        '99': 1000,
        '101': 1250,
        '104': 1600,
        '107': 2000,
        '109': 2500,
        '112': 3200,
        '115': 4000,
        '117': 5000,
        '120': 6400,
        '123': 8000,
        '125': 10000,
        '128': 12800,
        '131': 16000,
        '133': 20000,
        '136': 25600,
        '139': 32000,
        '141': 40000,
        '144': 51200,
        '147': 64000,
        '149': 80000,
        '152': 102400,
        '160': 204800,
        '168': 409600,
        '176': 819200,
    };
}
