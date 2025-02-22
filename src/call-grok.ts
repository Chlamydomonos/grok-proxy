import type { Response } from 'express';
import type { Page, Request } from 'playwright';
import axios from 'axios';

const buildResJson = (message: string) => ({
    choices: [
        {
            delta: {
                role: 'assistant',
                content: message,
            },
        },
    ],
});

export const callGrok = async (page: Page, request: Request, response: Response, abortController: AbortController) => {
    try {
        const axiosRes = await axios.post(request.url(), request.postDataJSON(), {
            headers: request.headers(),
            responseType: 'stream',
            signal: abortController.signal,
        });

        const stream = axiosRes.data;

        stream.on('data', (chunk: Buffer) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
                try {
                    const jsonData = JSON.parse(line);
                    if (jsonData.result) {
                        const message = jsonData.result.message;
                        if (message) {
                            const streamJson = buildResJson(message);
                            response.write(`data: ${JSON.stringify(streamJson)}\n\n`);
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
        });

        stream.on('end', () => {
            response.write('data: [DONE]\n\n');
            response.end();
            page.close();
        });
    } catch (e) {
        console.log(e);
    }
};
