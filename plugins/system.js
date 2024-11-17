import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { performance } from 'perf_hooks';
import { bot } from '../lib/client/plugins.js';
import { fancy } from './client/font.js';
import { runtime } from '../lib/utils.js';
import { addPlugin, getPlugins, removePlugin } from '../lib/sql/plugins.js';
import { dirname, basename, resolve, extname } from 'path';
import { manageVar } from './client/env.js';
import { exec } from 'child_process';

const require = createRequire(import.meta.url);
const envFilePath = path.join(process.cwd(), '.env');

const envfile = () => {
	if (!fs.existsSync(envFilePath)) fs.writeFileSync(envFilePath, '', 'utf-8');
};

const __dirname = dirname(fileURLToPath(import.meta.url));

bot(
	{
		pattern: 'ping',
		isPublic: true,
		desc: 'Get Performance',
		type: 'system',
	},
	async message => {
		const start = performance.now();
		const msg = await message.sendReply('Testing Speed...');
		const end = performance.now();
		await msg.edit(`*_Speed ${(end - start).toFixed(2)}ms_*`);
	},
);

bot(
	{
		pattern: 'runtime',
		isPublic: true,
		desc: 'Get Runtime of bot',
		type: 'system',
	},
	async message => {
		return await message.sendReply(fancy(`bot running since\n${runtime(process.uptime())}`));
	},
);

bot(
	{
		pattern: 'install ?(.*)',
		isPublic: false,
		desc: 'Installs a Plugin',
		type: 'system',
	},
	async (message, match) => {
		const pluginUrl = match.trim();
		if (!pluginUrl.startsWith('https://gist.githubusercontent.com')) return message.sendReply('_Provide a valid Plugin URL_');

		const baseName = basename(pluginUrl, extname(pluginUrl));
		const pluginName = `${baseName}.js`;
		const existingPlugins = await getPlugins();
		if (existingPlugins.some(plugin => plugin.name === pluginName)) return message.sendReply('_Plugin already installed_');

		const pluginPath = resolve(__dirname, '../plugins', pluginName);
		const response = await axios.get(pluginUrl, { responseType: 'arraybuffer' });
		fs.writeFileSync(pluginPath, response.data);
		await addPlugin(pluginName);
		message.sendReply(`_${pluginName} plugin installed_`);
	},
);

bot(
	{
		pattern: 'delplugin ?(.*)',
		isPublic: false,
		desc: 'Deletes a Plugin',
		type: 'system',
	},
	async (message, match) => {
		if (!match) return message.sendReply('_Provide an installed plugin name_');
		const baseName = match.trim();
		const pluginName = `${baseName}.js`;
		const deleted = await removePlugin(pluginName);
		if (!deleted) return message.sendReply('_Plugin not found_');

		const pluginPath = resolve(__dirname, '../plugins', pluginName);
		if (fs.existsSync(pluginPath)) fs.unlinkSync(pluginPath);
		message.sendReply(`_${pluginName} plugin uninstalled_`);
	},
);

bot(
	{
		pattern: 'getplugins',
		isPublic: false,
		desc: 'Lists all installed plugins',
		type: 'system',
	},
	async message => {
		const plugins = await getPlugins();
		const pluginList = plugins.length > 0 ? `Plugins Installed:\n${plugins.map(plugin => plugin.name).join('\n')}` : '_No plugins installed_';
		message.sendReply(fancy(pluginList));
	},
);

bot(
	{
		pattern: 'setvar',
		isPublic: false,
		desc: 'Set system var',
		type: 'system',
	},
	async (message, match) => {
		envfile();
		if (!match) return message.sendReply('_Use: .setvar KEY:VALUE_');
		const input = match.split(':');
		if (input.length !== 2) return message.sendReply('_Use: .setvar KEY:VALUE_');
		const [key, value] = input.map(item => item.trim());
		await manageVar({ command: 'set', key, value });
		return message.sendReply(`*✓ Variable set: ${key}=${value}*`);
	},
);

bot(
	{
		pattern: 'delvar',
		isPublic: false,
		desc: 'Delete system var',
		type: 'system',
	},
	async (message, match) => {
		envFilePath();
		if (!match) return message.sendReply('_Provide variable name to delete_');
		const key = match.trim();
		await manageVar({ command: 'del', key });
		return message.sendReply(`*✓ Deleted ${key} from env*`);
	},
);

bot(
	{
		pattern: 'getvar',
		isPublic: false,
		desc: 'Get system vars',
		type: 'system',
	},
	async message => {
		envFilePath();
		const vars = await manageVar({ command: 'get' });
		return message.sendReply(vars || '_No Vars Found_');
	},
);

bot(
	{
		pattern: 'restart',
		isPublic: false,
		desc: 'Restarts Bot',
		type: 'system',
	},
	async message => {
		await message.sendReply('_Restarting application..._');
		await exec(require('../package.json').scripts.start);
	},
);