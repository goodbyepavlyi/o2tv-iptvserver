import Express from '../../Express';
import ExpressRoute from '../../Models/ExpressRoute';

import Config from '../../../Config';
import Logger from '../../../Logger';
import O2TVController from '../../../O2TV/O2TVController';
import O2TVApi, { Channel, ChannelEPG } from '../../../O2TV/O2TVApi';

export default class extends ExpressRoute {
    private get O2TVController(): O2TVController|undefined {
        return O2TVController.Instance;
    }

    constructor(Express: Express) {
        super(Express, { Path: '/Api/O2TV' });
    }

    private GenerateM3UPlaylistEntry(Channel: Channel, ChannelEPG: ChannelEPG){
        const CreateEntry = (ChannelNumber: number, ChannelName: string, ChannelLogo: string, ChannelId: number, MDId?: string|number) => [
            // Widewine test for o2tv.sk
            // `#KODIPROP:inputstream=inputstream.adaptive`,
            // `#KODIPROP:inputstream.adaptive.license_type=com.widevine.alpha`,
            // `#KODIPROP:inputstream.adaptive.license_key=xxx`,
            `#EXTINF:-1 catchup="append" catchup-days="7" catchup-source="&catchup_start_ts={utc}&catchup_end_ts={utcend}" tvg-id="${ChannelNumber}" tvh-epg="0" tvg-logo="${ChannelLogo}",${ChannelName}`,
            `${process.env.EXPRESS_URL}/Api/O2TV/Stream/${ChannelId}${MDId ? `/${MDId}` : ''}`
        ].join('\n');

        if(ChannelEPG.MDId) return CreateEntry(Channel.number, Channel.name, Channel.logo, ChannelEPG.channelId, Channel.id);
        return CreateEntry(Channel.number, Channel.name, Channel.logo, Channel.id);
    }

    public Routes: RouteHandler[]|undefined = [
        {
            name: '/Login',
            method: 'POST',
            run: async (req, res) => {
                try{
                    Config.SetSettings('O2TV', req.body);
                }catch(err: any){
                    Logger.Debug(Logger.Type.Config, err.message);
                    return res.BadRequest(err.message);
                }

                await O2TVController.Instance.Login()
                    .then(() => res.OK())
                    .catch(err => {
                        Logger.Error(Logger.Type.O2TV, 'Failed to login to O2TV:', err);
                        return res.BadRequest('Failed to login to O2TV, validate your credentials');
                    });
            }
        },
        {
            name: '/Playlist',
            method: 'GET',
            run: async (req, res) => {
                try{
                    if(!this.O2TVController) return res.InternalError('O2TVController not initialized');
                    if(!this.O2TVController.Session) return res.BadRequest('Not logged in to O2TV');
                    if(!this.O2TVController.Channels){
                        try{
                            await this.O2TVController.LoadChannels();
                        }catch(err){
                            Logger.Error(Logger.Type.O2TV, 'Failed to load channels:', err);
                            return res.InternalError('Failed to load channels');
                        }
                    }

                    const M3UPlaylist = ['#EXTM3U'];
                    const Channels = this.O2TVController.Channels!;
                    const LiveEPG = await O2TVApi.GetLiveEPG(this.O2TVController.Session?.KS);
                    for(const Channel of Channels){
                        const ChannelEPG = LiveEPG.find(x => x.channelId === Channel.id);
                        if(!ChannelEPG) continue;

                        if(ChannelEPG.MDId){
                            await O2TVApi.GetMultiDimensionStream(this.O2TVController.Session?.KS, ChannelEPG.MDId)
                                .then(Streams => Streams.forEach(x => M3UPlaylist.push(this.GenerateM3UPlaylistEntry(x, ChannelEPG))));
                            continue;
                        }

                        M3UPlaylist.push(this.GenerateM3UPlaylistEntry(Channel, ChannelEPG));
                    }

                    return res.set({
                        'content-type': 'application/x-mpegURL',
                        'content-disposition': 'attachment; filename="O2TV.m3u"'
                    }).send(M3UPlaylist.join('\n'));
                }catch(err: any){
                    return res.FAIL(err);
                }
            }
        },
        {
            name: '/Stream/:ChannelId/:MDId?',
            method: 'GET',
            run: async (req, res) => {
                try{
                    const { ChannelId, MDId } = req.params;
                    if(!this.O2TVController) return res.InternalError('O2TVController not initialized');
                    if(!this.O2TVController.Session) return res.BadRequest('Not logged in to O2TV');

                    const Stream = await this.O2TVController.GetStream(ChannelId, MDId);
                    return res.set({
                        'content-type': 'application/dash+xml',
                        'content-disposition': `attachment; filename="Stream-${ChannelId}${MDId ? `-${MDId}` : ''}.xml"`
                    }).send(Stream);
                }catch(err: any){
                    return res.FAIL(err);
                }
            }
        }
    ];
}