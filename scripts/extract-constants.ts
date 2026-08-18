import fs from 'node:fs';
import path from 'node:path';

const SDK_ROOT = path.resolve(process.cwd(), 'vendor', 'sdk');
const outputFile = path.resolve(process.cwd(), 'src/ffi/constants.ts');

function findHeader(name: string): string | null {
    if (!fs.existsSync(SDK_ROOT)) {
        return null;
    }
    const entries = fs.readdirSync(SDK_ROOT, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
        if (entry.isFile() && entry.name === name) {
            return path.resolve(entry.parentPath, entry.name);
        }
    }
    return null;
}

const skipNames = new Set([
    'EDSCALLBACK',
    'EDSEXPORT',
    'EDSIMPORT',
    'EDSSTDCALL',
    'EDC',
    'EDS',
    'EDSDK',
    'EDSDC',
    'EDSDEV', // not real macros
]);

function tokenizeDefineValue(val: string): string | number | undefined {
    const v = val.trim();
    if (v === '' || v.startsWith('(')) {
        return undefined;
    }

    // Strip trailing L/U/UL suffixes
    const clean = v.replace(/^[+-]?/, (m) => m).replace(/(?:UL|Ll?|ll?|u|U)$/, '');

    if (clean.startsWith('0x') || clean.startsWith('0X')) {
        const n = parseInt(clean, 16);
        if (!Number.isNaN(n)) {
            return n;
        }
    }

    if (/^\d+$/.test(clean)) {
        return parseInt(clean, 10);
    }

    // Not a literal number; skip (e.g. __stdcall, another macro)
    return undefined;
}

function parseFile(file: string) {
    const text = fs.readFileSync(file, 'utf-8');
    const lines = text.split(/\r?\n/);

    const constants: { name: string; value: number }[] = [];
    const seen = new Set<string>();

    const defineRe = /^\s*#define\s+(\w+)\s+(.+)$/;

    let inEnum = false;
    let pendingValue = 0;

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const line = raw.replace(/\/\/.*$/, '').trim();

        const def = defineRe.exec(raw);
        if (def) {
            const name = def[1];
            const value = tokenizeDefineValue(def[2]);
            if (typeof value === 'number' && !skipNames.has(name) && !seen.has(name)) {
                constants.push({ name, value });
                seen.add(name);
            }
            continue;
        }

        if (/\benum\b/.test(line)) {
            inEnum = true;
            pendingValue = 0;
            if (!line.includes('{')) {
                // Look for { on next non-empty line
                let j = i + 1;
                while (j < lines.length && lines[j].trim() === '') {
                    j++;
                }
                if (j < lines.length && lines[j].includes('{')) {
                    // continue as inEnum
                } else {
                    inEnum = false;
                }
            }
            continue;
        }

        if (inEnum) {
            if (line.includes('}')) {
                inEnum = false;
                continue;
            }
            if (line === '' || line === '{') {
                continue;
            }

            const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:=\s*([^,]+))?/);
            if (m) {
                const name = m[1];
                const rawVal = m[2]?.trim();
                let value: number;
                if (rawVal) {
                    const t = tokenizeDefineValue(rawVal);
                    value = typeof t === 'number' ? t : pendingValue;
                } else {
                    value = pendingValue;
                }
                pendingValue = value + 1;
                if (!skipNames.has(name) && !seen.has(name)) {
                    constants.push({ name, value });
                    seen.add(name);
                }
            }
        }
    }

    return constants;
}

type Group = { name: string; members: [string, number][] };

function collectGroups(constants: Map<string, number>): Group[] {
    const groups: Group[] = [];

    function addGroup(name: string, members: [string, number][]): void {
        groups.push({ name, members: members.sort((a, b) => a[0].localeCompare(b[0])) });
    }

    function collectByPrefix(prefix: string, strip: string): [string, number][] {
        const members: [string, number][] = [];
        for (const [key, value] of constants) {
            if (key.startsWith(prefix)) {
                members.push([key.slice(strip.length), value]);
            }
        }
        return members;
    }

    // ErrorCode: EDS_ERR_* and EDS_OK
    const errorCode: [string, number][] = [];
    if (constants.has('EDS_OK')) {
        errorCode.push(['OK', constants.get('EDS_OK')!]);
    }
    for (const [key, value] of constants) {
        if (key.startsWith('EDS_ERR_')) {
            errorCode.push([key.slice('EDS_ERR_'.length), value]);
        }
    }
    addGroup('ErrorCode', errorCode);

    addGroup('PropertyID', collectByPrefix('kEdsPropID_', 'kEdsPropID_'));
    addGroup('DataType', collectByPrefix('kEdsDataType_', 'kEdsDataType_'));

    // CameraCommand + ShutterButton both live under kEdsCameraCommand_
    const cameraCommand = collectByPrefix('kEdsCameraCommand_', 'kEdsCameraCommand_').filter(
        ([key]) => !key.startsWith('ShutterButton_'),
    );
    addGroup('CameraCommand', cameraCommand);

    const shutterButton: [string, number][] = [];
    for (const [key, value] of constants) {
        if (key.startsWith('kEdsCameraCommand_ShutterButton_')) {
            shutterButton.push([key.slice('kEdsCameraCommand_ShutterButton_'.length).replace(/_/g, ''), value]);
        }
    }
    addGroup('ShutterButton', shutterButton);

    addGroup('CameraStatusCommand', collectByPrefix('kEdsCameraStatusCommand_', 'kEdsCameraStatusCommand_'));
    addGroup('PropertyEvent', collectByPrefix('kEdsPropertyEvent_', 'kEdsPropertyEvent_'));
    addGroup('ObjectEvent', collectByPrefix('kEdsObjectEvent_', 'kEdsObjectEvent_'));
    addGroup('StateEvent', collectByPrefix('kEdsStateEvent_', 'kEdsStateEvent_'));
    addGroup('EvfOutputDevice', collectByPrefix('kEdsEvfOutputDevice_', 'kEdsEvfOutputDevice_'));
    addGroup('FileCreateDisposition', collectByPrefix('kEdsFileCreateDisposition_', 'kEdsFileCreateDisposition_'));
    addGroup('Access', collectByPrefix('kEdsAccess_', 'kEdsAccess_'));
    addGroup('StorageType', collectByPrefix('kEdsStorageType_', 'kEdsStorageType_'));
    addGroup('SaveTo', collectByPrefix('kEdsSaveTo_', 'kEdsSaveTo_'));

    return groups;
}

function renderGroup(group: Group): string {
    const lines = group.members.map(([key, value]) => `    ${key}: ${value},`);
    return `export const ${group.name} = {\n${lines.join('\n')}\n};`;
}

function main() {
    const typesFile = findHeader('EDSDKTypes.h');
    const errorsFile = findHeader('EDSDKErrors.h');
    if (!typesFile || !errorsFile) {
        console.error(`Could not find EDSDK headers in ${SDK_ROOT}.`);
        process.exit(1);
    }

    const types = parseFile(typesFile);
    const errors = parseFile(errorsFile);

    const constants = new Map<string, number>();
    for (const c of [...types, ...errors]) {
        if (!constants.has(c.name)) {
            constants.set(c.name, c.value);
        }
    }

    const sections: string[] = [];
    sections.push('/* Auto-generated from Canon EDSDK headers */');
    sections.push('');
    sections.push('export const EDS_TRANSFER_BLOCK_SIZE = 512;');
    sections.push('');

    const groups = collectGroups(constants);
    for (const group of groups) {
        sections.push(renderGroup(group));
        sections.push('');
    }

    fs.writeFileSync(outputFile, sections.join('\n').replace(/\n+$/g, '\n'));
    console.log(`Wrote ${constants.size} constants and ${groups.length} groups to ${outputFile}`);
}

main();
