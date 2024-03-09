module.exports = class Middleware {
    /**
     * @param {import("../webserver/Webserver")} webserver 
     */
    constructor(webserver) {
        this.webserver = webserver;
    }

    /**
     * @abstract
     * @param {import("express").Request} req
     * @param {import("express").Response} res
     * @param {import("express").NextFunction} next
     */
    run(req, res, next) {
        throw new Error("Method not implemented");
    }
}