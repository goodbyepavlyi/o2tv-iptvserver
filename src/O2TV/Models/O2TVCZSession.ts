import O2TVSession, { O2TVServiceData } from './O2TVSession';
import O2TVApi, { O2TVRegion } from '../O2TVApi';

import Logger from '../../Logger';
import Utils from '../../Utils';

export default class O2TVCZSession extends O2TVSession{
    public static CreateSession = (Username: string, Password: string): Promise<O2TVCZSession> => new Promise(async (Resolve, Reject) => {
        if (!Username || !Password) return Reject('Missing parameters');
        Logger.Trace(Logger.Type.O2TV, `Creating session => Region: ${O2TVRegion.CZ}, Username: ${Username}, Password: ${Password}`);
        let DeviceId = Utils.RandomString(16).toUpperCase();

        const KS = await O2TVApi.AnonymousLogin().catch(x => Reject(x));
        Logger.Trace(Logger.Type.O2TV, 'KS:', KS);
        if(!KS) return Reject('Failed to create session, KS is null');

        const Token = await O2TVApi.Login(Username, Password, DeviceId).catch(x => Reject(x));
        Logger.Trace(Logger.Type.O2TV, 'Token:', Token);
        if(!Token) return Reject('Failed to create session, JWT Token is null');

        const KSServices = await O2TVApi.GetAccountServices(Token, KS.ks)
            .then(x => {
                if (!x || x.length < 1) return Reject('Failed to create session, account has no services?');
                
                return x.reduce((arr, Service) => {
                    Object.entries(Service).forEach(([id, code]) => arr[code] = id);
                    return arr;
                }, {});
            }).catch(x => Reject(x));
        if (!KSServices || Object.keys(KSServices).length < 1) return Reject('Failed to create session, account has no services?');
        Logger.Info(Logger.Type.O2TV, 'Found services:', KSServices);

        let Service: O2TVServiceData|null = null;
        for (const [Code, Name] of Object.entries(KSServices)) {
            const ServiceData = await O2TVApi.KalturaLogin(KS.ks, Token, DeviceId, Code).catch(x => Reject(x));
            Logger.Trace(Logger.Type.O2TV, `Service ${Name} (${Code}):`, ServiceData);
            if (!ServiceData) return Reject(`Failed to create session, failed to login to service ${Name} (${Code})`);

            Service = {
                KS: ServiceData.ks,
                Expiry: ServiceData.expiry,
                RefreshToken: ServiceData.refreshToken
            };
        }

        if (!Service) return Reject('Failed to create session, no valid service found');
        return Resolve(new O2TVCZSession(Username, Password, DeviceId, Service));
    });

    constructor(Username: string, Password: string, DeviceId: string, Service: O2TVServiceData) {
        super(O2TVRegion.CZ, Username, Password, DeviceId, Service);
    }

    public get IsValid(): boolean {
        return this.Service != null && this.Service.Expiry > Math.floor(Date.now() / 1000);
    }
}