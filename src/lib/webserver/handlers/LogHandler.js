const Application = require("../../Application");

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

        this.application.getConsoleLog().info(
            "WebServer",
            `${req.header("X-Forwarded-For") || req.socket.remoteAddress} - "${method} ${url} ${protocol}" ${statusCode} ${headers.referer || "-"} ${headers["user-agent"]}`
        );

        return next();
    }
}
