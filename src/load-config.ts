import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

interface Config {
    channel: string;
    headless: boolean;
    port: number;
}

export const loadConfig = () => {
    const configPath = path.resolve(__dirname, '../config.yml');
    return yaml.parse(fs.readFileSync(configPath).toString()) as Config;
};
