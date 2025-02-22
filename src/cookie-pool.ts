import fs from 'fs';
import path from 'path';

// DeepSeek生成
class CookiePool<T> {
    private cookies: T[];
    private usageMap: Array<Array<number>>;

    constructor(cookies: T[]) {
        this.cookies = cookies;
        this.usageMap = cookies.map(() => []);
    }

    private cleanupOldEntries(times: number[], cutoff: number): void {
        let low = 0,
            high = times.length;
        while (low < high) {
            const mid = (low + high) >>> 1;
            if (times[mid] < cutoff) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        times.splice(0, low);
    }

    getCookie(index: number): T | undefined {
        if (index < 0 || index >= this.cookies.length) {
            return undefined;
        }

        const now = Date.now();
        const twoHoursAgo = now - 7200000; // 2小时对应的毫秒数
        const times = this.usageMap[index];

        this.cleanupOldEntries(times, twoHoursAgo);

        if (times.length >= 15) {
            return undefined;
        }

        times.push(now);
        return this.cookies[index];
    }

    getRandom(): T | undefined {
        const now = Date.now();
        const twoHoursAgo = now - 7200000;
        const availableIndices: number[] = [];

        for (let i = 0; i < this.cookies.length; i++) {
            const times = this.usageMap[i];
            this.cleanupOldEntries(times, twoHoursAgo);

            if (times.length < 15) {
                availableIndices.push(i);
            }
        }

        if (availableIndices.length === 0) {
            return undefined;
        }

        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        const selectedTimes = this.usageMap[randomIndex];
        selectedTimes.push(now);

        return this.cookies[randomIndex];
    }
}

const getSessionCookie = (cookieString: string) => {
    const sessionCookie = cookieString.split('; ').map((pair) => {
        const [name, value] = pair.split('=');
        return { name, value, domain: '.x.com', path: '/' };
    });
    return sessionCookie;
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
