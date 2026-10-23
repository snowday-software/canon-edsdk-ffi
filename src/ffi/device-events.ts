import koffi from 'koffi';

/**
 * EDSDK's device arrival/removal notifications are not delivered by
 * `EdsGetEvent` alone — on macOS they arrive through CFRunLoop sources
 * installed on the `EdsInitializeSDK` thread, and on Windows through
 * `WM_DEVICECHANGE` messages posted to a hidden window on that thread.
 * Neither a Node process nor an Electron utility process spins a CFRunLoop
 * or a Win32 message loop, so those notifications starve: the added handler
 * is never invoked and `EdsGetCameraList` keeps reporting the camera set
 * that existed at init. Pumping the platform event source alongside
 * `EdsGetEvent` lets device changes reach the SDK.
 */

/** `kCFRunLoopRunHandledSource` — pump until sources are drained. */
const CF_HANDLED_SOURCE = 4;
const CORE_FOUNDATION = '/System/Library/Frameworks/CoreFoundation.framework/Versions/A/CoreFoundation';
const PM_REMOVE = 1;

type PumpFn = () => void;

let pump_: PumpFn | null | undefined;

function loadRunLoopPump(): PumpFn | null {
    if (process.platform !== 'darwin') {
        return null;
    }
    try {
        const cf = koffi.load(CORE_FOUNDATION);
        const libSystem = koffi.load('libSystem.B.dylib');
        const dlopen = libSystem.func('void *dlopen(const char *path, int mode)');
        const dlsym = libSystem.func('void *dlsym(void *handle, const char *symbol)');
        // dlsym returns the address of the exported constant — dereference once
        const defaultMode = koffi.decode(dlsym(dlopen(CORE_FOUNDATION, 2), 'kCFRunLoopDefaultMode'), 'void *');
        const runInMode = cf.func('int32 CFRunLoopRunInMode(void *mode, double seconds, bool returnAfterSourceHandled)');
        return () => {
            // drain all currently-pending sources without blocking
            for (let i = 0; i < 64; i++) {
                if (runInMode(defaultMode, 0, true) !== CF_HANDLED_SOURCE) {
                    break;
                }
            }
        };
    } catch {
        return null;
    }
}

function loadWin32Pump(): PumpFn | null {
    if (process.platform !== 'win32') {
        return null;
    }
    try {
        const user32 = koffi.load('user32.dll');
        const peekMessage = user32.func(
            'bool PeekMessageW(void *msg, void *hwnd, uint32 filterMin, uint32 filterMax, uint32 removeMsg)',
        );
        const translateMessage = user32.func('bool TranslateMessage(void *msg)');
        const dispatchMessage = user32.func('intptr_t DispatchMessageW(void *msg)');
        // MSG is 48 bytes on x64 — only ever written by PeekMessage, never read here
        const msg = koffi.alloc('uint8_t', 64);
        return () => {
            // drain the thread's message queue without blocking
            for (let i = 0; i < 64; i++) {
                if (!peekMessage(msg, null, 0, 0, PM_REMOVE)) {
                    break;
                }
                translateMessage(msg);
                dispatchMessage(msg);
            }
        };
    } catch {
        return null;
    }
}

/**
 * Services pending platform event sources on the current thread
 * (non-blocking): CFRunLoop sources on macOS, the Win32 message queue on
 * Windows. No-op on other platforms or if the bindings can't load.
 */
export function pumpDeviceEvents(): void {
    if (pump_ === undefined) {
        pump_ = loadRunLoopPump() ?? loadWin32Pump();
    }
    pump_?.();
}
