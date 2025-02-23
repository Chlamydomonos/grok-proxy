import fs from 'fs';
import path from 'path';
import { exit } from 'process';
import yaml from 'yaml';
import { dataDir } from './data-dir';

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
    const configPath = path.resolve(dataDir, 'config.yml');
    if (!fs.existsSync(configPath)) {
        console.log('\x1B[31mConfig file does not exist, try regenerate with pnpm install\x1B[0m');
        exit(-1);
    }
    try {
        const config = yaml.parse(fs.readFileSync(configPath).toString());
        if (!checkConfig(config)) {
            throw new Error();
        }
        return config;
    } catch (e) {
        console.log('\x1B[31mBroken config, try delete config.yml and regenerate with pnpm install\n\x1B[0m');
        exit(-1);
    }
};

export const config = loadConfig();
