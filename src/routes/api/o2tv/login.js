const Application = require("../../../lib/Application");
const { O2TVAuthenticationError, O2TVApiError } = require("../../../lib/o2tv/O2TVErrors");
const Logger = require("../../../lib/utils/Logger");
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
        this.url = WebRoute.ApiO2TVLogin;
    }

    /**
     * Sets up the API route.
     * 
     * @param {import('express').Express} express - The Express app instance.
     */
    async setup(express) {
        express.post(this.url, async (req, res) => {
            try {
                const { username, password } = req.body;
                if (!(username && password)) {
                    ApiResponse.MalformedRequest.send(res);
                    return;
                }

                await this.application.getO2TV().getSession().login(username, password, null)
                    .then(async () => {
                        this.application.getConfig().O2TV_Username = username;
                        this.application.getConfig().O2TV_Password = password;
                        this.application.getConfig().O2TV_DeviceId = this.application.getO2TV().getSession().createDeviceId();

                        await this.application.getO2TV().getSession().loadSession()
                            .then(() => ApiResponse.Success.send(res));
                    });
            } catch (error) {
                let response;

                if (error instanceof O2TVAuthenticationError) 
                    response = ApiResponse.O2TVAuthenticationFailed;

                if (error instanceof O2TVApiError) 
                    response = ApiResponse.O2TVApiError;
                
                if (!response) 
                    response = ApiResponse.ServerError;
                
                Logger.error(Logger.Type.Webserver, error);
                response.send(res);
            }
        });
    }
};
