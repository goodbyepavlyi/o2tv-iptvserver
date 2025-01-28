import Express from '../Express';

export default class ExpressMiddleware {
    public static Express: Express;

    constructor(Express: Express) {
        ExpressMiddleware.Express = Express;
    }
}