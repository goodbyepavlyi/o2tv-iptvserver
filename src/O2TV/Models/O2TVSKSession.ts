import O2TVSession, { O2TVServiceData } from './O2TVSession';
import O2TVApi, { O2TVRegion } from '../O2TVApi';

import Logger from '../../Logger';
import Utils from '../../Utils';

export default class O2TVSKSession extends O2TVSession{
    public static CreateSession = (Username: string, Password: string): Promise<O2TVSKSession> => new Promise(async (Resolve, Reject) => {
        if (!Username || !Password) return Reject('Missing parameters');
        Logger.Trace(Logger.Type.O2TV, `Creating session => Region: ${O2TVRegion.SK}, Username: ${Username}, Password: ${Password}`);
        let DeviceId = Utils.RandomString(16).toUpperCase();

        const KS = await O2TVApi.AnonymousLogin().catch(Reject);
        Logger.Trace(Logger.Type.O2TV, 'KS:', KS);
        if(!KS) return Reject('Failed to create session, KS is null');

        const Token = await O2TVApi.Login(Username, Password, DeviceId).catch(Reject);
        Logger.Trace(Logger.Type.O2TV, 'Token:', Token);
        if(!Token) return Reject('Failed to create session, JWT Token is null');

        const LoginSession = await O2TVApi.KalturaLogin(KS.ks, Token, DeviceId);
        Logger.Trace(Logger.Type.O2TV, 'LoginSession:', LoginSession);

        await O2TVApi.GetHouseholdDevice(KS.ks)
            .catch(x => 
                O2TVApi.AddHouseholdDevice(LoginSession.ks, DeviceId)
                    .then(x => Logger.Debug(Logger.Type.O2TV, 'Added household device:', x))
                    .catch(x => {
                        Logger.Error(Logger.Type.O2TV, 'Failed to add household device:', x);
                        Reject(x);
                    })
            );

        return Resolve(new O2TVSKSession(Username, Password, DeviceId, {
            KS: LoginSession.ks,
            Expiry: LoginSession.expiry,
            RefreshToken: LoginSession.refreshToken
        }));
    });

    constructor(Username: string, Password: string, DeviceId: string, Service: O2TVServiceData){
        super(O2TVRegion.SK, Username, Password, DeviceId, Service);
    }
}