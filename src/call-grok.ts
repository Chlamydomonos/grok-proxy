import type { Response } from 'express';
import type { Request } from 'playwright';
import axios from 'axios';
import type { PageWrapper } from './init-page';
import type { EventEmitter } from 'stream';

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

export const callGrok = async (
    page: PageWrapper,
    request: Request,
    response: Response,
    abortController: AbortController,
    finishEmitter: EventEmitter<{ finish: [] }>
) => {
    try {
        const axiosRes = await axios.post(request.url(), request.postDataJSON(), {
            headers: request.headers(),
            responseType: 'stream',
            signal: abortController.signal,
        });

        const stream = axiosRes.data;

        console.log('\x1B[2mStreaming response...\x1B[0m');

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
                            page.resSent = true;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
        });

        stream.on('end', () => {
            console.log('\x1B[2mStream response finished\x1B[0m');
            response.write('data: [DONE]\n\n');
            response.end();
            finishEmitter.emit('finish');
            page.resSent = true;
            page.resEnded = true;
            page.close();
        });
    } catch (e) {
        console.log(e);
    }
};
