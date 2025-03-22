import crypto from 'node:crypto';
import { AxiosError } from 'axios';

import HTTP from '../../Utils/HTTP';
import Logger from '../../Logger';

import { IPTVProviderType } from '../IPTVProviderType';
import IPTVChannel from '../Models/IPTVChannel';
import IPTVEpg from '../Models/IPTVEpg';
import IPTVMdEpg from '../Models/IPTVMdEpg';
import IPTVMDChannel from '../Models/IPTVMDChannel';

export default class O2TVAPI{
    public static get APIRegion(): IPTVProviderType.O2TV_CZ|IPTVProviderType.O2TV_SK{
        return process.env.PROVIDER_TYPE as IPTVProviderType.O2TV_CZ|IPTVProviderType.O2TV_SK;
    };

    public static Settings = {
        [IPTVProviderType.O2TV_CZ]: {
            ClientTag: '1.22.0-PC',
            ApiVersion: '5.4.0',
            PartnerId: 3201,
            Language: 'ces'
        },
        [IPTVProviderType.O2TV_SK]: {
            ClientId: 'LdGXxfxItAAttubmGsfG1X9Z3s8a',
            ClientTag: '9.57.0-PC',
            ApiVersion: '5.4.0',
            PartnerId: 3206,
            Language: 'slk'
        }
    };

    public static Routes = {
        [IPTVProviderType.O2TV_CZ]: {
            AnonymousLogin: `https://${this.Settings[IPTVProviderType.O2TV_CZ].PartnerId}.frp1.ott.kaltura.com/api_v3/service/ottuser/action/anonymousLogin?format=1&clientTag=${this.Settings[IPTVProviderType.O2TV_CZ].ClientTag}`,
            Login: `https://login-a-moje.o2.cz/cas-external/v1/login`,
            KalturaLogin: `https://${this.Settings[IPTVProviderType.O2TV_CZ].PartnerId}.frp1.ott.kaltura.com/api_v3/service/ottuser/action/login?format=1&clientTag=${this.Settings[IPTVProviderType.O2TV_CZ].ClientTag}`,

            AccountServices: `https://${this.Settings[IPTVProviderType.O2TV_CZ].PartnerId}.frp1.ott.kaltura.com/api/p/${this.Settings[IPTVProviderType.O2TV_CZ].PartnerId}/service/CZ/action/Invoke`,
            List: `https://${this.Settings[IPTVProviderType.O2TV_CZ].PartnerId}.frp1.ott.kaltura.com/api_v3/service/asset/action/list?format=1&clientTag=${this.Settings[IPTVProviderType.O2TV_CZ].ClientTag}`,
            Multirequest: `https://${this.Settings[IPTVProviderType.O2TV_CZ].PartnerId}.frp1.ott.kaltura.com/api_v3/service/multirequest`
        },
        [IPTVProviderType.O2TV_SK]: {
            AnonymousLogin: `https://${this.Settings[IPTVProviderType.O2TV_SK].PartnerId}.frp1.ott.kaltura.com/api_v3/service/ottuser/action/anonymousLogin?format=1&clientTag=${this.Settings[IPTVProviderType.O2TV_SK].ClientTag}`,
            KalturaLogin: `https://${this.Settings[IPTVProviderType.O2TV_SK].PartnerId}.frp1.ott.kaltura.com/api_v3/service/ottuser/action/login?format=1&clientTag=${this.Settings[IPTVProviderType.O2TV_SK].ClientTag}`,

            SessionDataKey: (Code: string) => `https://api.o2.sk/oauth2/authorize?response_type=code&client_id=${this.Settings[IPTVProviderType.O2TV_SK].ClientId}&redirect_uri=https://www.o2tv.sk/auth/&code_challenge=${Code}&code_challenge_method=S256&scope=tv_info`,
            CommonAuth: 'https://api.o2.sk/commonauth',
            OAuthToken: 'https://api.o2.sk/oauth2/token',

            HouseholdGetDevice: `https://${this.Settings[IPTVProviderType.O2TV_SK].PartnerId}.frp1.ott.kaltura.com/api_v3/service/householddevice/action/get?format=1&clientTag=${this.Settings[IPTVProviderType.O2TV_SK].ClientTag}`,
            HouseholdAddDevice: `https://${this.Settings[IPTVProviderType.O2TV_SK].PartnerId}.frp1.ott.kaltura.com/api_v3/service/householddevice/action/add?format=1&clientTag=${this.Settings[IPTVProviderType.O2TV_SK].ClientTag}`,

            List: `https://${this.Settings[IPTVProviderType.O2TV_SK].PartnerId}.frp1.ott.kaltura.com/api_v3/service/asset/action/list?format=1&clientTag=${this.Settings[IPTVProviderType.O2TV_SK].ClientTag}`,
            Multirequest: `https://${this.Settings[IPTVProviderType.O2TV_SK].PartnerId}.frp1.ott.kaltura.com/api_v3/service/multirequest`
        }
    };

    public static Headers = {
        'accept-encoding': 'gzip',
        'accept': '*/*',
        'content-type': 'application/json;charset=UTF-8',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0'
    };

    public static get GeneralBody(){
        return {
            clientTag: this.Settings[O2TVAPI.APIRegion]?.ClientTag,
            apiVersion: this.Settings[O2TVAPI.APIRegion]?.ApiVersion,
            partnerId: this.Settings[O2TVAPI.APIRegion]?.PartnerId
        };
    }

    private static PKCEChallengeFromVerifier(CodeVerifier: string){
        return crypto.createHash('sha256')
            .update(CodeVerifier)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    private static GenerateChallengeCode(){
        const Verifier = Array.from(crypto.getRandomValues(new Uint8Array(28)), byte => byte.toString(16).padStart(2, '0')).join('');
        const Challenge = this.PKCEChallengeFromVerifier(Verifier);
        return { Verifier, Challenge };
    }

    // API Callers
    public static Post = (Route: string, Body: any) => HTTP.Post(Route, Body, this.Headers)
        .then(res => {
            Logger.Trace(Logger.Type.IPTV, `=> ${Route}`, Body);
            Logger.Trace(Logger.Type.IPTV, `<= ${Route}`, res);
            return res;
        }).catch(err => {
            if(!(err instanceof AxiosError)) throw err;

            throw {
                status: err.response?.status,
                data: err.response?.data,
            };
        });

    public static KalturaPost = (Route: string, Body: any) => this.Post(Route, {...this.GeneralBody, ...Body})
        .then(res => {
            const data = res as KalturaAPIResponse;
            if(data.result?.error) throw data.result?.error;
            return data.result;
        });

    public static async PostList(Body: KalturaListBody){
        const Result: any = [];
        let Fetch = true;

        while(Fetch){
            await this.KalturaPost(this.Routes[O2TVAPI.APIRegion].List, Body)
                .then((Data: any) => {
                    const { totalCount, objects } = Data as { totalCount: number; objects: KalturaChannel[] };
                    if(totalCount == 0) return Fetch = false;
                    if(objects.length == totalCount) Fetch = false;

                    for(const x of objects){
                        Result.push(x);
                    }
                    
                    Body['pager']['pageIndex'] += 1;
                });

            Fetch = false;
        }

        return Result;
    }

    // API Authentication
    public static AnonymousLogin = () => this.KalturaPost(this.Routes[O2TVAPI.APIRegion].AnonymousLogin, {
        language: '*'
    }).then((x: any) => ({
        expiry: x.expiry,
        ks: x.ks,
        refreshToken: x.refreshToken
    }));

    public static async Login(DeviceId: string){
        if(O2TVAPI.APIRegion == IPTVProviderType.O2TV_CZ){
            return this.Post(this.Routes[O2TVAPI.APIRegion].Login, {
                service: 'https://www.new-o2tv.cz/',
                username: process.env.PROVIDER_USERNAME,
                password: process.env.PROVIDER_PASSWORD,
                udid: DeviceId
            }).then((x: any) => x.jwt);
        }
        
        // O2TV-SK
        const { Verifier, Challenge } = O2TVAPI.GenerateChallengeCode();
        Logger.Trace(Logger.Type.IPTV, 'PKCE Verifier:', Verifier);
        Logger.Trace(Logger.Type.IPTV, 'PKCE Challenge:', Challenge);

        const SessionDataKey = await HTTP.GetAndReturnRedirect(this.Routes[IPTVProviderType.O2TV_SK].SessionDataKey(Challenge))
            .then(x => x.match(/sessionDataKey=([a-z0-9-]+)/i)?.[1] ?? null);

        if(!SessionDataKey) throw new Error('Failed to get session data key, no key found');
        Logger.Trace(Logger.Type.IPTV, 'SessionDataKey:', SessionDataKey);

        const OAuthCode = await HTTP.PostAndReturnRedirect(this.Routes[IPTVProviderType.O2TV_SK].CommonAuth, {
            handler: 'UIDAuthenticationHandler',
            sessionDataKey: SessionDataKey,
            username: process.env.PROVIDER_USERNAME,
            password: process.env.PROVIDER_PASSWORD
        }, {'content-type': 'application/x-www-form-urlencoded'})
            .then(x => x.match(/code=([a-z0-9-]+)/i)?.[1] ?? null);

        if(!OAuthCode) throw new Error('Failed to get OAuth code, no code found');
        Logger.Trace(Logger.Type.IPTV, 'OAuthCode:', OAuthCode);
        
        const AccessToken = await HTTP.Post(this.Routes[IPTVProviderType.O2TV_SK].OAuthToken, {
            grant_type: 'authorization_code',
            client_id: this.Settings[IPTVProviderType.O2TV_SK].ClientId,
            code: OAuthCode,
            redirect_uri: 'https://www.o2tv.sk/auth/',
            code_verifier: Verifier
        }, {'content-type': 'application/x-www-form-urlencoded'})
            .then((x: any) => x.access_token);

        if(!AccessToken) throw new Error('Failed to get access token, no token found');
        Logger.Trace(Logger.Type.IPTV, 'AccessToken:', AccessToken);
        return AccessToken;
    }

    public static async GetAccountServices(JWTToken: string, KS: string): Promise<Record<string, string>[]>{
        if(O2TVAPI.APIRegion != IPTVProviderType.O2TV_CZ) throw new Error('Unsupported API region'); 

        return this.KalturaPost(this.Routes[O2TVAPI.APIRegion].AccountServices, {
            ks: KS,
            intent: 'Service List',
            adapterData: [
                { key: 'access_token', value: JWTToken },
                { key: 'pageIndex', value: '0' },
                { key: 'pageSize', value: '100' }
            ],
        }).then((x: any) => JSON.parse(x.adapterData.service_list.value).ServicesList);
    }

    public static async KalturaLogin(KS: string, JWTToken: string, DeviceId: string, ServiceId?: string){
        const KalturaBody = {
            language: this.Settings[O2TVAPI.APIRegion].Language,
            ks: KS,
            udid: DeviceId,
            extraParams: {} as Record<string, any>,
        };

        switch(this.APIRegion){
            case IPTVProviderType.O2TV_CZ:
                Object.assign(KalturaBody, {
                    username: 'NONE',
                    password: 'NONE',
                    extraParams: {
                        token: { objectType: 'KalturaStringValue', value: JWTToken },
                        loginType: { objectType: 'KalturaStringValue', value: 'accessToken' },
                        brandId: { objectType: 'KalturaStringValue', value: '22' },
                        ...(ServiceId && { externalId: { objectType: 'KalturaStringValue', value: ServiceId } }),
                    },
                });
                break;
            case IPTVProviderType.O2TV_SK:
                Object.assign(KalturaBody, {
                    username: '11111',
                    password: '11111',
                    extraParams: {
                        loginType: { objectType: 'KalturaStringValue', value: 'accessToken' },
                        accessToken: { objectType: 'KalturaStringValue', value: JWTToken },
                    },
                });
                break;
            default:
                throw new Error('Invalid API region');
        }

        return this.KalturaPost(this.Routes[this.APIRegion].KalturaLogin, KalturaBody)
            .then((x: any) => ({
                expiry: x.loginSession.expiry,
                refreshToken: x.loginSession.refreshToken,
                ks: x.loginSession.ks
            }));
    }
    
    // Channel APIs
    public static async GetChannels(KS: string){
        let Channels: KalturaChannel[] = [];
        if(O2TVAPI.APIRegion == IPTVProviderType.O2TV_CZ){
            Channels = await this.PostList({
                ks: KS,
                language: 'ces',
                filter: {
                    objectType: 'KalturaChannelFilter',
                    kSql: "(and asset_type='607')",
                    idEqual: 355960
                },
                pager: {
                    objectType: 'KalturaFilterPager',
                    pageSize: 300,
                    pageIndex: 1
                }
            })
        }

        if(O2TVAPI.APIRegion == IPTVProviderType.O2TV_SK){
            Channels = await this.PostList({
                ks: KS,
                language: 'slk',
                filter: {
                    objectType: 'KalturaSearchAssetFilter',
                    kSql: "(and asset_type='714')"
                },
                pager: {
                    objectType: 'KalturaFilterPager',
                    pageIndex: 1,
                    pageSize: 500
                }
            });
        }

        return Channels.map((x: KalturaChannel) => new IPTVChannel({
            Id: x.id,

            Name: x.name,
            Number: x.metas?.ChannelNumber?.value,

            Logo: x.images?.find((x: any) => x.imageTypeId == 18)?.url || x.images[0]?.url ? `${x.images[0].url}/height/320/width/480` : undefined,

            StartDate: new Date(x.startDate*1000),
            CreateDate: new Date(x.createDate*1000),
            EndDate: new Date(x.endDate*1000)
        }));
    }

    // EPG APIs
    public static async GetEPG(Data: KalturaListBody): Promise<(IPTVEpg|IPTVMdEpg)[]|null>{
        const LiveEPG = await this.PostList(Data) as KalturaChannelEPG[];
        if(!LiveEPG) return null;

        const EPGData: (IPTVEpg|IPTVMdEpg)[] = [];
        for(const epg of LiveEPG){
            if((epg.objectType != 'KalturaProgramAsset' && epg.objectType != 'KalturaRecordingAsset') || !epg.linearAssetId) continue;

            const Item = new IPTVEpg({
                Id: epg.id,
                ChannelId: epg.linearAssetId,
                
                Name: epg.name,
                Description: epg.description,
        
                StartDate: new Date(epg.startDate*1000),
                EndDate: new Date(epg.endDate*1000)
            });

            const ImageRatios: Record<string, string> = {
                '2x3': '/height/720/width/480',
                '3x2' : '/height/480/width/720',
                '16x9' : '/height/480/width/853'
            };

            if(epg.images.length > 0){
                Item.Poster = `${epg.images[0].url}/${ImageRatios[epg.images[0].ratio]}`;
            }
            if(epg.images.length > 1){
                Item.Cover = `${epg.images[1].url}/${ImageRatios[epg.images[1].ratio]}`;
            }

            if(epg.metas['original_name']){
                Item.Meta.OriginalName = epg.metas['original_name'].value;
            }

            if(epg.metas['imdb_id']){
                Item.Meta.Imdb = epg.metas['imdb_id'].value;
            }

            if(epg.metas['Year']){
                Item.Meta.Year = epg.metas['Year'].value;
            }
            if(epg.metas['ContentType']){
                Item.Meta.ContentType = epg.metas['ContentType'].value;
            }

            if(epg.tags['Genre']){
                Item.Genre = epg.tags['Genre'].objects.map((x: any) => x.value);
            }
            if(epg.tags['PersonReference']){
                Item.Cast = epg.tags['PersonReference'].objects.map((x: any) => {
                    const PersonData = x.value.split('|');
                    return { Name: PersonData[1], Role: PersonData[2]??'' };
                });
            }
            if(epg.tags['Director']){
                Item.Directors = epg.tags['Director'].objects.map((x: any) => x.value);
            }
            if(epg.tags['Country'] && epg.tags['Country'].value){
                Item.Country = epg.tags['Country'].value as string;
            }

            // TV Show specific
            if(epg.metas['SeriesName']){
                Item.Show.SeriesName = epg.metas['SeriesName'].value;
            }
            if(epg.metas['SeasonName']){
                Item.Show.SeasonName = epg.metas['SeasonName'].value;
            }
            if(epg.metas['EpisodeName']){
                Item.Show.EpisodeName = epg.metas['EpisodeName'].value;
            }
            if(epg.metas['SeasonNumber']){
                Item.Show.SeasonNumber = epg.metas['SeasonNumber'].value;
            }
            if(epg.metas['EpisodeNumber']){
                Item.Show.EpisodeNumber = epg.metas['EpisodeNumber'].value;
                if(Item.Show.EpisodeNumber > 0){
                    Item.Name = `${Item.Name} (${Item.Show.EpisodeNumber})`;
                }
            }
            if(epg.metas['EpisodeInSeason']){
                Item.Show.EpisodesInSeason = epg.metas['EpisodeInSeason'].value;
            }
            
            if(epg.tags.MosaicInfo){
                const MDId = epg.tags.MosaicInfo.objects.find((x: any) => x.value.includes('MosaicProgramExternalId'))?.value.split('MosaicProgramExternalId=')[1];
                if(MDId){
                    Logger.Debug(Logger.Type.IPTV, `Found MultiDimension EPG: ${MDId} - ${Item.Name}`);

                    const MDEpgs = await this.GetMultiDimensionStream(Data.ks, MDId);
                    for(const MDEPG of MDEpgs){
                        EPGData.push(new IPTVMdEpg({
                            Id: MDEPG.id,
                            ChannelId: epg.linearAssetId,
                            
                            Name: MDEPG.name,
                            Description: MDEPG.description,
                    
                            StartDate: new Date(MDEPG.startDate*1000),
                            EndDate: new Date(MDEPG.endDate*1000),

                            Poster: Item.Poster,
                            Cover: Item.Cover
                        }));
                    }

                    continue;
                }
            }
            
            EPGData.push(Item);
        }

        return EPGData;
    }

    public static GetLiveEPG = (KS: string) => this.GetEPG({
        language: this.Settings[O2TVAPI.APIRegion].Language,
        ks: KS,
        filter: {
            objectType: 'KalturaSearchAssetFilter',
            orderBy: 'START_DATE_ASC',
            kSql: `(and start_date <= '${Math.floor(Date.now() / 1000)}' end_date >= '${Math.floor(Date.now() / 1000)}' asset_type='epg' auto_fill= true)`
        },
        pager: {
            objectType: 'KalturaFilterPager',
            pageSize: 500,
            pageIndex: 1
        }
    });

    public static GetChannelEPG = (KS: string, ChannelId: string|number, StartTS: number, EndTS: number) => this.GetEPG({
        language: this.Settings[O2TVAPI.APIRegion].Language,
        ks: KS,
        filter: {
            objectType: 'KalturaSearchAssetFilter',
            orderBy: 'START_DATE_ASC',
            kSql: `(and linear_media_id:'${ChannelId}' start_date >= '${StartTS}' start_date <= '${EndTS}' asset_type='epg' auto_fill=true)`
        },
        pager: {
            objectType: 'KalturaFilterPager',
            pageSize: 500,
            pageIndex: 1
        }
    });

    public static GetMultiDimensionStreamEPG = (KS: string, ExternalId: string|number): Promise<any> => this.KalturaPost(this.Routes[O2TVAPI.APIRegion].List, {
        language: this.Settings[O2TVAPI.APIRegion].Language,
        ks: KS,
        filter: {
            objectType: 'KalturaSearchAssetFilter',
            orderBy: 'START_DATE_ASC',
            kSql: `(and IsMosaicEvent='1' MosaicInfo='mosaic' (or externalId='${ExternalId}'))`
        },
        pager: {
            objectType: 'KalturaFilterPager',
            pageSize: 200,
            pageIndex: 1
        }
    }).then((x: any) => x.objects);

    public static GetMultiDimensionStreamEPGInfo = (KS: string, ExternalId: string): Promise<any> => this.KalturaPost(this.Routes[O2TVAPI.APIRegion].List, {
        ks: KS,
        language: this.Settings[O2TVAPI.APIRegion].Language,
        filter: {
            objectType: 'KalturaSearchAssetFilter',
            orderBy: 'START_DATE_ASC',
            kSql: `(or externalId='${ExternalId}')`
        },
        pager: {
            objectType: 'KalturaFilterPager',
            pageSize: 200,
            pageIndex: 1
        }
    }).then((x: any) => x.objects);

    // Stream APIs
    public static GetStream = async (KS: string, MediaId: string|number, AssetReferenceType: 'media'|'epg_internal', AssetType: 'media'|'epg', StreamContext: 'PLAYBACK'|'START_OVER'|'CATCHUP'): Promise<string> => this.KalturaPost(this.Routes[O2TVAPI.APIRegion].Multirequest, {
        ks: KS,
        '1': {
            service: 'asset',
            action: 'get',
            assetReferenceType: AssetReferenceType,
            id: MediaId,
            ks: KS
        },
        '2': {
            service: 'asset',
            action: 'getPlaybackContext',
            assetType: AssetType,
            assetId: MediaId,
            contextDataParams: {
                objectType: 'KalturaPlaybackContextOptions',
                context: StreamContext,
                streamerType: 'mpegdash',
                urlType: 'DIRECT',
                adapterData: {
                    codec: { value: 'AVC' },
                    quality: { value: 'UHD' }
                }   
            },
            ks: KS
        }
    }).then((x: any) => {
        if(!x?.[1]?.sources){
            throw new Error('Stream sources not found');
        }
        
        const URLs: Record<string, string> = {};
        for(const Stream of x[1]?.sources){
            URLs[Stream.type] = Stream.url;
        }

        Logger.Trace(Logger.Type.IPTV, 'O2TVApi#GetStream - DASH Streams:', URLs);
        return URLs['DASH'] || URLs['DASH_WV'];
    });

    public static async GetStreamLive(KS: string, Channel: IPTVChannel|IPTVMDChannel): Promise<string>{
        if(Channel instanceof IPTVMDChannel) return this.GetStream(KS, Channel.Id, 'epg_internal', 'epg', 'START_OVER');
        return this.GetStream(KS, Channel.Id, 'media', 'media', 'PLAYBACK');
    }

    public static async GetStreamCatchup(KS: string, StartTS: Date, EndTS: Date, Channel: IPTVChannel|IPTVMDChannel): Promise<string>{
        const ChannelEPG = await this.GetChannelEPG(KS, Channel.Id, StartTS.getTime()/1000, EndTS.getTime()/1000+(60*60*12));
        if(!ChannelEPG) throw new Error('Channel EPG not found');

        const CatchupEPG = ChannelEPG.find(x => StartTS.getTime() == x.StartDate.getTime());
        if(!CatchupEPG) throw new Error('Catchup EPG not found');

        if(CatchupEPG.EndDate.getTime() > Date.now() - 10){
            Logger.Info(Logger.Type.IPTV, `Catchup EPG for ${Channel.Name} is still live, playing live stream...`);
            return this.GetStreamLive(KS, Channel);
        }

        return this.GetStream(KS, CatchupEPG.Id, 'epg_internal', 'epg', 'CATCHUP');
    }

    public static async GetMultiDimensionStream(KS: string, MDId: string|number): Promise<ChannelMultiDimensionStream[]>{
        const MDEpg = await this.GetMultiDimensionStreamEPG(KS, MDId);
        if(!MDEpg) throw new Error('EPG of multi-dimension stream not found');

        const Streams: ChannelMultiDimensionStream[] = [];
        for(const EPG of MDEpg){
            if(!EPG.tags.MosaicChannelsInfo) continue;

            for(const Item of EPG.tags.MosaicChannelsInfo.objects){
                const MDId = Item.value.split('ProgramExternalID=')[1];
                const MDEPG = await this.GetMultiDimensionStreamEPGInfo(KS, MDId);
                if(!MDEPG || MDEPG.length <= 0) continue;

                Streams.push({
                    id: MDEPG[0].id,
                    
                    name: MDEPG[0].name,
                    description: MDEPG[0].description,
                    images: MDEPG[0].images,

                    startDate: MDEPG[0].startDate,
                    endDate: MDEPG[0].endDate
                });
            }
        }

        return Streams;
    }

    // O2TV-SK Device Household APIs
    public static GetHouseholdDevice = (KS: string) => this.KalturaPost(this.Routes[IPTVProviderType.O2TV_SK].HouseholdGetDevice, {
        language: 'slk',
        ks: KS
    });

    public static AddHouseholdDevice = (KS: string, DeviceId: string) => this.KalturaPost(this.Routes[IPTVProviderType.O2TV_SK].HouseholdAddDevice, {
        language: 'slk',
        ks: KS,
        device: {
            objectType: 'KalturaHouseholdDevice',
            udid: DeviceId,
            name: '',
            brandId: 22
        }
    });
}

interface KalturaAPIResponse {
    result: {
        error: {
            code: number;
            message: string;
            objectType: 'KalturaAPIException';
        };
    };
};

interface KalturaListBody {
    [key: string]: any;
    language: string;
    filter: {
        objectType: string;
        kSql: string;
        orderBy?: string;
        idEqual?: number;
    };
    pager: {
        objectType: string;
        pageSize: number;
        pageIndex: number;
    };
};

// Kaltura API Responses
interface KalturaChannel {
    id: number;
    externalId: string;

    name: string;
    description: string;

    images: KalturaImageAsset[];
    mediaFiles: KalturaLiveStream[];
    metas: KalturaChannelProgramMeta;

    startDate: number;
    createDate: number;
    endDate: number;
};

interface KalturaChannelProgramMeta {
    [key: string]: {
        objectType: 'KalturaStringValue'|'KalturaDoubleValue'|'KalturaBooleanValue'|'KalturaLongValue';
        value: string|number|boolean;
    }

    ChannelNumber: {
        objectType: 'KalturaDoubleValue';
        value: number;
    };
};

interface KalturaImageAsset {
    id: string;
    ratio: string;
    url: string;
    imageTypeId: number;
    imageTypeName: string;
};

interface KalturaLiveStream {
    id: number;
    assetId: number;
    externalId: string;
    startDate: number;
    type: 'HLS_FP' | 'HLS' | 'DASH_WV' | 'DASH';
    url: string;
};

interface KalturaChannelEPG extends Omit<KalturaChannel, 'mediaFiles'> {
    objectType: 'KalturaProgramAsset' | 'KalturaRecordingAsset';
    linearAssetId: number; // Channel ID

    tags: {
        [key: string]: {
            objectType: 'KalturaStringValue'|'KalturaDoubleValue'|'KalturaBooleanValue'|'KalturaLongValue';
            value: string|number|boolean;
            objects: [
                {
                    objectType: 'KalturaMultilingualStringValue';
                    value: string;
                }
            ]
        }
    } & {
        MosaicInfo?: {
            objectType: 'KalturaMultilingualStringValueArray';
            objects: [
                {
                    objectType: 'KalturaMultilingualStringValue';
                    value: string;
                }
            ]
        },
        MosaicChannelsInfo?: {
            objectType: 'KalturaMultilingualStringValueArray';
            objects: [
                {
                    objectType: 'KalturaMultilingualStringValue';
                    value: string;
                }
            ]
        }
    }
};

// Custom responses
export interface Channel {
    id: number;
    externalId: string;
        
    name: string;
    description: string;
    number: number;

    logo: string;
    images: KalturaImageAsset[];
    mediaFiles: KalturaLiveStream[];

    startDate: number;
    createDate: number;
    endDate: number;
}

export interface ChannelEPG extends Omit<Channel, 'mediaFiles'|'number'|'logo'> {
    channelId: number;

    MDId?: string;
    MDIds?: string[];
};

export interface ChannelMultiDimensionStream extends Omit<Channel, 'externalId'|'number'|'logo'|'mediaFiles'|'createDate'> {};