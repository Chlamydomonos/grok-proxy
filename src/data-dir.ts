import path from 'path';

let tempDataDir = path.resolve(__dirname, '..');

if (process.env.DATA_DIR) {
    tempDataDir = process.env.DATA_DIR;
}

export const dataDir = path.resolve(tempDataDir);
