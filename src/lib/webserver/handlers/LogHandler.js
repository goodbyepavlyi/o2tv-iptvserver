const Application = require("../../Application");
const Logger = require("../../utils/Logger");

module.exports = class LogHandler {
    /**
     * 
     * @param {Application} application 
     */
    constructor(application) {
        this.application = application;
    };

    logRoute(req, res, next) {
        const { url, protocol, method, headers } = req;
        const { statusCode } = res

        Logger.info(
            Logger.Type.Webserver,
            `${req.header("X-Forwarded-For") || req.socket.remoteAddress} - "${method} ${url} ${protocol}" ${statusCode} ${headers.referer || "-"} ${headers["user-agent"]}`
        );

        return next();
    }
}
