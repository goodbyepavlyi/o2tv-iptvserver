const Application = require("../lib/Application");
const WebRoute = require("../lib/webserver/WebRoute");
const LoginMiddleware = require("../lib/webserver/middleware/LoginMiddleware");

module.exports = class {
    /**
     * Constructs an instance of BasicRouteHandler.
     * 
     * @param {Application} application - The Application instance.
     */
    constructor(application) {
        this.application = application;
        this.url = WebRoute.Channels;
    }

    /**
     * Sets up the route to handle GET requests.
     * 
     * @param {import('express').Express} express - The Express app instance.
     */
    async setup(express) {
        const loginMiddleware = new LoginMiddleware(this.application);

        express.get(this.url, loginMiddleware.run.bind(loginMiddleware), (req, res) => {
            return res.render("channels");
        });
    }
};
