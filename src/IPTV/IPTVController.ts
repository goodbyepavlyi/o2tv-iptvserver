import Config from '../Config';
import Logger from '../Logger';
import Utils from '../Utils';

import { IPTVProviderType } from './IPTVProviderType';
import IPTVChannel from './Models/IPTVChannel';
import IPTVEpg from './Models/IPTVEpg';
import IPTVMDChannel from './Models/IPTVMDChannel';
import IPTVProvider from './Providers/IPTVProvider';

async function GetProviderConstructor(){
    switch(process.env.PROVIDER_TYPE){
        case IPTVProviderType.O2TV_CZ: return (await import('./Providers/O2TVCZProvider')).default;
        case IPTVProviderType.O2TV_SK: return (await import('./Providers/O2TVSKProvider')).default;
        case IPTVProviderType.ONEPLAY: return (await import('./Providers/OneplayProvider')).default;
        default: return null;
    }
}

export default class IPTVController{
    public static Instance: IPTVController;
    public Provider?: IPTVProvider;

    private EPGCache?: IPTVEpg[];
    private EPGExpiration?: Date;

    constructor(){
        IPTVController.Instance = this;
    }

    public get Channels(): IPTVChannel[]|undefined{
        return this.Provider?.Channels;
    }

    public async Start(){
        await this.Login()
            .then(async x => {
                await this.LoadChannels();
                await this.GetEPG();
            }).catch(err => Logger.Error(Logger.Type.IPTV, `Failed to login to IPTV provider:`, err));
    }

    public async Stop(){
        if(this.Provider) this.Provider.SaveData();
    }

    public async Login(Reset?: boolean){
        if(!process.env.PROVIDER_TYPE) throw new Error('No provider type found');
        if(!process.env.PROVIDER_USERNAME) throw new Error('Environment variable PROVIDER_USERNAME not found');
        if(!process.env.PROVIDER_PASSWORD) throw new Error('Environment variable PROVIDER_PASSWORD not found');
        
        const ProviderConstructor = await GetProviderConstructor();
        if(!ProviderConstructor) throw new Error('Invalid provider type');
    
        if(Config.IPTVSession && !Reset){
            Logger.Info(Logger.Type.IPTV, 'Loading session from config');
            try{
                this.Provider = await ProviderConstructor.FromSession(Config.IPTVSession);
                this.Provider.SaveData();
                return;
            }catch(err: any){
                Logger.Error(Logger.Type.IPTV, 'Failed to load session from config, creating new session:', err);
            }
        }

        Logger.Trace(Logger.Type.IPTV, `Creating session => Provider: ${ProviderConstructor.ProviderType}, Username: ${process.env.PROVIDER_USERNAME}, Password: ${process.env.PROVIDER_PASSWORD}`);
        this.Provider = await ProviderConstructor.CreateSession();
        this.Provider.SaveData();
    }

    public async LoadChannels(){
        if(!this.Provider) throw new Error('No session found');

        try{
            await this.Provider.LoadChannels();
            Logger.Debug(Logger.Type.IPTV, `Loaded &c${this.Channels?.length}&r channels`);
        }catch(err: any){
            Logger.Error(Logger.Type.IPTV, 'Failed to load channels:', err);
            throw err;
        }
    }

    public async GetChannels(): Promise<(IPTVChannel|IPTVMDChannel)[]>{
        if(!this.Provider) throw new Error('No session found');
        if(!this.Channels) await this.LoadChannels();
        if(!this.Channels) throw new Error('Failed to load channels');

        const MDChannels = await this.Provider.GetMultiDimensionChannels();
        return [...this.Channels, ...MDChannels];
    }

    public GetChannel = (ChannelId: string|number): Promise<IPTVChannel|IPTVMDChannel|undefined> => 
        this.GetChannels().then(x => x.find(channel => channel.Id == ChannelId));

    // Stream
    public async GetStream(ChannelId: string|number){
        if(!this.Provider) throw new Error('No session found');
        const Channel = await this.GetChannel(ChannelId);
        if(!Channel) throw new Error('Channel not found');
        return await this.Provider.GetStream(Channel);
    }

    public async GetStreamCatchup(StartTS: Date, EndTS: Date, ChannelId: string|number){
        if(!this.Provider) throw new Error('No session found');
        if(!(StartTS instanceof Date) || !(EndTS instanceof Date)) throw new Error('Invalid date format');

        const Channel = await this.GetChannel(ChannelId);
        if(!Channel) throw new Error('Channel not found');
        return await this.Provider.GetStreamCatchup(StartTS, EndTS, Channel);
    }

    // EPG
    public async GetEPG(){
        if(!this.Provider) throw new Error('No session found');
        if(!this.Channels) await this.LoadChannels();
        if(this.EPGCache && this.EPGExpiration && this.EPGExpiration > new Date()) return this.BuildEPGXML(this.Channels!, this.EPGCache);

        Logger.Info(Logger.Type.IPTV, 'Fetching EPG data...');
        return await this.Provider.GetEPG()
            .then(x => {
                Logger.Info(Logger.Type.IPTV, 'Fetched EPG data');
                this.EPGCache = x.EPG;
                this.EPGExpiration = new Date(Date.now() + 1000*60*60*24);
                this.BuildEPGXML(x.Channels, x.EPG);
            });
    }

    private BuildEPGXML(ChannelList: IPTVChannel[], EPGList: IPTVEpg[]){
        const EPGXML: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<tv generator-info-name="EPG grabber">'];

        for(const Channel of ChannelList){
            EPGXML.push(`<channel id="${Utils.ReplaceHTMLChars(Channel.Name)}">`);
            EPGXML.push(`<display-name>${Utils.ReplaceHTMLChars(Channel.Name)}</display-name>`);
            EPGXML.push(`<icon src="${Channel.Logo}"/>`);
            EPGXML.push('</channel>');
        }

        for(const EPGItem of EPGList){
            const StartTime = EPGItem.StartDate.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
            const EndTime = EPGItem.EndDate.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);

            const Channel = this.Channels?.find(x => x.Id === EPGItem.ChannelId);
            if(!Channel) continue;

            EPGXML.push(`<programme start="${StartTime}" stop="${EndTime}" channel="${Utils.ReplaceHTMLChars(Channel.Name)}">`);
            EPGXML.push(`<title>${Utils.ReplaceHTMLChars(EPGItem.Name)}</title>`);
            if(EPGItem.Description){
                EPGXML.push(`<desc>${Utils.ReplaceHTMLChars(EPGItem.Description)}</desc>`);
            }
            if(EPGItem.Show.EpisodeName){
                EPGXML.push(`<sub-title>${Utils.ReplaceHTMLChars(EPGItem.Show.EpisodeName)}</sub-title>`);
            }
            if(EPGItem.Show.SeasonNumber > 0 && EPGItem.Show.EpisodeNumber > 0){
                if(EPGItem.Show.EpisodesInSeason > 0){
                    EPGXML.push(`<episode-num system="xmltv_ns">${EPGItem.Show.SeasonNumber-1}.${EPGItem.Show.EpisodeNumber-1}/${EPGItem.Show.EpisodesInSeason}.0/0</episode-num>`);
                }else{
                    EPGXML.push(`<episode-num system="xmltv_ns">${EPGItem.Show.SeasonNumber-1}.${EPGItem.Show.EpisodeNumber-1}.0/0</episode-num>`);
                }
            }
            
            EPGXML.push(`<icon src="${EPGItem.Poster}"/>`);
            EPGXML.push(`<image>${EPGItem.Poster}</image>`);
            
            EPGXML.push('<credits>');
            for(const Person of EPGItem.Cast){
                EPGXML.push(`<actor role="${Utils.ReplaceHTMLChars(Person.Role)}">${Utils.ReplaceHTMLChars(Person.Name)}</actor>`);
            }
            for(const Person of EPGItem.Directors){
                EPGXML.push(`<director>${Utils.ReplaceHTMLChars(Person)}</director>`);
            }
            EPGXML.push('</credits>');

            for(const Genre of EPGItem.Genre){
                EPGXML.push(`<category>${Utils.ReplaceHTMLChars(Genre)}</category>`);
            }

            if(EPGItem.Meta.Year){
                EPGXML.push(`<date>${EPGItem.Meta.Year}</date>`);
            }
            if(EPGItem.Country){
                EPGXML.push(`<country>${Utils.ReplaceHTMLChars(EPGItem.Country)}</country>`);
            }

            EPGXML.push('</programme>');
        }
        
        EPGXML.push('</tv>');
        return EPGXML.join('\n');
    }
}