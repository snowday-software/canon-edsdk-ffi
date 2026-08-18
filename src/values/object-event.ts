import { ApiIdentifier } from './api-identifier.js';

/**
 * Represents an object event, such as a directory item being created or a file
 * transfer request.
 */
export class ObjectEvent extends ApiIdentifier {
    [Symbol.toStringTag] = 'ObjectEvent';

    constructor(identifier: number) {
        super(identifier, ObjectEvent.ID);
    }

    equalTo(other: number | ObjectEvent): boolean {
        return super.equalTo(+other);
    }

    static readonly ID: Record<string, number> = {
        All: 0x200,
        VolumeInfoChanged: 0x201,
        VolumeUpdateItems: 0x202,
        FolderUpdateItems: 0x203,
        DirItemCreated: 0x204,
        DirItemRemoved: 0x205,
        DirItemInfoChanged: 0x206,
        DirItemContentChanged: 0x207,
        DirItemRequestTransfer: 0x208,
        DirItemRequestTransferDT: 0x209,
        DirItemCancelTransferDT: 0x20a,
        VolumeAdded: 0x20c,
        VolumeRemoved: 0x20d,
    };
}
