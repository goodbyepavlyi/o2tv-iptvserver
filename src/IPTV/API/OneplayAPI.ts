import ws from 'ws';

import HTTP from '../../Utils/HTTP';
import Logger from '../../Logger';

import IPTVEpg from '../Models/IPTVEpg';
import IPTVMdEpg from '../Models/IPTVMdEpg';
import IPTVChannel from '../Models/IPTVChannel';
import IPTVMDChannel from '../Models/IPTVMDChannel';

export default class OneplayAPI{
    public static WS_TIMEOUT = 20000;

    public static Url = {
        HttpApi: 'https://http.cms.jyxo.cz/api/v3',
        WS: 'wss://ws.cms.jyxo.cz/websocket'
    };

    public static Routes = {
        UserLoginStep: `${this.Url.HttpApi}/user.login.step`,
        
        UserDeviceChange: `${this.Url.HttpApi}/user.device.change`,
        UserDeviceRemove: `${this.Url.HttpApi}/user.device.remove`,
        
        UserProfilesDisplay: `${this.Url.HttpApi}/user.profiles.display`,

        PageContentDisplay: `${this.Url.HttpApi}/page.content.display`,

        EpgDisplay: `${this.Url.HttpApi}/epg.display`,
        EpgChannelsDisplay: `${this.Url.HttpApi}/epg.channels.display`,

        SettingDisplay: `${this.Url.HttpApi}/setting.display`,

        ContentPlay: `${this.Url.HttpApi}/content.play`
    };

    public static get Headers(): Record<string, string>{
        return {
            'accept-encoding': 'gzip',
            'accept': '*/*',
            'content-type': 'application/json;charset=UTF-8',
            'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0'
        };
    }

    public static get GeneralBody(){
        return {
            deviceInfo: {
                deviceType: 'web',
                appVersion: '1.0.18',
                deviceManufacturer: 'Unknown',
                deviceOs: 'Linux'
            },
            capabilities: {
                async: 'websockets'
            }
        };
    }

    // API Callers
    public static async Post(Route: string, Body: any, Token?: string){
        try{
            const requestId = crypto.randomUUID();
            const clientId = crypto.randomUUID();

            const Socket = await this.ConnectToWebSocket(clientId);

            const { serverId, sessionId } = await new Promise<{ serverId: string, sessionId: string }>((Resolve, Reject) => {
                const ResponseTimeout = setTimeout(() => {
                    Socket.close();
                    return Reject('Timed out while waiting for serverId/sessionId from WebSocket');
                }, this.WS_TIMEOUT);

                Socket.once('json', (x: OneplayWSResponse) => {
                    if(!x?.data?.serverId || !x?.data?.sessionId) return Reject('Invalid serverId/sessionId response from WebSocket');
                    clearTimeout(ResponseTimeout);
                    return Resolve({ serverId: x.data.serverId, sessionId: x.data.sessionId });
                });
            });

            const Headers = this.Headers;
            if(Token){
                Headers['authorization'] = `Bearer ${Token}`;
            }

            Logger.Debug(Logger.Type.IPTV, 'Calling API:', Route);
            await HTTP.Post(Route, {
                ...this.GeneralBody,
                ...Body,
                context: { requestId, clientId, sessionId, serverId }
            }, Headers).then((res: any) => {
                const data = res as OneplayAPIResponse;
                if(!data.result || data.result.status != 'OkAsync'){
                    throw data;
                }
            });

            return await new Promise<OneplayWSDataResponse>((Resolve, Reject) => {
                Logger.Debug(Logger.Type.IPTV, 'Waiting for response from WebSocket for requestId:', requestId);
                const ResponseTimeout = setTimeout(() => {
                    Socket.close();
                    return Reject(`Failed to get response from WebSocket for requestId: ${requestId}`);
                }, this.WS_TIMEOUT);

                Socket.on('json', (x: OneplayWSResponse) => {
                    if(x?.response?.context?.requestId != requestId){
                        return;
                    }

                    Logger.Debug(Logger.Type.IPTV, 'Received response for requestId:', requestId);
                    if(x?.response?.result?.status != 'Ok'){
                        Logger.Error(Logger.Type.IPTV, 'Response status not OK:', x);
                        return Reject('Response status not OK');
                    }
                    
                    clearTimeout(ResponseTimeout);
                    Socket.close();
                    
                    const res = x?.response?.data;
                    if(res?.err) return Reject(res?.err);
                    return Resolve(res);
                });
            });
        }catch(err: any){
            Logger.Error(Logger.Type.IPTV, `Failed to call API:`, err);
            throw err;
        }
    }

    public static ConnectToWebSocket = (ClientId: string) => new Promise<ws>((Resolve, Reject) => {
        try{
            const Socket = new ws(`${this.Url.WS}/${ClientId}`);
            Logger.Debug(Logger.Type.IPTV, 'Connecting to WebSocket:', Socket.url);

            Socket.on('message', (Data) => {
                try{
                    const Response = JSON.parse(Data.toString());
                    Logger.Trace(Logger.Type.IPTV, '<= Oneplay WS:', Response);
                    Socket.emit('json', Response);
                }catch(err: any){
                    Logger.Error(Logger.Type.IPTV, 'Failed to parse WebSocket response:', err);
                    Reject(err);
                }
            });

            Socket.on('open', () => {
                Logger.Debug(Logger.Type.IPTV, 'Connected to WebSocket');
                return Resolve(Socket);
            });
        }catch(err: any){
            Logger.Error(Logger.Type.IPTV, 'Failed to connect to WebSocket:', err);
            return Reject(err);
        }
    });
    
    // API Authentication
    public static async Login(): Promise<string>{
        const LoginStep = await this.Post(this.Routes.UserLoginStep, {
            payload: {
                command: {
                    schema: 'LoginWithCredentialsCommand',
                    email: process.env.PROVIDER_USERNAME,
                    password: process.env.PROVIDER_PASSWORD
                }
            }
        }).then((res: any) => {
            if(!res.step || (!res?.step?.bearerToken && res?.step?.schema != 'ShowAccountChooserStep')){
                throw new Error('Invalid login response');
            }

            return res.step;
        });

        const DeviceId = LoginStep.currentUser.currentDevice.id;

        // Change current session's device name
        await this.RenameDevice(LoginStep.bearerToken, DeviceId, process.env.PROVIDER_ONEPLAY_DEVICE_NAME);
        
        // Remove old devices with the same device name
        const Devices = await this.GetDevices(LoginStep.bearerToken);
        for(const Device of Devices.filter(x => x.id != DeviceId && x.name == process.env.PROVIDER_ONEPLAY_DEVICE_NAME)){
            Logger.Info(Logger.Type.IPTV, `ONEPLAY => Removing old device ${Device.name} (${Device.id})`);
            await this.RemoveDevice(LoginStep.bearerToken, Device.id);
        }

        return LoginStep.bearerToken;
    }

    // Device manipulation
    public static GetDevices = (Token: string): Promise<OneplayDeviceInfo[]> => this.Post(this.Routes.SettingDisplay, {
        payload: {
            screen: 'devices'
        }
    }, Token).then(res => {
        if(!res?.screen?.userDevices){
            throw new Error('Invalid screen devices response');
        }

        return res.screen.userDevices.devices;
    });

    public static RenameDevice = (Token: string, DeviceId: string, Name: string) => this.Post(this.Routes.UserDeviceChange, {
        payload: {
            id: DeviceId,
            name: Name
        }
    }, Token);

    public static RemoveDevice = (Token: string, DeviceId: string) => this.Post(this.Routes.UserDeviceRemove, {
        payload: {
            criteria: {
                schema: 'UserDeviceIdCriteria',
                id: DeviceId
            }
        }
    }, Token);

    // Profile
    public static GetProfiles = (Token: string): Promise<any> => this.Post(this.Routes.UserProfilesDisplay, null, Token).then(res => {
        if(!res?.availableProfiles?.profiles){
            throw new Error('Invalid user profiles response');
        }

        return res.availableProfiles.profiles;
    });

    // EPG
    public static EpgDisplay = (Token: string, StartTS: Date, EndTS: Date) => this.Post(this.Routes.EpgDisplay, {
        payload: {
            criteria: {
                channelSetId: 'channel_list.1',
                viewport: {
                    channelRange: {
                        from: 0,
                        to: 200
                    },
                    timeRange: {
                        from: StartTS.toISOString(),
                        to: EndTS.toISOString(),
                    },
                    schema: 'EpgViewportAbsolute'
                }
            },
            requestedOutput: {
                channelList: 'none',
                datePicker: false,
                channelSets: false
            }
        }
    }, Token);

    private static async ParseEPGMDItem(Token: string, ContentId: string|number, ChannelId: string|number, EPGStartTS: Date, EPGEndTS: Date, Image: string){
        const EPGData: IPTVEpg[] = [];
        const MdData = await this.Post(this.Routes.PageContentDisplay, {
            payload: {
                contentId: ContentId
            }
        }, Token);

        for(const Block of MdData.layout.blocks){
            if(Block.schema != 'TabBlock') continue;
         
            for(const MdItem of Block.layout.blocks[0].carousels[0].tiles){
                let Id;
                if('criteria' in MdItem.action.params.payload && 'contentId' in MdItem.action.params.payload.criteria){
                    Id = MdItem.action.params.payload.criteria.contentId;
                }else if('contentId' in MdItem.action.params.payload){
                    Id = MdItem.action.params.payload.contentId;
                }

                if(!Id) continue;

                EPGData.push(new IPTVMdEpg({
                    Id,
                    ChannelId,
                    Name: MdItem.title,
                    Description: MdItem.description,
                    StartDate: EPGStartTS,
                    EndDate: EPGEndTS,
                    Cover: Image.replace('{WIDTH}', '480').replace('{HEIGHT}', '320'),
                    Poster: Image.replace('{WIDTH}', '480').replace('{HEIGHT}', '320')
                }));
            }
        }

        return EPGData;
    }

    public static async GetDayEPG(Token: string, StartTS: Date, EndTS: Date){
        const EPGData: IPTVEpg[] = [];

        const EPG = await this.EpgDisplay(Token, StartTS, EndTS);
        for(const Channel of EPG.schedule){
            for(const Item of Channel.items){
                const EPGStartTS = new Date(Item.startAt);
                const EPGEndTS = new Date(Item.endAt);

                if(!Item.actions[0].params?.contentType || !Item.actions[0].params?.payload){
                    continue;
                }

                const Id = Item.actions[0].params.contentType == 'show' ? Item.actions[0].params.payload.deeplink.epgItem : Item.actions[0].params.payload.contentId;

                if(Item.labels.length > 0 && Item.labels[0]?.name == 'content.plugin_mapper.collection_detail_plugin_mapper.action.multi_dimension'){
                    const EPGItem = await this.ParseEPGMDItem(Token, Id, Channel.channelId, EPGStartTS, EPGEndTS, Item.image);
                    EPGData.push(...EPGItem);
                }

                EPGData.push(new IPTVEpg({
                    Id: Id,
                    ChannelId: Channel.channelId,
                    Name: Item.title,
                    Description: Item.description,
                    StartDate: EPGStartTS,
                    EndDate: EPGEndTS,
                    Cover: Item.image.replace('{WIDTH}', '480').replace('{HEIGHT}', '320'),
                    Poster: Item.image.replace('{WIDTH}', '480').replace('{HEIGHT}', '320')
                }));
            }
        }

        return EPGData;
    }

    public static async GetChannelEPG(Token: string, ChannelId: string|number, StartTS: Date, EndTS: Date){
        const EPGData: IPTVEpg[] = [];
        
        const EPG = await this.EpgDisplay(Token, new Date(StartTS.getTime() - 60*60*1000), new Date(EndTS.getTime() - 60*60*1000));
        const ChannelEPG = EPG.schedule.find((x: any) => x.channelId == ChannelId);
        if(!ChannelEPG){
            throw new Error('Channel EPG not found');
        }

        for(const Item of ChannelEPG.items){
            const EPGStartTS = new Date(Item.startAt);
            const EPGEndTS = new Date(Item.endAt);

            if(!Item.actions[0].params?.contentType || !Item.actions[0].params?.payload){
                continue;
            }

            const Id = Item.actions[0].params.contentType == 'show' || Item.actions[0].params.contentType == 'movie' ? Item.actions[0].params.payload.deeplink.epgItem : Item.actions[0].params.payload.contentId;

            if(Item.labels.length > 0 && Item.labels[0]?.name == 'content.plugin_mapper.collection_detail_plugin_mapper.action.multi_dimension'){
                const EPGItem = await this.ParseEPGMDItem(Token, Id, ChannelId, EPGStartTS, EPGEndTS, Item.image);
                EPGData.push(...EPGItem);
            }

            EPGData.push(new IPTVEpg({
                Id: Id,
                ChannelId,
                Name: Item.title,
                Description: Item.description,
                StartDate: EPGStartTS,
                EndDate: EPGEndTS,
                Cover: Item.image.replace('{WIDTH}', '480').replace('{HEIGHT}', '320'),
                Poster: Item.image.replace('{WIDTH}', '480').replace('{HEIGHT}', '320')
            }));
        }

        Logger.Trace(Logger.Type.IPTV, 'EPGData:', EPGData);
        return EPGData;
    }

    // Channel manipulation
    public static async GetChannels(Token: string): Promise<IPTVChannel[]>{
        const Channels: IPTVChannel[] = [];

        const ProfileId = await this.GetProfiles(Token)
            .then(x => x.find((x: any) => x.profile.id != null).profile.id)
        if(!ProfileId){
            throw new Error('No valid profile found');
        }

        const EPGDisplay = await this.Post(this.Routes.EpgChannelsDisplay, {
            payload: {
                profileId: ProfileId
            }
        }, Token).then(res => {
            if(!res?.channelList){
                throw new Error('Invalid EPG channels response');
            }

            return res.channelList;
        });

        for(const Channel of EPGDisplay){
            Channels.push(new IPTVChannel({
                Id: Channel.id,
                Name: Channel.name,
                Number: Channel.number,
                Logo: Channel.logo ? Channel.logo.replace('{WIDTH}', 480).replace('{HEIGHT}', 320) : null,
                Adult: Channel.adult
            }));
        }

        return Channels;
    }

    // Stream
    public static async GetStream(Token: string, Channel: IPTVChannel|IPTVMDChannel, CatchupEPG?: IPTVEpg){
        const StreamRequestData: Record<string, any> = {
            payload: {
                criteria: {
                    schema: Channel instanceof IPTVMDChannel ? 'MDPlaybackCriteria' : 'ContentCriteria',
                    contentId: CatchupEPG ? CatchupEPG.Id : Channel instanceof IPTVMDChannel ? Channel.Id : `channel.${Channel.Id}`
                }
            },
            playbackCapabilities: {
                protocols: ['dash', 'hls'],
                drm: ['widevine', 'fairplay'],
                altTransfer: 'Unicast',
                subtitle: {
                    formats: ['vtt'],
                    locations: ['InstreamTrackLocation', 'ExternalTrackLocation']
                },
                liveSpecificCapabilities: {
                    protocols: ['dash', 'hls'],
                    drm: ['widevine', 'fairplay'],
                    altTransfer: 'Unicast',
                    multipleAudio: false
                }
            }
        };

        if(Channel instanceof IPTVMDChannel){
            StreamRequestData.payload.criteria.position = 0;
        }

        if(Channel instanceof IPTVChannel){
            StreamRequestData.payload.startMode = 'live';
        }
        
        if(Channel.Adult){
            Logger.Info(Logger.Type.IPTV, `&c${Channel.Name}&r is an adult channel, adding PIN...`);
            if(!process.env.PROVIDER_PIN){
                throw new Error('PIN not set, cannot play adult content. Set the PIN in the environment variables.');
            }

            StreamRequestData.authorization = [{
                schema: 'PinRequestAuthorization',
                pin: process.env.PROVIDER_PIN,
                type: 'parental'
            }];
        }

        const StreamData = await this.Post(this.Routes.ContentPlay, StreamRequestData, Token);
        for(const Stream of StreamData.media.stream.assets){
            if(Stream.protocol != 'hls' && Stream.drm){
                Logger.Warn(Logger.Type.IPTV, 'Skipping non-HLS stream with DRM:', Stream);
                continue;
            }

            return Stream.src;
        }
    }

    public static GetStreamLive = (Token: string, Channel: IPTVChannel|IPTVMDChannel) => this.GetStream(Token, Channel);

    public static async GetStreamCatchup(Token: string, StartTS: Date, EndTS: Date, Channel: IPTVChannel|IPTVMDChannel){
        const ChannelEPG = await this.GetChannelEPG(Token, Channel.Id, StartTS, new Date(EndTS.getTime() + 12*60*60*1000));
        if(!ChannelEPG) throw new Error('Channel EPG not found');

        const CatchupEPG = ChannelEPG.find(x => StartTS.getTime() == x.StartDate.getTime());
        if(!CatchupEPG) throw new Error('Catchup EPG not found');

        if(CatchupEPG.EndDate.getTime() > Date.now() - 10){
            Logger.Info(Logger.Type.IPTV, `Catchup EPG for ${Channel.Name} is still live, playing live stream...`);
            return this.GetStreamLive(Token, Channel);
        }

        return await this.GetStream(Token, Channel, CatchupEPG);
    }
}

interface OneplayAPIResponse{
    result:{
        status: 'OkAsync';
        schema: 'OkResultAsync';
    }
    context:{
        requestId: string;
        clientId: string;
        sessionId: string;
        serverId: string;
    }
};

interface OneplayWSResponse{
    result:{
        status: 'OkAsync';
        schema: 'OkResultAsync';
    }
    data:{
        [key: string]: any;
    }
    response:{
        result:{
            status: 'Ok';
        }
        context:{
            requestId: string;
        }
        data: OneplayWSDataResponse;
    }
};

interface OneplayWSDataResponse{
    [key: string]: any;
};

interface OneplayDeviceInfo{
    id: string;
    name: string;
};