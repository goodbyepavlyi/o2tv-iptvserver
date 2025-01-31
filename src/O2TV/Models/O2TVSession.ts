import Config from '../../Config';
import Logger from '../../Logger';

import { O2TVRegion } from '../O2TVApi';
import O2TVCZSession from './O2TVCZSession';
import O2TVSKSession from './O2TVSKSession';

export default abstract class O2TVSession{
    public static LoadSession = (): Promise<O2TVCZSession|O2TVSKSession> => new Promise(async (Resolve, Reject) => {
        const SessionClass = Config.O2TVSettings()?.Region === O2TVRegion.CZ 
            ? (await import('./O2TVCZSession')).default 
            : (await import('./O2TVSKSession')).default;

        const Settings = Config.O2TVSettings();
        if(!(Settings && Settings.Region && Settings.Username && Settings.Password)) return Reject('No O2TV settings found');

        if(!(Settings.DeviceId && Settings.Service)){
            Logger.Info(Logger.Type.O2TV, 'No services found, creating new session');
            return Resolve(SessionClass.CreateSession(Settings.Username, Settings.Password));
        }

        if(Settings.Service.Expiry < Math.floor(Date.now() / 1000)){
            Logger.Debug(Logger.Type.O2TV, `Session has expired, creating new session...`);
            return Resolve(SessionClass.CreateSession(Settings.Username, Settings.Password));
        }

        return Resolve(new SessionClass(Settings.Username, Settings.Password, Settings.DeviceId, Settings.Service));
    });
    
    public Region: O2TVRegion;
    public Username: string;
    public Password: string;
    public DeviceId: string;
    public Service: O2TVServiceData;

    constructor(Region: O2TVRegion, Username: string, Password: string, DeviceId: string, Service: O2TVServiceData){
        if(!(Region && Username && Password && DeviceId && Service)) throw new Error('Missing parameters');

        this.Region = O2TVRegion[Region];
        if(!this.Region) throw new Error('Invalid region');

        this.Username = Username;
        this.Password = Password;
        this.DeviceId = DeviceId;
        this.Service = Service;

        Logger.Info(Logger.Type.O2TV, `Using account &c${this.Username}&r in region &c${this.Region}&r`);
        this.Save();
    }

    public get KS(): string {
        return this.Service.KS;
    }

    public get IsValid(): boolean {
        return this.Service.Expiry > Math.floor(Date.now() / 1000);
    }

    public Save(){
        const Settings = Config.O2TVSettings();
        if(!Settings) return;
        
        Settings.DeviceId = this.DeviceId;
        Settings.Service = this.Service;
        Config.SetSettings('O2TV', Settings);
    }
}

export type O2TVSessionData = {
    Region: O2TVRegion;
    Username: string;
    Password: string;
    
    DeviceId: string;
    Service: O2TVServiceData;
};

export type O2TVServiceData = {
    KS: string;
    Expiry: number;
    RefreshToken: string;
};