const Application = require("../../Application");
const Logger = require("../../utils/Logger");
const ApiResponse = require("../ApiResponse");

/**
 * Handles error responses and rendering for the web server.
 */
module.exports = class ErrorHandler {
    /**
     * Constructs an instance of ErrorHandler.
     * 
     * @param {Application} application - The Application instance.
     */
    constructor(application) {
        this.application = application;
    }

    /**
     * Handles 404 Not Found errors.
     * 
     * @param {import('express').Request} req - The Express request object.
     * @param {import('express').Response} res - The Express response object.
     * @param {import('express').NextFunction} next - The next middleware function.
     */
    handle404Error(req, res, next) {
        if (req.path.startsWith("/api")) 
            return ApiResponse.NotFound.send(res);

        return res.status(404).render("error");
    }

    /**
     * Handles general server errors.
     * 
     * @param {Error} error - The error object.
     * @param {import('express').Request} req - The Express request object.
     * @param {import('express').Response} res - The Express response object.
     * @param {import('express').NextFunction} next - The next middleware function.
     */
    handleServerErrors(error, req, res, next) {
        if (req.path.startsWith("/api")) {
            let reason = ApiResponse.ServerError;

            if (error instanceof SyntaxError) 
                reason = ApiResponse.MalformedRequest;
            
            if (error.code == 500) 
                Logger.error(Logger.Type.Webserver, error);
            
            return reason.send(res);
        }
        
        Logger.error(Logger.Type.Webserver, error);
        return res.status(500).render("error");
    }
};
