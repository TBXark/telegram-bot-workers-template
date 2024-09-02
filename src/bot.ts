import { MatchType, TelegramRouter, UpdateType } from 'telegram-router';
import type * as Telegram from 'telegram-bot-api-types';
import type { APIClient } from './api';

const welcome = 'Press any number to append it to the message.';
const keyboard: Telegram.InlineKeyboardButton[][] = [
    [
        { text: '1', callback_data: 'num:1' },
        { text: '2', callback_data: 'num:2' },
        { text: '3', callback_data: 'num:3' },
        { text: '+', callback_data: 'num:+' },
    ],
    [
        { text: '4', callback_data: 'num:4' },
        { text: '5', callback_data: 'num:5' },
        { text: '6', callback_data: 'num:6' },
        { text: '-', callback_data: 'num:-' },
    ],
    [
        { text: '7', callback_data: 'num:7' },
        { text: '8', callback_data: 'num:8' },
        { text: '9', callback_data: 'num:9' },
        { text: '*', callback_data: 'num:*' },
    ],
    [
        { text: '⇤', callback_data: 'act:del' },
        { text: '0', callback_data: 'num:0' },
        { text: '=', callback_data: 'act:sum' },
        { text: '/', callback_data: 'num:/' },
    ],
];

function calculateExpression(expression: string): number {
    expression = expression.replace(/\s/g, '');

    const numbers = expression.split(/[-+*/]/).map(Number);
    const operators = expression.replace(/[0-9.]/g, '').split('');

    for (let i = 0; i < operators.length; i++) {
        if (operators[i] === '*' || operators[i] === '/') {
            if (operators[i] === '*') {
                numbers[i] *= numbers[i + 1];
            } else {
                numbers[i] /= numbers[i + 1];
            }
            numbers.splice(i + 1, 1);
            operators.splice(i, 1);
            i--;
        }
    }

    let result = numbers[0];
    for (let i = 0; i < operators.length; i++) {
        if (operators[i] === '+') {
            result += numbers[i + 1];
        } else if (operators[i] === '-') {
            result -= numbers[i + 1];
        }
    }

    return result;
}

function handleNumInput(update: Telegram.Update, client: APIClient): Promise<Response> {
    const num = update.callback_query.data.slice(4);
    let text = '';
    if ('text' in update.callback_query.message) {
        if (update.callback_query.message.text === welcome) {
            text = num;
        } else if (num.match(/[-+*/]/) && update.callback_query.message.text?.slice(-1)?.match(/[-+*/]/)) {
            text = update.callback_query.message.text.slice(0, -1) + num;
        } else {
            text = update.callback_query.message.text + num;
        }
    }
    return client.editMessageText({
        chat_id: update.callback_query.message.chat.id,
        message_id: update.callback_query.message.message_id,
        text,
        reply_markup: {
            inline_keyboard: keyboard,
        },
    });
}

function handleDelAction(update: Telegram.Update, client: APIClient): Promise<Response> {
    let text = '';
    if ('text' in update.callback_query.message) {
        if (update.callback_query.message.text === welcome) {
            text = '';
        } else if (update.callback_query.message.text) {
            text = update.callback_query.message.text?.slice(0, -1) || '';
        }
    }
    if (text === '') {
        text = welcome;
    }
    return client.editMessageText({
        chat_id: update.callback_query.message.chat.id,
        message_id: update.callback_query.message.message_id,
        text,
        reply_markup: {
            inline_keyboard: keyboard,
        },
    });
}

function handleSumAction(update: Telegram.Update, client: APIClient): Promise<Response> {
    let text = '';
    try {
			if ('text' in update.callback_query.message) {
				if (update.callback_query.message.text) {
					const res = calculateExpression(update.callback_query.message.text).toFixed();
					if (res === 'NaN' || res === 'Infinity') {
						throw new Error('Invalid expression');
					}
					text = res.toString();
				}
			}
		} catch (e) {
			return client.editMessageText({
				chat_id: update.callback_query.message.chat.id,
				message_id: update.callback_query.message.message_id,
				text: `Invalid expression: ${(e as Error).message}`,
				reply_markup: null,
			});
		}
    return client.editMessageText({
        chat_id: update.callback_query.message.chat.id,
        message_id: update.callback_query.message.message_id,
        text,
        reply_markup: {
            inline_keyboard: keyboard,
        },
    });
}

function handleStartCommand(update: Telegram.Update, client: APIClient): Promise<Response> {
    return client.sendMessage({
        chat_id: update.message.chat.id,
        text: welcome,
        reply_markup: {
            inline_keyboard: keyboard,
        },
    });
}

function handleAdminCommand(update: Telegram.Update, client: APIClient, admins: string[]): Promise<Response> {
    if (admins.includes(update.message.chat.id.toString())) {
        return client.sendMessage({
            chat_id: update.message.chat.id,
            text: 'Hello, Admin!',
        });
    }
    return client.sendMessage({
        chat_id: update.message.chat.id,
        text: 'You are not an admin!',
    });
}

export function createBotServer(): TelegramRouter<Response> {
    const bot = new TelegramRouter<Response>();
    bot.with((update) => {
        console.log(JSON.stringify(update));
    });

    bot.handleWith('num:', UpdateType.CallbackQuery, MatchType.Prefix, handleNumInput);
    bot.handleWith('act:del', UpdateType.CallbackQuery, MatchType.Exact, handleDelAction);
    bot.handleWith('act:sum', UpdateType.CallbackQuery, MatchType.Exact, handleSumAction);
    bot.handleWith('/start', UpdateType.Message, MatchType.Exact, handleStartCommand);
    bot.handleWith('/admin', UpdateType.Message, MatchType.Exact, handleAdminCommand);

    return bot;
}
