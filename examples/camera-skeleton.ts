import EDSDK from '../src/index.js';

EDSDK.cameraBrowser.setEventHandler((eventName, event) => {
    if ('camera' in event) {
        console.log(`[Event] ${eventName} - ${event.camera.description}`);
    } else {
        console.log(`[Error] ${eventName} - ${(event as EDSDK.ApiError).label}`);
    }
});

try {
    EDSDK.cameraBrowser.initialize();
    console.log(
        'Cameras:',
        EDSDK.cameraBrowser.getCameras().map((c) => c.description),
    );

    const camera = EDSDK.cameraBrowser.getCamera();
    if (camera) {
        camera.connect();
        console.log('Connected to:', camera.description, 'on', camera.portName);

        camera.setProperties({
            [EDSDK.CameraProperty.ID.SaveTo]: EDSDK.Option.SaveTo.Host,
        });

        const stop = EDSDK.watchCameras(500);

        setTimeout(() => {
            console.log('Taking picture...');
            camera.takePicture();
        }, 2000);

        setTimeout(() => {
            stop();
            camera.disconnect();
            EDSDK.cameraBrowser.terminate();
            console.log('Done.');
        }, 10000);
    } else {
        console.log('No camera found.');
        EDSDK.cameraBrowser.terminate();
    }
} catch (err: any) {
    console.error('EDSDK skeleton failed:', err.EDS_ERROR ? err.EDS_ERROR.toJSON() : err.message);
    process.exit(1);
}
