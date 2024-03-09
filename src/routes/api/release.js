const Application = require("../../lib/Application");
const Logger = require("../../lib/utils/Logger");
const Utils = require("../../lib/utils/Utils");
const ApiResponse = require("../../lib/webserver/ApiResponse");
const WebRoute = require("../../lib/webserver/WebRoute");

module.exports = class {
    /**
     * Constructs an instance of SetupHandler.
     * 
     * @param {Application} application - The Application instance.
     */
    constructor(application) {
        this.application = application;
        this.url = WebRoute.ApiRelease;
    }

    /**
     * Sets up the API route.
     * 
     * @param {import('express').Express} express - The Express app instance.
     */
    async setup(express) {
        express.get(this.url, async (req, res) => {
            try {
                ApiResponse.Success.send(res, {
                    version: Utils.getVersion(),
                });
            } catch (error) {
                let response;

                if (!response) 
                    response = ApiResponse.ServerError;
                
                Logger.error(Logger.Type.Webserver, error);
                response.send(res);
            }
        });
    }
};
