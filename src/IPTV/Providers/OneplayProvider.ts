import IPTVProvider, { SessionLoadError } from './IPTVProvider';
import { IPTVProviderType } from '../IPTVProviderType';

import Logger from '../../Logger';
import OneplayAPI from '../API/OneplayAPI';
import IPTVEpg from '../Models/IPTVEpg';
import Config from '../../Config';
import IPTVChannel from '../Models/IPTVChannel';
import IPTVMdEpg from '../Models/IPTVMdEpg';
import IPTVMDChannel from '../Models/IPTVMDChannel';

export default class OneplayProvider extends IPTVProvider{
    public static ProviderType = IPTVProviderType.ONEPLAY;

    public static async CreateSession(): Promise<OneplayProvider>{
        if(!process.env.PROVIDER_ONEPLAY_DEVICE_NAME) throw new Error('Environment variable PROVIDER_ONEPLAY_DEVICE_NAME not found');

        const SessionToken = await OneplayAPI.Login();
        Logger.Trace(Logger.Type.IPTV, 'SessionToken:', SessionToken);
        if(!SessionToken) throw new Error('Failed to create session, SessionToken is null');

        return new OneplayProvider(process.env.PROVIDER_USERNAME, process.env.PROVIDER_PASSWORD, { Token: SessionToken, Expiry: Date.now()+1000*60*60*24 });
    };

    public static FromSession = (Data: SessionData|any) => new Promise<OneplayProvider>((Resolve, Reject) => {
        if(!Data.Token || !Data.Expiry) return Reject(SessionLoadError.INVALID_SAVED_SESSION_DATA);
        if(Data.Expiry <= Date.now()) return Reject(SessionLoadError.SESSION_EXPIRED);
        return Resolve(new OneplayProvider(process.env.PROVIDER_USERNAME, process.env.PROVIDER_PASSWORD, Data));
    });

    public Session: SessionData;

    constructor(Username: string, Password: string, Session: SessionData){
        super(IPTVProviderType.ONEPLAY, Username, Password);
        this.Session = Session;
    }

    public get Data(){
        return {
            Token: this.Session.Token,
            Expiry: this.Session.Expiry
        };
    }

    public get SessionToken(){
        return this.Session.Token;
    }

    public get SessionExpiry(){
        return this.Session.Expiry;
    }

    public async LoadChannels(){
        this.Channels = await OneplayAPI.GetChannels(this.SessionToken);
        return this.Channels;
    }

    public async GetMultiDimensionChannels(){
        const MDChannels: IPTVMDChannel[] = [];
        const LiveEPG = await this.GetLiveEPG();

        for(const EPG of LiveEPG){
            if(!(EPG instanceof IPTVMdEpg)) continue;
            if(EPG.StartDate.getTime() > Date.now() || EPG.EndDate.getTime() < Date.now()){
                Logger.Debug(Logger.Type.IPTV, `Skipping EPG ${EPG.Name} as it's not live`);
                continue;
            }

            const Channel = this.Channels?.find(x => x.Id === EPG.ChannelId);
            if(!Channel){
                Logger.Error(Logger.Type.IPTV, `Channel not found for EPG: ${EPG.Name}`);
                continue;
            }

            const MDChannel = new IPTVMDChannel(Channel, {
                Id: EPG.Id,
                Name: EPG.Name,
                StartDate: EPG.StartDate,
                EndDate: EPG.EndDate
            });
            
            Logger.Debug(Logger.Type.IPTV, `Creating MD Channel: ${MDChannel.Name}`);
            MDChannels.push(MDChannel);
        }

        return MDChannels;
    }

    public GetStream = (Channel: IPTVChannel|IPTVMDChannel) => OneplayAPI.GetStreamLive(this.SessionToken, Channel);
    public GetStreamCatchup = (StartTS: Date, EndTS: Date, Channel: IPTVChannel|IPTVMDChannel) => OneplayAPI.GetStreamCatchup(this.SessionToken, StartTS, EndTS, Channel);

    public GetLiveEPG(){
        const Today = new Date();
        const StartTS = new Date(Today.getFullYear(), Today.getMonth(), Today.getDate(), 0, 0, 0);
        const EndTS = new Date(Today.getFullYear(), Today.getMonth(), Today.getDate(), 23, 59, 59);
        return OneplayAPI.GetDayEPG(this.SessionToken, StartTS, EndTS);
    }

    public async GetEPG(){
        if(!this.Channels) await this.LoadChannels();
        const Result = { Channels: this.Channels, EPG: [] as IPTVEpg[] };

        const StartTS = new Date();
        const EndTS = new Date(StartTS.getTime() + (60 * 60 * 24 * 1000) - 1);

        for (let Day = -Config.EPGDaysBack; Day < Config.EPGDaysForward; Day++) {
            const DayStartTS = new Date(StartTS.getTime() + Day*24*60*60*1000);
            const DayEndTS = new Date(EndTS.getTime() + Day*24*60*60*1000);

            Logger.Debug(Logger.Type.IPTV, 'Loading EPG for day', DayStartTS.toLocaleDateString());
            const EPG = await OneplayAPI.GetDayEPG(this.SessionToken, DayStartTS, DayEndTS);
            if(!EPG){
                Logger.Error(Logger.Type.IPTV, 'Failed to load EPG for day', DayStartTS.toLocaleDateString());
                continue;
            }

            Result.EPG.push(...EPG);
        }

        return Result;
    }
}

type SessionData = {
    Token: string;
    Expiry: number;
};