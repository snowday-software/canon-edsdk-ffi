import { ApiIdentifier } from './api-identifier.js';

/**
 * Represents a camera state event, such as shutdown or shut-down timer updates.
 */
export class StateEvent extends ApiIdentifier {
    [Symbol.toStringTag] = 'StateEvent';

    constructor(identifier: number) {
        super(identifier, StateEvent.ID);
    }

    equalTo(other: number | StateEvent): boolean {
        return super.equalTo(+other);
    }

    static readonly ID: Record<string, number> = {
        All: 0x300,
        Shutdown: 0x301,
        JobStatusChanged: 0x302,
        WillSoonShutDown: 0x303,
        ShutDownTimerUpdate: 0x304,
        CaptureError: 0x305,
        InternalError: 0x306,
        AfResult: 0x309,
        BulbExposureTime: 0x310,
        PowerZoomInfoChanged: 0x311,
    };
}
