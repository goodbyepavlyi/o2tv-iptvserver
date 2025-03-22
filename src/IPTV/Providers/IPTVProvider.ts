import Config from '../../Config';
import Logger from '../../Logger';

import { IPTVProviderType } from '../IPTVProviderType';
import IPTVChannel from '../Models/IPTVChannel';
import IPTVEpg from '../Models/IPTVEpg';
import IPTVMDChannel from '../Models/IPTVMDChannel';

export default abstract class IPTVProvider{
    public static ProviderType: IPTVProviderType;
    public static CreateSession: () => Promise<IPTVProvider>;
    public static FromSession: (Data: any) => Promise<IPTVProvider>;

    public ProviderType: IPTVProviderType;
    public Username: string;
    public Password: string;

    public Channels: IPTVChannel[] = [];

    constructor(Provider: IPTVProviderType, Username: string, Password: string){
        if(!(Provider && Username && Password)) throw new Error('Missing required parameters for IPTVProvider constructor');

        this.ProviderType = Provider;
        this.Username = Username;
        this.Password = Password;

        Logger.Info(Logger.Type.IPTV, `Username: &c${this.Username}&r, provider: &c${this.ProviderType}&r`);
    }

    public abstract get Data(): any;
    public abstract get SessionToken(): string;
    public abstract get SessionExpiry(): number;

    public abstract LoadChannels(): Promise<IPTVChannel[]>;
    public abstract GetMultiDimensionChannels(): Promise<IPTVMDChannel[]>;

    public abstract GetStream(Channel: IPTVChannel|IPTVMDChannel): Promise<string>;
    public abstract GetStreamCatchup(StartTS: Date, EndTS: Date, Channel: IPTVChannel|IPTVMDChannel): Promise<string>;

    public abstract GetLiveEPG(): Promise<IPTVEpg[]|null>;
    public abstract GetEPG(): Promise<{ Channels: IPTVChannel[], EPG: IPTVEpg[] }>;

    public get IsValid(){
        return this.SessionExpiry > Math.floor(Date.now() / 1000);
    }

    public SaveData(){
        Config.SetValue('IPTV', this.Data);
        Logger.Info(Logger.Type.IPTV, 'Saved session data to config');
    }
}

export enum SessionLoadError{
    INVALID_SAVED_SESSION_DATA = 'INVALID_SAVED_SESSION_DATA',
    SESSION_EXPIRED = 'SESSION_EXPIRED'
}