import Config from '../Config';
import Logger from '../Logger';
import HTTP from '../Utils/HTTP';
import O2TVCZSession from './Models/O2TVCZSession';
import O2TVSession from './Models/O2TVSession';
import O2TVSKSession from './Models/O2TVSKSession';
import O2TVApi, { Channel, O2TVRegion } from './O2TVApi';

export default class O2TVController{
    public static Instance: O2TVController;

    public Session?: O2TVCZSession|O2TVSKSession;
    public Channels?: Channel[];

    constructor(){
        O2TVController.Instance = this;
    }

    public async Start(){
        await this.Login()
            .then(async x => {
                Logger.Info(Logger.Type.O2TV, 'Logged in to O2TV');
                await this.LoadChannels();
            })
            .catch(x => Logger.Error(Logger.Type.O2TV, `Failed to login to O2TV:`, x));
    }

    public async Stop(){
        if(this.Session) this.Session.Save();
    }

    public Login = (): Promise<void> => new Promise(async (Resolve, Reject) => {
        const Settings = Config.O2TVSettings();
        if(!(Settings && Settings.Region && Settings.Username && Settings.Password)) return Reject('No O2TV settings found');

        await O2TVSession.LoadSession()
            .then(x => {
                this.Session = x;
                Resolve();
            })
            .catch(Reject);
    });

    public async LoadChannels(){
        if(!this.Session) throw new Error('No session found');

        await O2TVApi.GetChannels(this.Session.KS)
            .then(x => this.Channels = x)
            .catch(x => Logger.Error(Logger.Type.O2TV, 'Failed to load channels:', x));
    }

    public GetStream = (ChannelId: string|number, MDId?: string|number) => new Promise(async (Resolve, Reject) => {
        if(!this.Session) return Reject('No session found');
        if(MDId){
            const LiveEPG = await O2TVApi.GetLiveEPG(this.Session?.KS);
            const ChannelEPG = LiveEPG.find(x => x.id == ChannelId || x.id == MDId);
            if(!ChannelEPG || !ChannelEPG?.MDId) return Reject(`EPG not found for channel ${ChannelId}, MDId: ${MDId}`);
        }

        try{
            const StreamManifestUrl = await O2TVApi.GetStreamDashUrl(this.Session.KS, ChannelId, MDId);
            if(!StreamManifestUrl) return Reject('Stream not found');

            let StreamDashUrl = await HTTP.GetAndReturnRedirect(StreamManifestUrl.url);
            if(O2TVApi.APIRegion == O2TVRegion.SK){
                StreamDashUrl = StreamDashUrl.replace(/output[0-9]+\//, 'output0/');
            }

            const StreamXML = await HTTP.Get(StreamDashUrl) as string;
            return Resolve(StreamXML.replace(/<BaseURL>.*<\/BaseURL>/, `<BaseURL>${StreamDashUrl.split('/manifest.mpd')[0]}/</BaseURL>`));
        }catch(err: any){
            Logger.Error(Logger.Type.O2TV, 'Failed to get stream:', err);
            return Reject(err);
        }
    });
}