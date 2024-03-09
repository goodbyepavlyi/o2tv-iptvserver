const APIResponse = require("../../types/APIResponse")
const Middleware = require("../../types/Middleware")

module.exports = class RouteNotFound extends Middleware {
    /**
     * @param {import("express").Request} req
     * @param {import("express").Response} res
     * @param {import("express").NextFunction} next
     */
    run = (req, res, next) => APIResponse.ROUTE_NOT_FOUND.send(res)
}
