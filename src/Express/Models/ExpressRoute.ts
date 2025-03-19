import express from 'express';
import Express from '../Express';
import Logger from '../../Logger';

export default class ExpressRoute{
    private Express: Express;

    public Path: string;
    public Routes: RouteHandler[]|undefined;

    constructor(Express: Express, Options: ExpressRouteOptions){
        this.Express = Express;
        this.Path = Options.Path;
    }

    public async run(req: RouteRequest, res: RouteResponse, next: express.NextFunction){
        const OriginalUrl = req.originalUrl.split('?')[0] || '/';
        Logger.Debug(Logger.Type.Express, `Processing request: &c${req.method} ${OriginalUrl}&r`);

        const Route = this.Routes?.find(x => {
            const CleanRouteName = x.name.replace(/\/+/g, '/');

            const RoutePattern = new RegExp(
                `^${this.Path}${CleanRouteName
                    .replace(/\/\//g, '/')
                    .replace(/\/:(\w+)\??/g, (match, param) =>
                        match.endsWith('?') ? '(?:/([^/]+))?' : '/([^/]+)'
                    )}/*$`
            );
            return RoutePattern.test(OriginalUrl) && req.method === x.method;
        });

        if(!Route) return next();
        Logger.Debug(Logger.Type.Express, `Routing &c${Route.method} ${this.Path}${Route.name}&r...`);

        const PathRegex = new RegExp(
            `^${this.Path}${Route.name.replace(/\/:\w+\??/g, (match) =>
                match.endsWith('?') ? '(?:/([^/]+))?' : '/([^/]+)'
            )}$`
        );
        const ParamNames = (Route.name.match(/:\w+\??/g) || []).map(name => name.replace(/[:?]/g, ''));
        const ParamValues = OriginalUrl.match(PathRegex)?.slice(1) || [];
        req.params = ParamNames.reduce<Record<string, string >>((Params, Name, Index) => {
            Params[Name] = ParamValues[Index] ?? undefined;
            return Params;
        }, {});

        if(Route.required && Route.required.some(Required => !req.query[Required])){
            return res.FAIL(`Missing required parameter: ${Route.required.find(Required => !req.query[Required])}`);
        }

        Promise.all((Route.middleware ?? []).map(async middleware => {
            const result = await middleware(req, res) ?? { req: null, res: null }
            if(!result.req || !result.res) throw new Error('Middleware rejected');

            req = result.req;
            res = result.res;
        }) as any).then(() => {
            if(res.headersSent) return;

            try{
                Route.run(req, res, next);
            }catch(err){
                return res.InternalError(`500 Internal Server Error`);
            }
        }).catch(() => (null));
    }
}

interface ExpressRouteOptions {
    Path: string;
}