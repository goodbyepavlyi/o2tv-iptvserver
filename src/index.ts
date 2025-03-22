import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
if(!fs.existsSync('./Data')) fs.mkdirSync('./Data', { recursive: true });

import { description, version } from '../package.json';

process.DevMode = process.argv.includes('-dev');
process.Version = version;
process.Description = description;

if(process.DevMode){
    process.Version += '-dev';

    Object.keys(process.env).forEach(Key => {
        const DevKey = `${Key}_DEV`;
        if(!process.env[DevKey]) return;

        process.env[Key] = process.env[DevKey];
        delete process.env[DevKey];
    });
}

import Bootstrapper from './Bootstrapper';
import Config from './Config';
import Logger from './Logger';
Logger.Init({
    LogLevel: process.argv.includes('-trace') ? 'Trace' : process.DevMode ? 'Debug' : Config.LogLevel,
    LogToFile: Config.LogToFile
});

let Exiting = false;
const Shutdown = async (code: number) => {
    if(Exiting) return;
    Exiting = true;

    await Bootstrapper.Stop();
    Logger.Info(Logger.Type.Application, `Exiting with code &c${code}&r...`);
    process.exit(code);
};

// Error handling
process.on('uncaughtException', Error => Logger.Error(Logger.Type.Application, 'An uncaught exception occured, error:', Error));
process.on('unhandledRejection', Reason => Logger.Error(Logger.Type.Application, 'An unhandled promise rejection occured, error:', Reason));

// do something when app is closing
process.on('exit', code => Shutdown(code));

// catches ctrl+c event
process.on('SIGINT', () => Shutdown(0));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', Shutdown);
process.on('SIGUSR2', Shutdown);

Bootstrapper.Start();