import fs from 'node:fs';

import Logger, { LogLevel } from './Logger';
import { O2TVRegion } from './O2TV/O2TVApi';
import { O2TVServiceData } from './O2TV/Models/O2TVSession';

const DefaultConfig: ConfigData = {
    Log: {
        Level: 'Info',
        LogToFile: true
    }
};

export default class Config {
    private static readonly ConfigPath: string = './Data/Config.json';
    private static _Config: ConfigData;

    public static get Config(): ConfigData {
        return this._Config || this.LoadConfig();
    }

    public static LoadConfig(): ConfigData {
        if (!fs.existsSync(this.ConfigPath)) {
            this._Config = DefaultConfig;
            this.SaveConfig();
            return this._Config;
        }

        this._Config = JSON.parse(fs.readFileSync(this.ConfigPath, 'utf8'));
        return this._Config;
    }

    public static SaveConfig() {
        if (!this._Config) return;
        Logger.Debug(Logger.Type.Config, 'Saving config to disk');
        fs.writeFileSync(this.ConfigPath, JSON.stringify(this._Config, null, 4), 'utf8');
    }

    public static get LogLevel() { return this.Config.Log.Level; }
    public static get LogToFile() { return this.Config.Log.LogToFile; }

    public static get Settings() { return this.Config.Settings; }
    public static SetSettings(Key: string, Settings: { [key: string]: any }) {
        if(Key == 'O2TV'){
            if(!Settings.Region) throw new Error('No region provided');
            if(!Settings.Username) throw new Error('No username provided');
            if(!Settings.Password) throw new Error('No password provided');
        }

        if (!this._Config.Settings) this._Config.Settings = {};
        this._Config.Settings[Key] = Settings;
        
        this.SaveConfig();
    }

    public static O2TVSettings() {
        return this.Settings?.O2TV;
    }
}

type ConfigData = {
    Log: {
        Level: LogLevel;
        LogToFile: boolean;
    };
    Settings?: {
        O2TV?: {
            Region: O2TVRegion;
            Username: string;
            Password: string;
            DeviceId?: string;
            Services?: Record<string, O2TVServiceData>;
        };
        [key: string]: any;
    };
};
