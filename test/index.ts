import { installFetchProxy, startServer } from 'cloudflare-worker-adapter';
import worker from '../src'
import * as fs from 'node:fs';
import * as path from 'node:path';


// @ts-ignore
const { proxy, baseURL } = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'config.json'), 'utf-8'));

installFetchProxy(proxy);
startServer(8787, '0.0.0.0', 'wrangler-prod.toml', {}, { baseURL }, async (req, env) => {
	return worker.fetch(req, env, null);
});
