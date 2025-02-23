import fs from 'fs';
import path from 'path';

class CookiePool<T> {
    private remainingQuotas: number[];
    private timers: (NodeJS.Timeout | null)[];

    constructor(private cookies: T[], private maxQuota: number = 20, private recoverTimeMs: number = 7200000) {
        this.remainingQuotas = cookies.map(() => maxQuota);
        this.timers = new Array(cookies.length).fill(null);
    }

    getCookie(index: number): T | undefined {
        if (index < 0 || index >= this.cookies.length) {
            return undefined;
        }

        if (this.remainingQuotas[index] <= 0) {
            return undefined;
        }

        this.remainingQuotas[index]--;

        if (!this.timers[index]) {
            this.timers[index] = setTimeout(() => {
                this.remainingQuotas[index] = this.maxQuota;
                this.timers[index] = null;
            }, this.recoverTimeMs);
        }

        return this.cookies[index];
    }

    getRandom(): T | undefined {
        const availableIndices: number[] = [];
        for (let i = 0; i < this.remainingQuotas.length; i++) {
            if (this.remainingQuotas[i] > 0) {
                availableIndices.push(i);
            }
        }

        if (availableIndices.length === 0) {
            return undefined;
        }

        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];

        this.remainingQuotas[randomIndex]--;

        if (!this.timers[randomIndex]) {
            this.timers[randomIndex] = setTimeout(() => {
                this.remainingQuotas[randomIndex] = this.maxQuota;
                this.timers[randomIndex] = null;
            }, this.recoverTimeMs);
        }

        return this.cookies[randomIndex];
    }
}

const getSessionCookie = (cookieString: string) => {
    const matchRe = /([^;\s]+)=([^;\s]+);/g;
    let result: { name: string; value: string; domain: string; path: string }[] = [];
    while (true) {
        let newMatch = matchRe.exec(cookieString);
        if (!newMatch) {
            return result;
        }

        result.push({ name: newMatch[1], value: newMatch[2], domain: '.x.com', path: '/' });
    }
};

export type Cookie = ReturnType<typeof getSessionCookie>;

export const createCookiePool = () => {
    const cookieDir = path.resolve(__dirname, '../cookies');
    const cookieFiles = fs.readdirSync(cookieDir).filter((s) => s.endsWith('.txt'));
    console.log('\x1B[36mLoading cookies...');
    const pool = cookieFiles.map((f, index) => {
        console.log(`\x1B[37mCooke #${index}: ${f}`);
        const cookieContent = fs.readFileSync(path.resolve(cookieDir, f)).toString();
        return { cookie: getSessionCookie(cookieContent), file: f, index };
    });
    console.log(`\x1B[36mLoaded ${pool.length} cookies`);
    return new CookiePool(pool);
};
