import { AxiosError } from 'axios';
import HTTP from '../Utils/HTTP';
import Config from '../Config';

export enum O2TVRegion {
    CZ = 'CZ',
}

export default class O2TVApi{
    // public static APIRegion: O2TVRegion;
    public static get APIRegion(){
        return Config.O2TVSettings()?.Region;
    }

    public static Settings = {
        [O2TVRegion.CZ]: {
            ClientTag: '1.22.0-PC',
            ApiVersion: '5.4.0',
            PartnerId: 3201
        }
    }

    public static Routes = {
        [O2TVRegion.CZ]: {
            AnonymousLogin: `https://${this.Settings[O2TVRegion.CZ].PartnerId}.frp1.ott.kaltura.com/api_v3/service/ottuser/action/anonymousLogin?format=1&clientTag=${this.Settings[O2TVRegion.CZ].ClientTag}`,
            Login: `https://login-a-moje.o2.cz/cas-external/v1/login`,
            KalturaLogin: `https://${this.Settings[O2TVRegion.CZ].PartnerId}.frp1.ott.kaltura.com/api_v3/service/ottuser/action/login?format=1&clientTag=${this.Settings[O2TVRegion.CZ].ClientTag}`,

            AccountServices: `https://${this.Settings[O2TVRegion.CZ].PartnerId}.frp1.ott.kaltura.com/api/p/${this.Settings[O2TVRegion.CZ].PartnerId}/service/CZ/action/Invoke`,
            List: `https://${this.Settings[O2TVRegion.CZ].PartnerId}.frp1.ott.kaltura.com/api_v3/service/asset/action/list?format=1&clientTag=${this.Settings[O2TVRegion.CZ].ClientTag}`,
            Multirequest: `https://${this.Settings[O2TVRegion.CZ].PartnerId}.frp1.ott.kaltura.com/api_v3/service/multirequest`
        }
    };

    public static Headers = {
        'accept-encoding': 'gzip',
        'accept': '*/*',
        'content-type': 'application/json;charset=UTF-8',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:98.0) Gecko/20100101 Firefox/98.0'
    };

    public static get GeneralBody(){
        return {
            clientTag: this.Settings[O2TVApi.APIRegion]?.ClientTag,
            apiVersion: this.Settings[O2TVApi.APIRegion]?.ApiVersion,
            partnerId: this.Settings[O2TVApi.APIRegion]?.PartnerId
        };
    }

    // API Callers
    public static Post = (Route: string, Body: any) => HTTP.Post(Route, Body, this.Headers)
        .catch(x => {
            if(!(x instanceof AxiosError)) throw x;

            throw {
                status: x.response?.status,
                data: x.response?.data,
            };
        });

    public static KalturaPost = (Route: string, Body: any) => this.Post(Route, {...this.GeneralBody, ...Body})
        .then(x => {
            const data = x as KalturaAPIResponse;
            if (data.result?.error) throw data.result?.error;
            return data.result;
        });

    public static PostList = async (Body: KalturaListBody) => {
        const Result: any = [];
        let Fetch = true;

        while(Fetch){
            await this.KalturaPost(this.Routes[O2TVApi.APIRegion].List, Body)
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

    // API Authentification
    public static AnonymousLogin = () => this.KalturaPost(this.Routes[O2TVApi.APIRegion].AnonymousLogin, {
        language: '*'
    }).then((x: any) => ({
        expiry: x.expiry,
        ks: x.ks,
        refreshToken: x.refreshToken
    }));

    public static Login = (Username: string, Password: string, DeviceId: string) => this.Post(this.Routes[O2TVApi.APIRegion].Login, {
        service: 'https://www.new-o2tv.cz/',
        username: Username,
        password: Password,
        udid: DeviceId
    }).then((x: any) => ({
        jwt: x.jwt,
        refresh_token: x.refresh_token
    }));

    public static GetAccountServices = (JWTToken: string, KS: string): Promise<Record<string, string>[]> => this.KalturaPost(this.Routes[O2TVApi.APIRegion].AccountServices, {
        ks: KS,
        intent: 'Service List',
        adapterData: [
            { key: 'access_token', value: JWTToken },
            { key: 'pageIndex', value: '0' },
            { key: 'pageSize', value: '100' }
        ],
    }).then((x: any) => JSON.parse(x.adapterData.service_list.value).ServicesList);

    public static KalturaLogin = (KS: string, JWTToken: string, DeviceId: string, ServiceId: string) => this.KalturaPost(this.Routes[O2TVApi.APIRegion].KalturaLogin, {
        language: 'ces',
        username: 'NONE',
        password: 'NONE',
        ks: KS,
        udid: DeviceId,
        extraParams: {
            token: { objectType: 'KalturaStringValue', value: JWTToken },
            loginType: { objectType: 'KalturaStringValue', value: 'accessToken' },
            brandId: { objectType: 'KalturaStringValue', value: '22' },
            externalId: { objectType: 'KalturaStringValue', value: ServiceId }
        }
    }).then((x: any) => ({
        expiry: x.loginSession.expiry,
        refreshToken: x.loginSession.refreshToken,
        ks: x.loginSession.ks
    }));
    
    // Channel APIs
    public static GetChannels = (KS: string) => this.PostList({
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
    }).then(data => data.map((x: KalturaChannel) => ({
        id: x.id,
        externalId: x.externalId,
        
        name: x.name,
        description: x.description,
        number: x.metas?.ChannelNumber?.value,

        logo: x.images.find((x: any) => x.imageTypeId == 18)?.url || `${x.images[0].url}/height/320/width/480`,
        images: x.images,
        mediaFiles: x.mediaFiles,

        startDate: x.startDate,
        createDate: x.createDate,
        endDate: x.endDate
    })) as Channel[]);

    // EPG APIs
    public static GetEPG = (Data: KalturaListBody) => new Promise<ChannelEPG[]>(async (Resolve, Reject) => {
        const EPGData: ChannelEPG[] = [];
        
        const LiveEPG = await this.PostList(Data)
            .then(x => x as KalturaChannelEPG[])
            .catch(Reject);

        if(!LiveEPG) return Resolve(EPGData);
        for(const x of LiveEPG){
            if((x.objectType !='KalturaProgramAsset' && x.objectType != 'KalturaRecordingAsset') || !x.linearAssetId) continue;

            const Item: ChannelEPG = {
                id: x.id,
                externalId: x.externalId,
                channelId: x.linearAssetId,
                name: x.name,
                description: x.description,
                images: x.images,
                startDate: x.startDate,
                createDate: x.createDate,
                endDate: x.endDate
            };

            // Multi-dimension plabyack
            if(x.tags.MosaicInfo){
                const MDId = x.tags.MosaicInfo.objects.find((x: any) => x.value.includes('MosaicProgramExternalId'))?.value.split('MosaicProgramExternalId=')[1];
                if(MDId) Item['MDId'] = MDId;
            }
            
            if(x.tags.MosaicChannelsInfo){
                for(const MDItem of x.tags.MosaicChannelsInfo.objects){
                    const MDId = MDItem.value.split('ProgramExternalID=')[1];
                    if(MDId) (Item['MDIds'] ??= []).push(MDId);
                }
            }

            EPGData.push(Item as any);
        }

        Resolve(EPGData);
    });

    public static GetLiveEPG = (KS: string) => this.GetEPG({
        language: 'ces',
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

    public static GetMultiDimensionStreamEPG = (KS: string, ExternalId: string|number): Promise<any> => this.KalturaPost(this.Routes[O2TVApi.APIRegion].List, {
        language: 'ces',
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

    public static GetMultiDimensionStreamEPGInfo = (KS: string, ExternalId: string): Promise<any> => this.KalturaPost(this.Routes[O2TVApi.APIRegion].List, {
        ks: KS,
        language: 'ces',
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
    public static GetStreamDashUrl = (KS: string, ChannelId: string|number, MDId?: string|number) => new Promise<{ url: string; license: string; }>(async (Resolve, Reject) => {
        const StreamRequestData = {
            apiVersion: '7.8.1',

            '1': {
                service: 'asset',
                action: 'get',
                assetReferenceType: 'media',
                id: ChannelId,
                ks: KS
            },
            '2': {
                service: 'asset',
                action: 'getPlaybackContext',
                assetType: 'media',
                assetId: ChannelId,
                contextDataParams: {
                    objectType: 'KalturaPlaybackContextOptions',
                    context: 'PLAYBACK',
                    streamerType: 'mpegdash',
                    urlType: 'DIRECT',
                    adapterData: {
                        codec: { value: 'AVC' },
                        quality: { value: 'UHD' }
                    }
                },
                ks: KS
            }
        };

        if(MDId){
            StreamRequestData['1'].assetReferenceType = 'epg_internal';
            StreamRequestData['1'].id = Number(MDId);

            StreamRequestData['2'].assetId = Number(MDId);
            StreamRequestData['2'].assetType = 'epg';
            StreamRequestData['2'].contextDataParams['context'] = 'START_OVER';
        }

        return this.KalturaPost(this.Routes[O2TVApi.APIRegion].Multirequest, StreamRequestData).then((x: any) => {
            const URLs: Record<string, { url: string; license: string; }> = {};
            for(const Stream of x[1].sources){
                URLs[Stream.type] = {
                    url: Stream.url,
                    license: Stream.drm.find((x: any) => x.scheme == 'WIDEVINE_CENC')?.licenseURL
                };
            }

            if(!URLs['DASH']) return Reject('No DASH stream found');
            return Resolve(URLs['DASH']);
        }).catch(Reject);
    });

    public static GetMultiDimensionStream = (KS: string, MDId: string|number) => new Promise<ChannelMultiDimensionStream[]>(async (Resolve, Reject) => {
        const EPG = await this.GetMultiDimensionStreamEPG(KS, MDId).catch(Reject);
        if(!EPG) return Reject('No EPG found');

        const Streams: ChannelMultiDimensionStream[] = [];
        for(const x of EPG){
            if(!x.tags.MosaicChannelsInfo) continue;

            for(const Item of x.tags.MosaicChannelsInfo.objects){
                const MDId = Item.value.split('ProgramExternalID=')[1];
                const MDEPG = await this.GetMultiDimensionStreamEPGInfo(KS, MDId).catch(Reject);
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

        Resolve(Streams);
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