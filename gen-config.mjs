import fs from 'fs';
import path from 'path';

let rootPath = path.resolve(import.meta.dirname);
if (process.env.DATA_DIR) {
    rootPath = process.env.DATA_DIR;
}

const configPath = path.resolve(rootPath, 'config.yml');
const cookiesPath = path.resolve(rootPath, 'cookies');

if (!fs.existsSync(cookiesPath)) {
    fs.mkdirSync(cookiesPath, { recursive: true });
}

if (!fs.existsSync(configPath)) {
    const initialConfig = fs.readFileSync('config.yml.template').toString();
    fs.writeFileSync(configPath, initialConfig);
}
