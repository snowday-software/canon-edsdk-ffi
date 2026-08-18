/**
 * Base class for EDSDK identifier wrappers.
 *
 * Converts a raw numeric identifier to a human-readable label by looking it up
 * in a static ID record.
 */
export abstract class ApiIdentifier {
    [Symbol.toStringTag] = 'ApiIdentifier';

    private readonly label_: string;

    protected constructor(
        private readonly identifier_: number,
        private readonly labels: { [label: string]: number },
    ) {
        this.label_ =
            Object.keys(labels).find((key) => labels[key] === identifier_) ??
            `0x${identifier_.toString(16).padStart(8, '0')}`;
    }

    get label(): string {
        return this.label_;
    }

    get identifier(): number {
        return this.identifier_;
    }

    [Symbol.toPrimitive](hint: string): string | number | null {
        switch (hint) {
            case 'number':
                return this.identifier_;
            case 'string':
                return `0x${this.identifier_.toString(16).padStart(8, '0')}`;
            default:
                return null;
        }
    }

    equalTo(other: number): boolean {
        return this.identifier_ === +other;
    }

    toJSON(): { identifier: number; label: string } {
        return { identifier: this.identifier_, label: this.label_ };
    }
}
