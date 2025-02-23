import type { Browser, Page } from 'playwright';
import type { Response } from 'express';
import { callGrok } from './call-grok';
import EventEmitter from 'events';
import type { Cookie } from './cookie-pool';
import { config } from './config';

const createPage = async (browser: Browser, cookie: Cookie) => {
    const context = await browser.newContext({
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        extraHTTPHeaders: {
            'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        },
        bypassCSP: true,
    });

    // wtf (从原项目复制来的，强烈怀疑并不需要)
    await context.addInitScript(() => {
        // 部分伪装，不完全移除
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined, // 不返回 false，而是 undefined
        });

        // 模拟真实浏览器特征
        Object.defineProperty(navigator, 'plugins', {
            get: () => [{ name: 'Chrome PDF Plugin' }, { name: 'Chrome PDF Viewer' }],
        });
    });

    await context.addCookies(cookie);

    const page = await context.newPage();
    await page.goto('https://x.com/i/grok');
    return page;
};

export class PageWrapper {
    closed = false;
    resSent = false;
    resEnded = false;
    constructor(
        public page: Page,
        public timeoutEmitter: EventEmitter<{ timeout: [] }>,
        private res: Response,
        public finishEmitter: EventEmitter<{ finish: [] }>
    ) {}

    close(statusCode: number = 500, message: string = 'Internal Error') {
        if (!this.closed) {
            this.page.close();
            this.closed = true;
        }
        if (!this.resSent) {
            this.res.status(statusCode).send(message);
            this.resSent = true;
            this.resEnded = true;
        }
        if (!this.resEnded) {
            this.res.end();
            this.resEnded = true;
        }
    }
}

export const initPage = async (browser: Browser, cookie: Cookie, res: Response, abortController: AbortController) => {
    const page = await createPage(browser, cookie);
    const timeoutEmitter = new EventEmitter<{ timeout: [] }>();
    const finishEmitter = new EventEmitter<{ finish: [] }>();
    const wrapper = new PageWrapper(page, timeoutEmitter, res, finishEmitter);

    let streamStarted = false;
    setTimeout(() => {
        if (!streamStarted) {
            if (!wrapper.closed) {
                timeoutEmitter.emit('timeout');
            }
        }
    }, config.maxTimeout);

    await page.route('**/*', async (route, request) => {
        const url = request.url();
        if (url.includes('/2/grok/add_response.json') && request.method() === 'POST') {
            streamStarted = true;
            callGrok(wrapper, request, res, abortController, finishEmitter);
        } else {
            await route.continue();
        }
    });

    return wrapper;
};
