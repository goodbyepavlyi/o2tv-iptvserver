import Express from '../Express';
import ExpressRoute from '../Models/ExpressRoute';
import HTTP from '../../Utils/HTTP';
import SessionMiddleware from '../Middlewares/SessionMiddleware';

const GetLatestVersions = async () => {
    return await HTTP.Get('https://goodbyepavlyi.github.io/o2tv-iptvserver/releases.json')
        .then((x: any) => {
            const Releases = Object.entries(x).map(([Version, Changelog]) => ({ Version, Changelog }));
            const LatestVersion = Releases.reduce((Latest, Release) => Release.Version > Latest.Version ? Release : Latest, { Version: '0.0.0', Changelog: '' });
            return Releases.find(x => x.Version === LatestVersion.Version);
        })
        .catch(() => null);
}

const IsUpdateAvailable = async () => {
    const LatestVersion = await GetLatestVersions() 
    return process.Version >= LatestVersion!?.Version ? LatestVersion : null;
};

export default class extends ExpressRoute {
    constructor(Express: Express) {
        super(Express, { Path: '/' });
    }

    public Routes: RouteHandler[]|undefined = [
        {
            name: '',
            method: 'GET',
            middleware: [SessionMiddleware.AccessValidation],
            run: async (req, res) => {
                const Update = await IsUpdateAvailable();
                res.render('index', { Update, URL: process.env.EXPRESS_URL });
            }
        },
        {
            name: 'setup',
            method: 'GET',
            middleware: [SessionMiddleware.AccessValidation],
            run: async (req, res) => {
                res.render('setup');
            }
        }
    ];
}