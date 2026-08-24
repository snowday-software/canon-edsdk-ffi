import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { initializeAndConnect, disconnectAndTerminate, getCamera, sleep } from './setup.js';

async function main() {
    await initializeAndConnect();
    const camera = getCamera();
    const rl = createInterface({ input: stdin, output: stdout });
    let unlocked = false;

    try {
        await rl.question('Press Enter when you are ready to lock the camera UI and try the buttons.');

        camera.lockUI();
        console.log();
        console.log('The camera UI is now LOCKED.');
        console.log('For the next 10 seconds, try pressing buttons on the camera body.');
        console.log('They should be unresponsive while the lock is active.');
        console.log('The UI will unlock automatically after 10 seconds...');

        await sleep(10000);

        camera.unlockUI();
        unlocked = true;
        console.log('The camera UI is now UNLOCKED.');

        const answer = await rl.question('Did the camera buttons stay blocked while the UI was locked? (y/n) ');
        if (answer.trim().toLowerCase().startsWith('n')) {
            console.error('User reported that the camera buttons were not blocked during UI lock.');
            process.exitCode = 1;
        } else {
            console.log('UI lock test passed.');
        }
    } finally {
        if (!unlocked) {
            try {
                camera.unlockUI();
            } catch {
                // best-effort cleanup
            }
        }
        rl.close();
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(disconnectAndTerminate);
