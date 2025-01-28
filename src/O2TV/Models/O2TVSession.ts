import Config from '../../Config';
import Logger from '../../Logger';
import Utils from '../../Utils';
import O2TVApi, { O2TVRegion } from '../O2TVApi';

export default class O2TVSession{
    public static CreateSession = (Region: O2TVRegion, Username: string, Password: string): Promise<O2TVSession> => new Promise(async (Resolve, Reject) => {
        if (!Region || !Username || !Password) return Reject('Missing parameters');
        let DeviceId = Utils.RandomString(16);

        const KS = await O2TVApi.AnonymousLogin().catch(x => Reject(x));
        Logger.Trace(Logger.Type.O2TV, 'KS:', KS);
        if(!KS) return Reject('Failed to create session, KS is null');

        const Token = await O2TVApi.Login(Username, Password, DeviceId).catch(x => Reject(x));
        Logger.Trace(Logger.Type.O2TV, 'Token:', Token);
        if(!Token) return Reject('Failed to create session, JWT Token is null');

        const KSServices = await O2TVApi.GetAccountServices(Token.jwt, KS.ks)
            .then(x => {
                if (!x || x.length < 1) return Reject('Failed to create session, account has no services?');
                
                return x.reduce((arr, Service) => {
                    Object.entries(Service).forEach(([id, code]) => arr[code] = id);
                    return arr;
                }, {});
            }).catch(Reject);
        if (!KSServices || Object.keys(KSServices).length < 1) return Reject('Failed to create session, account has no services?');
        Logger.Info(Logger.Type.O2TV, 'Found services:', KSServices);

        let Services: Record<string, any> = {};
        for (const [Code, Name] of Object.entries(KSServices)) {
            const ServiceData = await O2TVApi.KalturaLogin(KS.ks, Token.jwt, DeviceId, Code).catch(x => Reject(x));
            Logger.Trace(Logger.Type.O2TV, `Service ${Name} (${Code}):`, ServiceData);
            if (!ServiceData) return Reject(`Failed to create session, failed to login to service ${Name} (${Code})`);

            Services[Code] = {
                Name,
                Code,
                KS: ServiceData.ks,
                Expiry: ServiceData.expiry,
                RefreshToken: ServiceData.refreshToken
            };
        }

        return Resolve(new O2TVSession(Region, Username, Password, DeviceId, Services));
    });

    public static LoadSession = (): Promise<O2TVSession> => new Promise((Resolve, Reject) => {
        const Settings = Config.O2TVSettings();
        if(!(Settings && Settings.Region && Settings.Username && Settings.Password)) return Reject('No O2TV settings found');

        if(!(Settings.DeviceId && Settings.Services)){
            Logger.Info(Logger.Type.O2TV, 'No services found, creating new session');
            return Resolve(O2TVSession.CreateSession(Settings.Region, Settings.Username, Settings.Password));
        }

        for(const Service of Object.values(Settings.Services)){
            if(Service.Expiry && Service.Expiry > Math.floor(Date.now() / 1000)) continue;

            Logger.Debug(Logger.Type.O2TV, `Service ${Service.Name} (${Service.Code}) has expired, creating new session...`);
            return Resolve(O2TVSession.CreateSession(Settings.Region, Settings.Username, Settings.Password));
        }

        return Resolve(new O2TVSession(Settings.Region, Settings.Username, Settings.Password, Settings.DeviceId, Settings.Services));
    });

    public Region: O2TVRegion;
    public Username: string;
    public Password: string;
    public DeviceId: string;

    public Services: Record<string, O2TVServiceData>;
    public Service?: O2TVServiceData;

    constructor(Region: O2TVRegion, Username: string, Password: string, DeviceId: string, Services: Record<string, O2TVServiceData>) {
        if(!(Region && Username && Password && DeviceId && Services)) throw new Error('Missing parameters');

        this.Region = O2TVRegion[Region];
        if(!this.Region) throw new Error('Invalid region');

        this.Username = Username;
        this.Password = Password;
        this.DeviceId = DeviceId;
        this.Services = Services;

        this.Init();
        Logger.Info(Logger.Type.O2TV, `Using service &c${this.Service!.Name}&r (&c${this.Service!.Code}&r)`);
    }

    public get KS(): string {
        return this.Service?.KS!;
    }

    public get IsValid(): boolean {
        return this.Service != null && this.Service.Expiry > Math.floor(Date.now() / 1000);
    }

    public Save(){
        const Settings = Config.O2TVSettings();
        if(!Settings) return;
        
        Settings.DeviceId = this.DeviceId;
        Settings.Services = this.Services;
        Config.SetSettings('O2TV', Settings);
    }

    public async Init(){
        for(const Service of Object.values(this.Services)){
            if(!Service.Enabled){
                Logger.Debug(Logger.Type.O2TV, `Service &c${Service.Name}&r (&c${Service.Code}&r) is disabled.`);
                continue;
            }

            this.Service = Service;
            break;
        }

        if(this.Service) return;

        this.Service = Object.values(this.Services)[0];
        this.Service.Enabled = true;
        this.Save();
    }
}

export type O2TVSessionData = {
    Region: O2TVRegion;
    Username: string;
    Password: string;
    DeviceId: string;

    Services: Record<string, O2TVServiceData>;
};

export type O2TVServiceData = {
    Name: string;
    Code: string;
    KS: string;
    Expiry: number;
    RefreshToken: string;
    Enabled: boolean;
};