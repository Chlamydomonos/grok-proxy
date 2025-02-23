import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { dataDir } from './data-dir';

class CookiePool<T> {
    private remainingQuotas: Record<string, number>;
    private timers: Record<string, { timeout: NodeJS.Timeout; state: { stillAvailable: boolean } } | null>;

    constructor(
        private cookies: Record<string, T> = {},
        private maxQuota: number = 15,
        private recoverTimeMs: number = 7200000
    ) {
        this.remainingQuotas = Object.assign({}, ...Object.entries(cookies).map(([key]) => [key, maxQuota]));
        this.timers = Object.assign({}, ...Object.entries(cookies).map(([key]) => [key, null]));
    }

    getCookie(name: string) {
        if (!(name in this.cookies)) {
            return undefined;
        }

        if (this.remainingQuotas[name] <= 0) {
            return undefined;
        }

        this.remainingQuotas[name]--;

        if (!this.timers[name]) {
            const state = { stillAvailable: true };
            this.timers[name] = {
                timeout: setTimeout(() => {
                    if (!state.stillAvailable) {
                        return;
                    }
                    this.remainingQuotas[name] = this.maxQuota;
                    this.timers[name] = null;
                }, this.recoverTimeMs),
                state,
            };
        }

        return this.cookies[name];
    }

    getRandom() {
        const availableKeys: string[] = [];
        for (const [key, quota] of Object.entries(this.remainingQuotas)) {
            if (quota > 0) {
                availableKeys.push(key);
            }
        }

        if (availableKeys.length === 0) {
            return undefined;
        }

        const randomKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];

        this.remainingQuotas[randomKey]--;

        if (!this.timers[randomKey]) {
            const state = { stillAvailable: true };
            this.timers[randomKey] = {
                timeout: setTimeout(() => {
                    if (!state.stillAvailable) {
                        return;
                    }
                    this.remainingQuotas[randomKey] = this.maxQuota;
                    this.timers[randomKey] = null;
                }, this.recoverTimeMs),
                state,
            };
        }

        return this.cookies[randomKey];
    }

    addCookie(name: string, cookie: T) {
        this.cookies[name] = cookie;
        this.remainingQuotas[name] = this.maxQuota;
        if (this.timers[name]) {
            this.timers[name].state.stillAvailable = false;
        }
        this.timers[name] = null;
    }

    removeCookie(name: string) {
        delete this.cookies[name];
        delete this.remainingQuotas[name];
        if (this.timers[name]) {
            this.timers[name].state.stillAvailable = false;
        }
        delete this.timers[name];
    }

    has(name: string) {
        return name in this.cookies;
    }
}

export type Cookie = { name: string; value: string; domain: string; path: string }[];

const getSessionCookie = (cookieString: string) => {
    const matchRe = /([^;\s]+)=([^;\s]+);/g;
    let result: Cookie = [];
    while (true) {
        let newMatch = matchRe.exec(cookieString);
        if (!newMatch) {
            return result;
        }

        result.push({ name: newMatch[1], value: newMatch[2], domain: '.x.com', path: '/' });
    }
};

export const createCookiePool = () => {
    const cookieDir = path.resolve(dataDir, 'cookies');
    const pool = new CookiePool<{ cookie: Cookie; name: string }>();
    chokidar.watch(cookieDir).on('all', (event, fullPath) => {
        const fileName = path.basename(fullPath);
        const matchTxt = /^(.+)\.txt$/.exec(fileName);
        if (!matchTxt) {
            return;
        }
        const cookieName = matchTxt[1];
        if (event == 'add') {
            console.log(`\n\x1B[36m[${new Date().toLocaleString()}] Detected new cookie file ${fileName}\x1B[0m`);
            const content = fs.readFileSync(fullPath).toString();
            try {
                const cookie = getSessionCookie(content);
                if (cookie.length == 0) {
                    throw new Error();
                }
                pool.addCookie(cookieName, { cookie, name: cookieName });
            } catch (e) {
                console.log('\x1B[31mThis cookie file is broken, skipped\x1B[0m');
            }
        } else if (event == 'change') {
            console.log(`\n\x1B[36m[${new Date().toLocaleString()}] Detected changed cookie file ${fileName}\x1B[0m`);
            const content = fs.readFileSync(fullPath).toString();
            try {
                const cookie = getSessionCookie(content);
                if (cookie.length == 0) {
                    throw new Error();
                }
                pool.addCookie(cookieName, { cookie, name: cookieName });
            } catch (e) {
                console.log('\x1B[31mThis cookie file is broken, skipped\x1B[0m');
                pool.removeCookie(cookieName);
            }
        } else if (event == 'unlink') {
            console.log(`\n\x1B[36m[${new Date().toLocaleString()}] Detected deleted cookie file ${fileName}\x1B[0m`);
            pool.removeCookie(cookieName);
        }
    });
    return pool;
};
