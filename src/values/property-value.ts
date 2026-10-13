/** Common interface for all typed property value wrappers. */
export interface PropertyValue {
    value: number;
    label: string;
    toJSON?(): unknown;
}
