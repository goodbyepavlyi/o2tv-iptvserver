const APIResponse = require("../../types/APIResponse");
const Middleware = require("../../types/Middleware");
const Logger = require("../../utils/Logger");

module.exports = class ServerError extends Middleware {
    /**
     * @param {import("express").Request} req
     * @param {import("express").Response} res
     * @param {import("express").NextFunction} next
     */
    run(error, req, res, next) {
        if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
            return APIResponse.INVALID_REQUEST_BODY.send(res);
        }

        Logger.error(Logger.Type.Webserver, error.stack);
        return APIResponse.INTERNAL_SERVER_ERROR.send(res);
    }
};