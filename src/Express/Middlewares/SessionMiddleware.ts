import O2TVController from '../../O2TV/O2TVController';
import ExpressMiddleware from '../Models/ExpressMiddleware';

export default class extends ExpressMiddleware{
    public static AccessValidation = async (req: RouteRequest, res: RouteResponse): MiddlewareResponse => {
        if(req.originalUrl == '/setup' && O2TVController.Instance.Session?.IsValid) return res.redirect('/');
        if(!O2TVController.Instance.Session?.IsValid && req.originalUrl != '/setup') return res.redirect('/setup');
        return { req, res };
    }
}

