const Application = require("../../../lib/Application");
const { O2TVAuthenticationError, O2TVApiError } = require("../../../lib/o2tv/O2TVErrors");
const ApiResponse = require("../../../lib/webserver/ApiResponse");
const WebRoute = require("../../../lib/webserver/WebRoute");

module.exports = class {
    /**
     * Constructs an instance of SetupHandler.
     * 
     * @param {Application} application - The Application instance.
     */
    constructor(application) {
        this.application = application;
        this.url = WebRoute.ApiO2TVChannels;
    }

    /**
     * Sets up the API route.
     * 
     * @param {import('express').Express} express - The Express app instance.
     */
    async setup(express) {
        express.get(this.url, async (req, res) => {
            try {
                await this.application.getO2TV().getChannels().getChannels()
                    .then((data) => 
                        ApiResponse.Success.send(res, {
                            channels: data, 
                        })
                    );
            } catch (error) {
                let response;

                if (error instanceof O2TVAuthenticationError) 
                    response = ApiResponse.O2TVAuthenticationFailed;

                if (error instanceof O2TVApiError) 
                    response = ApiResponse.O2TVApiError;
                
                if (!response) 
                    response = ApiResponse.ServerError;
                
                this.application.getConsoleLog().error("WebServer", error);
                response.send(res);
            }
        });
    }
};