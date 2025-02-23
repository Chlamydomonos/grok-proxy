import EventEmitter from 'events';
import type { Request, Response } from 'express';
import express from 'express';
import type { Browser } from 'playwright';
import { chromium } from 'playwright';
import { config } from './config';
import { Cookie, createCookiePool } from './cookie-pool';
import { initPage, type PageWrapper } from './init-page';

console.log("\n\n\x1B[1m\x1B[32mChlamydomonos' Grok-3 Proxy\x1B[0m");
console.log('\n\n');

const cookiePool = createCookiePool();

const handleReq = async (
    browser: Browser,
    pageSetter: (page: PageWrapper) => void,
    abortController: AbortController,
    abortEmitter: EventEmitter<{ abort: [] }>,
    req: Request,
    res: Response
) => {
    console.log(`\n\x1B[36m[${new Date().toLocaleString()}] Request received\x1B[0m`);
    const authorization = req.headers.authorization;
    let cookie: { cookie: Cookie; name: string } | undefined;
    if (authorization) {
        const match = /^Bearer (.+)/.exec(authorization);
        if (match) {
            const cookieName = match[1];
            console.log(`Trying to use cookie ${cookieName}`);
            if (cookiePool.has(cookieName)) {
                cookie = cookiePool.getCookie(cookieName);
                if (!cookie) {
                    console.log('\x1B[31mNo quota for this cookie, aborted request\x1B[0m');
                }
            } else {
                console.log('\x1B[33mThis cookie does not exist, trying to use a random cookie\x1B[0m');
                cookie = cookiePool.getRandom();
                if (!cookie) {
                    console.log('\x1B[31mNo cookie available, aborted request\x1B[0m');
                }
            }
        } else {
            console.log(`Trying to use a random cookie`);
            cookie = cookiePool.getRandom();
            if (!cookie) {
                console.log('\x1B[31mNo cookie available, aborted request\x1B[0m');
            }
        }
    } else {
        console.log(`Trying to use a random cookie`);
        cookie = cookiePool.getRandom();
        if (!cookie) {
            console.log('\x1B[31mNo cookie available, aborted request\x1B[0m');
        }
    }

    if (!cookie) {
        res.status(429).send('Cookie已超出限额');
        return;
    }

    console.log(`\x1B[32mUsing cookie \x1B[36m"${cookie.name}"\x1B[0m`);

    const pageWrapper = await initPage(browser, cookie.cookie, res, abortController);
    pageSetter(pageWrapper);

    pageWrapper.timeoutEmitter.on('timeout', () => {
        console.log('\x1B[31mThis cookie is invalid\x1B[0m');
        abortEmitter.emit('abort');
    });

    const reqMessages = req.body.messages as {
        role: string;
        content: string;
    }[];

    const reqMessageText = reqMessages.map((m) => `${m.role}:\n\n${m.content}`).join('\n\n');

    const inputXPath =
        '/html/body/div[1]/div/div/div[2]/main/div/div/div/div/div/div[3]/div/div/div/div/div[1]/div/div/div/div[1]/div/div[1]/div/textarea';
    const input = pageWrapper.page.locator(`xpath=${inputXPath}`);

    const sendXPath =
        '/html/body/div[1]/div/div/div[2]/main/div/div/div/div/div/div[3]/div/div/div/div/div[1]/div/div/div/div[2]/div[2]/button[2]';
    const sendButton = pageWrapper.page.locator(`xpath=${sendXPath}`);

    if (!pageWrapper.closed) {
        await input.fill(reqMessageText);
        await sendButton.click();
        await new Promise<void>((resolve) => {
            pageWrapper.finishEmitter.on('finish', resolve);
        });
    }
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

    app.post('/v1/chat/completions', async (req, res) => {
        let creatingPage = true;
        let needCloseImmediately = false;
        let page: PageWrapper | undefined;

        const clean = () => {
            if (creatingPage) {
                needCloseImmediately = true;
                return;
            }
            if (page) {
                page.close();
            }
        };

        const pageSetter = (resolve: () => void) => (p: PageWrapper) => {
            page = p;
            creatingPage = false;
            if (needCloseImmediately) {
                clean();
                resolve();
            }
        };

        try {
            const abortController = new AbortController();
            const abortEmitter = new EventEmitter<{ abort: [] }>();

            await new Promise<void>((resolve) => {
                res.on('close', () => {
                    if (!page || !page.resEnded) {
                        console.log('\x1B[2mThe request is aborted by client\x1B[0m');
                        abortController.abort();
                    }
                    clean();
                    resolve();
                });

                abortEmitter.on('abort', () => {
                    clean();
                    resolve;
                });

                handleReq(browser, pageSetter(resolve), abortController, abortEmitter, req, res)
                    .catch((e) => {
                        console.log(e);
                    })
                    .finally(() => {
                        clean();
                        resolve();
                    });
            });
        } catch (e) {
            console.log(e);
        } finally {
            clean();
            return;
        }
    });

    app.listen(config.port, () => {
        console.log(`\n\x1B[37m\x1B[1mServer listening on ${config.port}\x1B[0m\n`);
    });
};

main();
