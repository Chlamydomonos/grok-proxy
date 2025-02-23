import fs from 'fs';
import path from 'path';
import { exit } from 'process';
import yaml from 'yaml';

interface Config {
    channel: string;
    headless: boolean;
    port: number;
    maxTimeout: number;
}

const checkConfig = (config: any): config is Config => {
    if (config.channel === undefined) {
        return false;
    }
    if (config.headless === undefined) {
        return false;
    }
    if (config.port === undefined) {
        return false;
    }
    if (config.maxTimeout === undefined) {
        return false;
    }
    return true;
};

const loadConfig = () => {
    const configPath = path.resolve(__dirname, '../config.yml');
    const config = yaml.parse(fs.readFileSync(configPath).toString());
    if (!checkConfig(config)) {
        console.log('\x1B[31mBroken config, try delete config.yml and regenerate with pnpm install\n\x1B[0m');
        exit(0);
    }
    return config;
};

export const config = loadConfig();
