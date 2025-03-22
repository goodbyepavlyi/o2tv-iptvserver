import IPTVProvider, { SessionLoadError } from './IPTVProvider';
import { IPTVProviderType } from '../IPTVProviderType';
import O2TVAPI from '../API/O2TVAPI';
import IPTVEpg from '../Models/IPTVEpg';
import IPTVChannel from '../Models/IPTVChannel';
import IPTVMDChannel from '../Models/IPTVMDChannel';
import IPTVMdEpg from '../Models/IPTVMdEpg';

import Logger from '../../Logger';
import Utils from '../../Utils';
import Config from '../../Config';

export default class O2TVCZProvider extends IPTVProvider{
    public static ProviderType = IPTVProviderType.O2TV_CZ;

    public static async CreateSession(): Promise<O2TVCZProvider>{
        const DeviceId = Utils.RandomString(16).toUpperCase();

        const KS = await O2TVAPI.AnonymousLogin();
        Logger.Trace(Logger.Type.IPTV, 'KS:', KS);
        if(!KS) throw new Error('Failed to create session, KS is null');

        const Token = await O2TVAPI.Login(DeviceId);
        Logger.Trace(Logger.Type.IPTV, 'Token:', Token);
        if(!Token) throw new Error('Failed to create session, JWT Token is null');

        const KSServices = await O2TVAPI.GetAccountServices(Token, KS.ks).then(x => {
            if(!x || x.length < 1) throw new Error('Failed to create session, account has no services?');
            
            return x.reduce((arr, Service) => {
                Object.entries(Service).forEach(([id, code]) => arr[code] = id);
                return arr;
            }, {});
        });
        if(!KSServices || Object.keys(KSServices).length < 1){
            throw new Error('Failed to create session, account has no services?');
        }

        Logger.Info(Logger.Type.IPTV, 'Found services:', KSServices);

        let Service: ServiceData|null = null;
        for(const [Code, Name] of Object.entries(KSServices)){
            const ServiceData = await O2TVAPI.KalturaLogin(KS.ks, Token, DeviceId, Code);
            Logger.Trace(Logger.Type.IPTV, `Service ${Name} (${Code}):`, ServiceData);
            if(!ServiceData) throw new Error(`Failed to create session, failed to login to service ${Name} (${Code})`);

            Service = {
                KS: ServiceData.ks,
                Expiry: ServiceData.expiry,
                RefreshToken: ServiceData.refreshToken
            };
        }

        if(!Service) throw new Error('Failed to create session, no valid service found');
        return new O2TVCZProvider(process.env.PROVIDER_USERNAME, process.env.PROVIDER_PASSWORD, DeviceId, Service);
    }

    public static FromSession = (Data: SessionData) => new Promise<O2TVCZProvider>((Resolve, Reject) => {
        if(!Data.DeviceId || !Data.Service) return Reject(SessionLoadError.INVALID_SAVED_SESSION_DATA);
        if(Data.Service.Expiry <= Date.now()/1000) return Reject(SessionLoadError.SESSION_EXPIRED);
        return Resolve(new O2TVCZProvider(process.env.PROVIDER_USERNAME, process.env.PROVIDER_PASSWORD, Data.DeviceId, Data.Service));
    });

    public DeviceId: string;
    public Session: ServiceData;

    constructor(Username: string, Password: string, DeviceId: string, Session: ServiceData) {
        super(IPTVProviderType.O2TV_CZ, Username, Password);

        this.DeviceId = DeviceId;
        this.Session = Session;
    }

    public get Data(){
        return {
            DeviceId: this.DeviceId,
            Service: this.Session
        };
    }

    public get SessionToken(){
        return this.Session.KS;
    }

    public get SessionExpiry(){
        return this.Session.Expiry;
    }

    public async LoadChannels(){
        this.Channels = await O2TVAPI.GetChannels(this.SessionToken);
        return this.Channels;
    }

    public async GetMultiDimensionChannels(){
        const MDChannels: IPTVMDChannel[] = [];
        const LiveEPG = await this.GetLiveEPG();
        if(!LiveEPG) return MDChannels;

        let ChannelNumber = 1000;
        for(const EPG of LiveEPG){
            if(!(EPG instanceof IPTVMdEpg)) continue;
            if(EPG.StartDate.getTime() > Date.now() || EPG.EndDate.getTime() < Date.now()){
                Logger.Debug(Logger.Type.IPTV, `Skipping EPG ${EPG.Name} as it's not live`);
                continue;
            }

            const Channel = this.Channels?.find(x => x.Id === EPG.ChannelId) || new IPTVChannel({
                Id: EPG.ChannelId,
                Number: ChannelNumber++,
                Name: 'O2TV MD'
            });

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

    public GetStream = (Channel: IPTVChannel) => O2TVAPI.GetStreamLive(this.SessionToken, Channel);
    public GetStreamCatchup = (StartTS: Date, EndTS: Date, Channel: IPTVChannel) => O2TVAPI.GetStreamCatchup(this.SessionToken, StartTS, EndTS, Channel);

    public GetLiveEPG = () => O2TVAPI.GetLiveEPG(this.SessionToken);

    public async GetEPG(){
        if(!this.Channels) await this.LoadChannels();
        const Result = { Channels: this.Channels, EPG: [] as IPTVEpg[] };

        const StartTS = Math.floor(Date.now() / 1000);
        const EndTS = StartTS + 60*60*24 - 1;

        const ChannelsIds: string[] = [];
        for(const Channel of this.Channels){
            ChannelsIds.push(`linear_media_id:'${Channel.Id}'`);
        }

        for(let i = 0; i < ChannelsIds.length; i += 5){
            const ChannelsQuery = ChannelsIds.slice(i, i + 5).join(' ');
            const ChannelEPG = await O2TVAPI.GetEPG({
                language: 'ces',
                ks: this.SessionToken,
                pager: {
                    objectType: 'KalturaFilterPager',
                    pageSize: 500,
                    pageIndex: 1
                },
                filter: {
                    objectType: 'KalturaSearchAssetFilter',
                    orderBy: 'START_DATE_ASC',
                    kSql: `(and (or ${ChannelsQuery}) start_date >= '${StartTS-60*60*24*Config.EPGDaysBack}' end_date <= '${EndTS+60*60*24*Config.EPGDaysForward}' asset_type='epg' auto_fill=true)`
                }
            });
            if(!ChannelEPG) continue;

            for(const EPGItem of ChannelEPG){
                const Channel = this.Channels?.find(x => x.Id === EPGItem.ChannelId);
                if(!Channel) continue;
                Result.EPG.push(EPGItem);
            }
        }
        
        return Result;
    }
}

type SessionData = {
    DeviceId: string;
    Service: ServiceData;
};

type ServiceData = {
    KS: string;
    Expiry: number;
    RefreshToken: string;
};