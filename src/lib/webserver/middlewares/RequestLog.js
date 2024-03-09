const Middleware = require("../../types/Middleware");
const Logger = require("../../utils/Logger");

module.exports = class RequestLog extends Middleware {
    /**
     * @param {import("express").Request} req
     * @param {import("express").Response} res
     * @param {import("express").NextFunction} next
     */
    run(req, res, next) {
        Logger.info(Logger.Type.Webserver, `${req.headers['x-forwarded-for'] || req.ip} - "${req.method} ${req.url}" ${req.headers["user-agent"]}`);
        return next();
    }
}
