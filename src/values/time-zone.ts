import type { PropertyValue } from './property-value.js';

/**
 * Represents the camera time zone setting.
 *
 * Maps the raw EDSDK value to a named city/region such as "Tokyo" or "UTC".
 */
export class TimeZone implements PropertyValue {
    [Symbol.toStringTag] = 'TimeZone';

    private readonly label_: string;
    private readonly difference_ = 0;
    private readonly zone_: number;

    constructor(private readonly value_: number) {
        this.zone_ = value_;
        this.label_ = TimeZone.Zones[value_] ?? '';
    }

    get label(): string {
        return this.label_;
    }

    get value(): number {
        return this.value_;
    }

    get zone(): number {
        return this.zone_;
    }

    get difference(): number {
        return this.difference_;
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

    toJSON(): { label: string; value: number; zone: number; difference: number } {
        return { label: this.label_, value: this.value_, zone: this.zone_, difference: this.difference_ };
    }

    static readonly Zones: Record<number, string> = {
        '0': 'None',
        '1': 'Chatham Islands',
        '2': 'Wellington',
        '3': 'Solomon Island',
        '4': 'Sydney',
        '5': 'Adeladie',
        '6': 'Tokyo',
        '7': 'Hong Kong',
        '8': 'Bangkok',
        '9': 'Yangon',
        '10': 'Dacca',
        '11': 'Kathmandu',
        '12': 'Delhi',
        '13': 'Karachi',
        '14': 'Kabul',
        '15': 'Dubai',
        '16': 'Tehran',
        '17': 'Moscow',
        '18': 'Cairo',
        '19': 'Paris',
        '20': 'London',
        '21': 'Azores',
        '22': 'Fernando de Noronha',
        '23': 'São Paulo',
        '24': 'Newfoundland',
        '25': 'Santiago',
        '26': 'Caracas',
        '27': 'New York',
        '28': 'Chicago',
        '29': 'Denver',
        '30': 'Los Angeles',
        '31': 'Anchorage',
        '32': 'Honolulu',
        '33': 'Samoa',
        '34': 'Riyadh',
        '35': 'Manaus',
        '256': 'UTC',
        '65535': 'UTC',
    };
}
