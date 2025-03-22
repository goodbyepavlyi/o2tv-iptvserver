import IPTVProvider, { SessionLoadError } from './IPTVProvider';
import { IPTVProviderType } from '../IPTVProviderType';
import O2TVAPI from '../API/O2TVAPI';
import IPTVChannel from '../Models/IPTVChannel';
import IPTVMDChannel from '../Models/IPTVMDChannel';
import IPTVEpg from '../Models/IPTVEpg';
import IPTVMdEpg from '../Models/IPTVMdEpg';

import Logger from '../../Logger';
import Utils from '../../Utils';
import HTTP from '../../Utils/HTTP';
import Config from '../../Config';

export default class O2TVSKProvider extends IPTVProvider{
    public static ProviderType = IPTVProviderType.O2TV_SK;

    public static async CreateSession(): Promise<O2TVSKProvider>{
        const DeviceId = Utils.RandomString(16).toUpperCase();

        const KS = await O2TVAPI.AnonymousLogin();
        Logger.Trace(Logger.Type.IPTV, 'KS:', KS);
        if(!KS) throw new Error('Failed to create session, KS is null');

        const Token = await O2TVAPI.Login(DeviceId);
        Logger.Trace(Logger.Type.IPTV, 'Token:', Token);
        if(!Token) throw new Error('Failed to create session, JWT Token is null');

        const LoginSession = await O2TVAPI.KalturaLogin(KS.ks, Token, DeviceId);
        Logger.Trace(Logger.Type.IPTV, 'LoginSession:', LoginSession);

        await O2TVAPI.GetHouseholdDevice(KS.ks)
            .catch(x => 
                O2TVAPI.AddHouseholdDevice(LoginSession.ks, DeviceId)
                    .then(x => Logger.Debug(Logger.Type.IPTV, 'Added household device:', x))
                    .catch(x => {
                        Logger.Error(Logger.Type.IPTV, 'Failed to add household device:', x);
                        throw new Error('Failed to create session, failed to add household device');
                    })
            );

        return new O2TVSKProvider(process.env.PROVIDER_USERNAME, process.env.PROVIDER_PASSWORD, DeviceId, {
            KS: LoginSession.ks,
            Expiry: LoginSession.expiry,
            RefreshToken: LoginSession.refreshToken
        });
    }
    
    public static FromSession = (Data: SessionData) => new Promise<O2TVSKProvider>((Resolve, Reject) => {
        if(!Data.DeviceId || !Data.Service) return Reject(SessionLoadError.INVALID_SAVED_SESSION_DATA);
        if(Data.Service.Expiry <= Date.now()/1000) return Reject(SessionLoadError.SESSION_EXPIRED);
        return Resolve(new O2TVSKProvider(process.env.PROVIDER_USERNAME, process.env.PROVIDER_PASSWORD, Data.DeviceId, Data.Service));
    });

    public DeviceId: string;
    public Session: ServiceData;

    constructor(Username: string, Password: string, DeviceId: string, Session: ServiceData){
        super(IPTVProviderType.O2TV_SK, Username, Password);
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

    private ParseStreamUrl = (StreamUrl: string) => HTTP.GetAndReturnRedirect(StreamUrl)
        .then(x => new URL(x))
        .then(Url => {
                const StreamUrlQuery = new URLSearchParams(StreamUrl);
                if(StreamUrlQuery.get('begin')) Url.searchParams.set('begin', StreamUrlQuery.get('begin')!);
                if(StreamUrlQuery.get('end')) Url.searchParams.set('end', StreamUrlQuery.get('end')!);
                return Url.toString().replace(/output[0-9]+\//, 'output0/');
            });

    public GetStream = (Channel: IPTVChannel|IPTVMDChannel) => O2TVAPI.GetStreamLive(this.SessionToken, Channel)
        .then(x => this.ParseStreamUrl(x));

    public GetStreamCatchup = (StartTS: Date, EndTS: Date, Channel: IPTVChannel|IPTVMDChannel) => O2TVAPI.GetStreamCatchup(this.SessionToken, StartTS, EndTS, Channel)
        .then(x => this.ParseStreamUrl(x));

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
                language: 'slk',
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