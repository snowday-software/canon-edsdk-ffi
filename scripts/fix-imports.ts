import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function fixImports(content: string): string {
    return content.replace(/(from\s+['"]\.\/[^'"]+)(['"])/g, (match, path, quote) => {
        if (/\.[a-zA-Z0-9]+$/.test(path)) {
            return match;
        }
        return `${path}.js${quote}`;
    });
}

async function collectTsFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith('.ts')).map((e) => join(dir, e.name));
}

const files = await collectTsFiles('src');
for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const fixed = fixImports(content);
    if (fixed !== content) {
        await writeFile(file, fixed, 'utf-8');
        console.log(`Fixed imports in ${file}`);
    }
}
