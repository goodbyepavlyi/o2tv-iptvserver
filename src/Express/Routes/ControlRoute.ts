import path from 'node:path';

import ExpressRoute from '../Models/ExpressRoute';
import Express from '../Express';

import IPTVController from '../../IPTV/IPTVController';

export default class extends ExpressRoute{
    private IPTVController: IPTVController;

    constructor(Express: Express){
        super(Express, { Path: '/' });
        this.IPTVController = IPTVController.Instance;
    }

    public Routes: RouteHandler[]|undefined = [{
        name: '',
        method: 'GET',
        run: (req, res) => res.sendFile(path.resolve(__dirname, '../Views/index.html'))
    },{
        name: '',
        method: 'POST',
        run: async (req, res) => {
            if(req.query.reset_channels){
                await this.IPTVController.LoadChannels();
            }
            if(req.query.reset_session){
                await this.IPTVController.Login(true);
            }

            return res.redirect('/');
        }
    }];
}