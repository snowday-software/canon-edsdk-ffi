import type { PropertyValue } from './property-value.js';

type OutputDeviceStatusList = { [deviceName: string]: boolean };

/**
 * Represents the live view output device selection.
 *
 * This is a flag-style property that can enable output to the camera TFT, the
 * PC, or a small PC window.
 */
export class OutputDevice implements PropertyValue {
    [Symbol.toStringTag] = 'OutputDevice';

    private readonly label_: string;
    private readonly value_: number;

    constructor(value: number) {
        this.value_ = value;
        const deviceNames: string[] = [];
        for (const [deviceName, id] of Object.entries(OutputDevice.ID)) {
            if (id > 0 && this.isEnabled(id)) {
                deviceNames.push(deviceName);
            }
        }
        this.label_ = deviceNames.join(', ') || 'None';
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

    isEnabled(deviceID: number): boolean {
        return deviceID > 0 && (this.value_ & deviceID) === deviceID;
    }

    getDevices(): OutputDeviceStatusList {
        const devices: OutputDeviceStatusList = {};
        for (const [deviceName, id] of Object.entries(OutputDevice.ID)) {
            if (id > 0) {
                devices[deviceName] = this.isEnabled(id);
            }
        }
        return devices;
    }

    toJSON(): { label: string; value: number; devices: OutputDeviceStatusList } {
        return { label: this.label_, value: this.value_, devices: this.getDevices() };
    }

    static forLabel(label: string): OutputDevice | null {
        const deviceNames = label.match(/[\w\d]+/g) || [];
        let value = OutputDevice.ID.None ?? 0;
        for (const deviceName of deviceNames) {
            const id = OutputDevice.ID[deviceName as keyof typeof OutputDevice.ID];
            if (id !== undefined) {
                value |= id;
            }
        }
        return new OutputDevice(value);
    }

    static readonly ID = {
        None: 0,
        TFT: 1,
        PC: 2,
        PCSmall: 8,
    } as const;
}
