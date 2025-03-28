import path from 'node:path';
import http from 'node:http';
import express from 'express';

import Logger from '../Logger';
import Utils from '../Utils';
import ExpressRoute from './Models/ExpressRoute';

export default class Express{
    public static Instance: Express;

    public App: express.Express;
    public HttpServer: http.Server|null = null;

    private Routes: Record<string, ExpressRoute> = {};

    constructor(){
        Express.Instance = this;

        if (!process.env.EXPRESS_URL?.match(/^(http|https):\/\//)){
            throw new Error('Environment EXPRESS_URL must be a valid URL');
        }

        process.env.EXPRESS_PORT = process.env.EXPRESS_PORT ?? 3000;

        this.App = express();
        this.App.disable('x-powered-by');
        this.App.use(express.json());
    }

    private RegisterRoute(RouteName: string){
        this.App.use('/*', (req, res, next) => this.Routes[RouteName].run(req as RouteRequest, res as RouteResponse, next));
    }

    private InitExpressRoute(_req: express.Request, _res: express.Response, next: express.NextFunction, err: any){
        const req = _req as RouteRequest;
        const res = _res as RouteResponse;

        const SourceIP = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress;
        const HeaderIP = req.headers['x-real-ip'];

        req.IP = SourceIP as string;
        if(HeaderIP && SourceIP == '::ffff:127.0.0.1'){
            req.IP = HeaderIP as string;
        }

        res.SendJson = (Json: ExpressAPIResponse, Code: number = 200) => {
            if(res.headersSent) return;
            res.status(Code).json({
                Status: Json.Status ?? 'OK',
                Message: Json.Message ?? 'OK',
                Data: Json.Data ?? null
            });
        }

        res.SendError = (Code, err, Data = null) => res.status(Code).json({ Status: 'FAIL', Message: err, Data });

        // 5xx
        res.InternalError = (err = null) => res.SendError(500, err ?? 'Internal Server Error');

        // 4xx
        res.Unauthorized = (err = null) => res.SendError(401, (err ?? '401 Unauthorized'));
        res.BadRequest = (err = null) => res.SendError(400, (err ?? '400 Bad Request'));
        res.NotFound = (err = null) => res.SendError(404, (err ?? '404 Not Found'));

        // 2xx
        res.OK = (Message = 'OK', Data = null) => res.SendJson({ Status: 'OK', Message, Data });
        res.FAIL = (Message = 'FAIL', Data = null) => res.SendJson({ Status: 'FAIL', Message, Data });
        res.DATA = (Data) => res.SendJson({ Status: 'OK', Message: 'OK', Data });

        if(!process.DevMode){
            Logger.Info(Logger.Type.Express, `&c${req.headers['x-forwarded-for'] || req.IP}&r - "${req.method} ${req.url}" ${req.headers['user-agent']}`);
        }
        
        next();
    }

    private Init(){
        this.App.use((_req, _res, next) => this.InitExpressRoute(_req, _res, next, null));
        this.App.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => this.InitExpressRoute(req, res, next, err));

        this.App.use('/', express.static(path.join(__dirname, 'Public')));

        this.RegisterRoute('ControlRoute');
        this.RegisterRoute('IPTVRoute');

        this.App.get('/', (_, res: any) => res.json({ Status: 'OK', Message: `${process.Description} ${process.Version}`, Data: null }));

        this.App.use((req, res, next) => (res as RouteResponse).NotFound());
        this.App.use((err: any, _req: express.Request, _res: express.Response, next: express.NextFunction) => {
            const req = _req as RouteRequest;
            const res = _res as RouteResponse;
            if(err instanceof SyntaxError || err?.status == 400 && 'body' in err){
                res.FAIL('400 Bad Request');
                return
            }

            Logger.Error(Logger.Type.Express, 'An error occurred while handling the request:', err);
            res.InternalError(err.message || 'Internal Server Error');
        });
        
    }

    private async InitRoutes(){
        await this.LoadRoutes();
        this.Init();
    }

    public async Start(): Promise<void>{
        await this.InitRoutes();
        
        return new Promise((Resolve, Reject) => {
            this.HttpServer = http.createServer(this.App);
            this.HttpServer.listen(process.env.EXPRESS_PORT, () => {
                Logger.Info(Logger.Type.Express, `Listening on port &c${process.env.EXPRESS_PORT}&r`);
                Resolve();
            });
        });
    }

    private async LoadRoutes() {
        Logger.Debug(Logger.Type.Express, 'Loading routes...');

        for (const FilePath of Utils.ReadDirRecursive(path.join(__dirname, 'Routes'))) {
            const Route: ExpressRoute = new (require(FilePath)).default(this);
            const FileName = path.parse(FilePath).name;
            this.Routes[FileName] = Route;
            Logger.Debug(Logger.Type.Express, `Loaded route &c${FileName}&r`);
        }

        Logger.Info(Logger.Type.Express, `Loaded routes (&c${Object.keys(this.Routes).length}&r): &c${Object.keys(this.Routes).join(', ')}&r`);
    }
}