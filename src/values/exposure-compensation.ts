import type { PropertyValue } from './property-value.js';

/**
 * Represents an exposure compensation value in stops.
 *
 * Positive values brighten the image, negative values darken it. Supports both
 * whole and fractional stop labels such as "+1 1/3".
 */
export class ExposureCompensation implements PropertyValue {
    [Symbol.toStringTag] = 'ExposureCompensation';

    private readonly compensation_: number;
    private readonly label_: string;

    constructor(private readonly value_: number) {
        this.compensation_ = ExposureCompensation.Values[value_] ?? 0;
        this.label_ = ExposureCompensation.getLabelForCompensation(this.compensation_);
    }

    private static getLabelForCompensation(compensation: number): string {
        if (compensation === 0) {
            return '0';
        }
        const full = compensation > 0 ? Math.floor(compensation) : Math.ceil(compensation);
        const fraction = Math.abs(compensation - full);
        let label = full > 0 ? '+' + String(full) : String(full);
        if (fraction > 0.6) {
            label += ' 2/3';
        } else if (fraction > 0.49) {
            label += ' 1/2';
        } else if (fraction > 0.3) {
            label += ' 1/3';
        }
        return label;
    }

    get label(): string {
        return this.label_;
    }

    get value(): number {
        return this.value_;
    }

    get compensation(): number {
        return this.compensation_;
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

    toJSON(): { label: string; value: number; compensation: number } {
        return { label: this.label_, value: this.value_, compensation: this.compensation_ };
    }

    private static findNearestValue(compensation: number): number | null {
        const found = Object.entries(ExposureCompensation.Values).reduce<{ value: number; difference: number }>(
            (carry, [key, current]) => {
                const difference = Math.abs(current - compensation);
                if (difference < carry.difference) {
                    return { value: +key, difference };
                }
                return carry;
            },
            { value: 0, difference: 100 },
        );
        return found.value;
    }

    static forLabel(label: string): ExposureCompensation | null {
        const match = label.match(/([+-]?\d+)\s*(?:([12])\/([23]))?/);
        if (match) {
            let compensation = parseFloat(match[1]!);
            if (match[2] && match[3]) {
                const frac = parseFloat(match[2]!) / parseFloat(match[3]!);
                compensation += compensation < 0 ? -frac : frac;
            }
            const value = ExposureCompensation.findNearestValue(compensation);
            if (value !== null) {
                return new ExposureCompensation(value);
            }
        }
        return null;
    }

    static readonly Values: Record<number, number> = {
        '0': 0,
        '3': 0.3333333333333333,
        '4': 0.5,
        '5': 0.6666666666666666,
        '8': 1,
        '11': 1.3333333333333333,
        '12': 1.5,
        '13': 1.6666666666666665,
        '16': 2,
        '19': 2.3333333333333335,
        '20': 2.5,
        '21': 2.6666666666666665,
        '24': 3,
        '27': 3.3333333333333335,
        '28': 3.5,
        '29': 3.6666666666666665,
        '32': 4,
        '35': 4.333333333333333,
        '36': 4.5,
        '37': 4.666666666666667,
        '40': 5,
        '216': -5,
        '219': -4.666666666666667,
        '220': -4.5,
        '221': -4.333333333333333,
        '224': -4,
        '227': -3.6666666666666665,
        '228': -3.5,
        '229': -3.3333333333333335,
        '232': -3,
        '235': -2.6666666666666665,
        '236': -2.5,
        '237': -2.3333333333333335,
        '240': -2,
        '243': -1.6666666666666665,
        '244': -1.5,
        '245': -1.3333333333333333,
        '248': -1,
        '251': -0.6666666666666666,
        '252': -0.5,
        '253': -0.3333333333333333,
    };
}
