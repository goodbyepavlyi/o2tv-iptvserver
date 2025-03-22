import fs from 'node:fs';

import Logger, { LogLevel } from './Logger';

const DefaultConfig: ConfigData = {
    Log: {
        Level: 'Info',
        LogToFile: true
    }
};

export default class Config{
    private static readonly ConfigPath: string = './Data/Config.json';
    private static _Config: ConfigData;

    public static get Config(){
        return this._Config || this.LoadConfig();
    }

    public static LoadConfig(){
        if(!fs.existsSync(this.ConfigPath)){
            this._Config = DefaultConfig;
            this.SaveConfig();
            return this._Config;
        }

        this._Config = JSON.parse(fs.readFileSync(this.ConfigPath, 'utf8'));
        return this._Config;
    }

    public static SaveConfig(){
        if(!this._Config) return;
        Logger.Debug(Logger.Type.Config, 'Saving config to disk');
        fs.writeFileSync(this.ConfigPath, JSON.stringify(this._Config, null, 4), 'utf8');
    }

    public static get LogLevel(){ return this.Config.Log.Level; }
    public static get LogToFile(){ return this.Config.Log.LogToFile; }

    public static SetValue(Key: string, Settings: { [key: string]: any }|null){
        this._Config[Key] = Settings;
        this.SaveConfig();
    }

    public static get IPTVSession(){
        return this.Config.IPTV;
    }

    public static get EPGDaysBack(){
        return process.env.EPG_DAYS_BACK ? parseInt(process.env.EPG_DAYS_BACK) : 0;
    }

    public static get EPGDaysForward(){
        return process.env.EPG_DAYS_FORWARD ? parseInt(process.env.EPG_DAYS_FORWARD) : 0;
    }
}

type ConfigData = {
    Log: {
        Level: LogLevel;
        LogToFile: boolean;
    };
    [key: string]: any;
};
