import path from 'node:path';
import http from 'node:http';
import express from 'express';
import expressLayouts from 'express-ejs-layouts';

import Logger from '../Logger';
import Utils from '../Utils';
import ExpressMiddleware from './Models/ExpressMiddleware';
import ExpressRoute from './Models/ExpressRoute';

export default class Express {
    public static Instance: Express;

    public App: express.Express;
    public HttpServer: import('http').Server|null = null;

    private Middlewares: Record<string, ExpressMiddleware> = {};
    private Routes: Record<string, ExpressRoute> = {};

    constructor() {
        Express.Instance = this;

        if (!process.env.EXPRESS_URL?.match(/^(http|https):\/\//)) 
            throw new Error('Environment EXPRESS_URL must be a valid URL');
        process.env.EXPRESS_PORT = process.env.EXPRESS_PORT ?? 3000;

        this.App = express();
        this.App.disable('x-powered-by');

        this.App.use(express.json());
        this.App.use(expressLayouts);

        this.App.set('layout extractScripts', true);
        this.App.set('view engine', 'ejs');
        this.App.set('views', path.join(__dirname, 'Views'));
    }

    private RegisterRoute(RouteName: string) {
        const Route = this.Routes[RouteName];
        this.App.use('/*', (req, res, next) => Route.run(req, res as RouteResponse, next));
    }

    private Init() {
        this.App.use((req, _res, next) => {
            const res = _res as RouteResponse;

            res.SendJson = (Json: ExpressAPIResponse, Code: number = 200) => {
                if (res.headersSent) return;
                res.status(Code).json({
                    Status: Json.Status ?? 'OK',
                    Passed: Json.Passed ?? true,
                    Message: Json.Message ?? 'OK',
                    Data: Json.Data ?? null
                });
            }

            res.SendError = (Code, Error, Data = null) => res.status(Code).json({ Status: 'FAIL', Passed: false, Message: Error, Data });

            // 5xx
            res.InternalError = (Error = null) => res.SendError(500, Error ?? 'Internal Server Error');

            // 4xx
            res.Unauthorized = (error = null) => res.SendError(401, (error ?? '401 Unauthorized'));
            res.BadRequest = (error = null) => res.SendError(400, (error ?? '400 Bad Request'));
            res.NotFound = (error = null) => res.SendError(404, (error ?? '404 Not Found'));

            // 2xx
            res.OK = (Message = 'OK', Data = null) => res.SendJson({ Status: 'OK', Message, Data });
            res.FAIL = (Message = 'FAIL', Data = null) => res.SendJson({ Status: 'FAIL', Message, Data });
            res.DATA = (Data) => res.SendJson({ Status: 'OK', Message: 'OK', Data });

            if(!process.DevMode) Logger.Info(Logger.Type.Express, `&c${req.headers['x-forwarded-for'] || req.ip}&r - "${req.method} ${req.url}" ${req.headers['user-agent']}`);

            next();
        });

        this.App.use('/', express.static(path.join(__dirname, 'Public')));

        this.RegisterRoute('RootRoute');
        this.RegisterRoute('O2TVRoute');

        this.App.use((req, res, next) => (res as RouteResponse).NotFound());
        this.App.use((Error: any, req: express.Request, _res: express.Response, next: express.NextFunction) => {
            const res = _res as RouteResponse;
            if (Error instanceof SyntaxError && (Error as any)?.status == 400 && 'body' in Error) {
                res.status(400).json({ Status: 'FAIL', Passed: false, Message: '400 Bad Request', Data: null });
                return;
            }

            Logger.Error(Logger.Type.Express, 'An error occurred while handling the request:', Error);
            res.status(500).json({ Status: 'FAIL', Passed: false, Message: '500 Internal Server Error', Data: { Error } });
        });
        
    }

    private async InitRoutes() {
        await this.LoadMiddlewares();
        await this.LoadRoutes();

        this.Init();
    }

    public async Start(): Promise<void> {
        await this.InitRoutes();
        
        return new Promise((Resolve, Reject) => {
            this.HttpServer = http.createServer(this.App);
            this.HttpServer.listen(process.env.EXPRESS_PORT, () => {
                Logger.Info(Logger.Type.Express, `Listening on port &c${process.env.EXPRESS_PORT}&r`);
                Resolve();
            });
        });
    }

    private async LoadMiddlewares() {
        Logger.Debug(Logger.Type.Express, 'Loading middlewares...');

        for (const FilePath of Utils.ReadDirRecursive(path.join(__dirname, 'Middlewares'))) {
            const Middleware: ExpressMiddleware = new (require(FilePath)).default(this);
            const FileName = path.parse(FilePath).name;
            this.Middlewares[FileName] = Middleware;
            Logger.Debug(Logger.Type.Express, `Loaded middleware &c${FileName}&r`);
        }

        Logger.Info(Logger.Type.Express, `Loaded middlewares (&c${Object.keys(this.Middlewares).length}&r): &c${Object.keys(this.Middlewares).join(', ')}&r`);
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