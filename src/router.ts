import { AutoRouter } from 'itty-router';
import type * as Telegram from 'telegram-bot-api-types';
import type { AutoRouterType } from 'itty-router/types';
import { createAPIClient } from './api';
import { createBotServer } from './bot';
import type { ENV } from './types';

async function handleInit(req: Request, env: ENV): Promise<Response> {
    const client = createAPIClient(env.TELEGRAM_BOT_TOKEN);
    const url = new URL(req.url);
    const webhook = `https://${url.hostname}/telegram/${env.TELEGRAM_BOT_TOKEN}/webhook`;
    await client.setMyCommands({
        commands: [
            { command: 'start', description: 'Start the bot' },
        ],
    });
    return client.setWebhook({ url: webhook });
}

async function handleWebhook(req: Request & { token: string }, env: ENV): Promise<Response> {
    try {
        if (req.token !== env.TELEGRAM_BOT_TOKEN) {
            return new Response('Unauthorized', { status: 401 });
        }
        const update = await req.json() as Telegram.Update;
        const client = createAPIClient(req.token);
        const bot = createBotServer();
        return bot.fetch(update, client, env);
    } catch (e) {
        console.error((e as Error).message);
        console.error((e as Error).stack);
        return new Response(e.message, { status: 200 });
    }
}

async function handleNotfound(): Promise<Response> {
    return new Response('Not Found', { status: 404 });
}

export function createRouter(): AutoRouterType {
    const router = AutoRouter();
    router.get('/init', handleInit);
    router.post('/telegram/:token/webhook', handleWebhook);
    router.all('*', handleNotfound);
    router.catch = (e: Error) => {
        console.error(e.message);
        console.error(e.stack);
        return new Response(e.message, { status: 500 });
    };
    return router;
}
