import ExpressRoute from '../Models/ExpressRoute';
import Express from '../Express';

import IPTVController from '../../IPTV/IPTVController';
import IPTVChannel from '../../IPTV/Models/IPTVChannel';
import IPTVMDChannel from '../../IPTV/Models/IPTVMDChannel';

import Logger from '../../Logger';

export default class extends ExpressRoute{
    private IPTVController: IPTVController;

    constructor(Express: Express){
        super(Express, { Path: '/' });
        this.IPTVController = IPTVController.Instance;
    }

    private GenerateM3UPlaylistEntry = (Channel: IPTVChannel|IPTVMDChannel) => [
        `#EXTINF:-1 provider="${this.IPTVController?.Provider?.ProviderType || 'unknown'}" catchup="append" catchup-days="7" catchup-source="?start_ts={utc}&end_ts={utcend}" url-tvg="${process.env.EXPRESS_URL}/epg" tvg-chno="${Channel.Number}" tvg-logo="${Channel.Logo}",${Channel.Name}`,
        `${process.env.EXPRESS_URL}/play/${Channel.Id}.m3u8`
    ].join('\n');

    public Routes: RouteHandler[]|undefined = [{
        name: 'epg',
        method: 'GET',
        run: async (req, res) => res.set({
            'content-type': 'text/plain; charset=UTF-8'
        }).send(await this.IPTVController.GetEPG())
    },{
        name: 'playlist',
        method: 'GET',
        run: async (req, res) => {
            if(!this.IPTVController.Provider) return res.BadRequest('IPTV session not initialized');

            const Playlist = ['#EXTM3U'];
            return this.IPTVController.GetChannels()
                .then(x => {
                    for(const Channel of x){
                        Playlist.push(this.GenerateM3UPlaylistEntry(Channel));
                    }
        
                    return res.set({
                        'content-type': 'text/plain; charset=UTF-8'
                    }).send(Playlist.join('\n'));
                });
        }
    },{
        name: 'play/:ChannelId',
        method: 'GET',
        run: async (req, res) => {
            if(!this.IPTVController.Provider) return res.BadRequest('IPTV session not initialized');

            let { ChannelId } = req.params;
            ChannelId = ChannelId.replace('.m3u8', '');

            const { start_ts, end_ts } = req.query;
            Logger.Debug(Logger.Type.IPTV, `Play request for ChannelId: ${ChannelId}, start_ts: ${start_ts}, end_ts: ${end_ts}`);

            if(typeof start_ts == 'string' && Number.isNaN(Number(start_ts)) || typeof end_ts == 'string' && Number.isNaN(Number(end_ts))){
                return res.BadRequest('Invalid start_ts or end_ts');
            }

            const StreamUrl = start_ts && end_ts 
                ? await this.IPTVController.GetStreamCatchup(new Date((start_ts as any)*1000), new Date((end_ts as any)*1000), ChannelId) 
                : await this.IPTVController.GetStream(ChannelId);

            if(!StreamUrl){
                Logger.Error(Logger.Type.IPTV, `Stream not found for ChannelId: ${ChannelId}`);
                return res.NotFound('Stream not found');
            }

            Logger.Debug(Logger.Type.IPTV, `Play response for ChannelId: ${ChannelId}, start_ts: ${start_ts}, end_ts: ${end_ts}`, StreamUrl);
            return res.redirect(StreamUrl);
        }
    }];
}