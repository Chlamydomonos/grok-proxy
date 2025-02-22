import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import express from 'express';
import type { Request, Response } from 'express';
import { callGrok } from './call-grok';
import { Cookie, createCookiePool } from './cookie-pool';
import { loadConfig } from './load-config';

const config = loadConfig();

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
    page.goto('https://x.com/i/grok');
    return page;
};

const routePage = async (page: Page, res: Response, abortController: AbortController) => {
    await page.route('**/*', async (route, request) => {
        const url = request.url();
        if (url.includes('/2/grok/add_response.json') && request.method() === 'POST') {
            callGrok(page, request, res, abortController);
        } else {
            await route.continue();
        }
    });
};

const cookiePool = createCookiePool();

const handleReq = async (
    browser: Browser,
    pageSetter: (page: Page) => void,
    abortController: AbortController,
    req: Request,
    res: Response
) => {
    console.log('\x1B[36mRequest recieved');
    const authorization = req.headers.authorization;
    let cookie: { cookie: Cookie; file: string; index: number } | undefined;
    if (authorization) {
        const match = /#(0-9)+/.exec(authorization);
        if (match) {
            cookie = cookiePool.getCookie(parseInt(match[1]));
        } else {
            cookie = cookiePool.getRandom();
        }
    } else {
        cookie = cookiePool.getRandom();
    }

    if (!cookie) {
        console.log('\x1B[31mNo cookie available, aborted request\n\x1B[0m');
        res.status(429).send('Cookie已超出限额');
        return;
    }

    console.log(`\x1B[32mUsing cookie #${cookie.index} (${cookie.file})\n\x1B[0m`);

    const page = await createPage(browser, cookie.cookie);
    pageSetter(page);

    await routePage(page, res, abortController);

    const reqMessages = req.body.messages as {
        role: string;
        content: string;
    }[];

    const reqMessageText = reqMessages.map((m) => `${m.role}:\n\n${m.content}`).join('\n\n');

    const inputXPath =
        '/html/body/div[1]/div/div/div[2]/main/div/div/div/div/div/div[3]/div/div/div/div/div[1]/div/div/div/div[1]/div/div[1]/div/textarea';
    const input = page.locator(`xpath=${inputXPath}`);
    if (!input) {
        res.status(500).send('Internal Error');
        return;
    }

    const sendXPath =
        '/html/body/div[1]/div/div/div[2]/main/div/div/div/div/div/div[3]/div/div/div/div/div[1]/div/div/div/div[2]/div[2]/button[2]';
    const sendButton = page.locator(`xpath=${sendXPath}`);
    if (!sendButton) {
        res.status(500).send('Internal Error');
        return;
    }

    await input.fill(reqMessageText);
    await sendButton.click();
};

const main = async () => {
    const browser = await chromium.launch({
        channel: config.channel,
        headless: config.headless,
    });

    const app = express();

    app.use(express.json());

    app.get('/v1/models', (_, res) => {
        res.send({ data: [{ id: 'grok-3' }] });
    });

    app.post(
        '/v1/chat/completions',
        (req, res) =>
            new Promise<void>((resolve) => {
                const abortController = new AbortController();
                let page: Page | undefined;
                res.on('close', () => {
                    abortController.abort();
                    if (page) {
                        page.close();
                    }
                    resolve();
                });

                handleReq(browser, (p) => (page = p), abortController, req, res)
                    .then(resolve)
                    .catch(resolve);
            })
    );

    app.listen(config.port, () => {
        console.log(`\n\x1B[37m\x1B[1mServer listening on ${config.port}\x1B[0m\n`);
    });
};

main();
