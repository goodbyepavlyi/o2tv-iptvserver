const Application = require("../../Application");
const Config = require("../../Config");
const WebRoute = require("../WebRoute");

module.exports = class LoginMiddleware {
    /**
     * 
     * @param {Application} application 
     */
    constructor(application) {
        this.application = application;
    }

    run(req, res, next) {
        if (Config.o2tvUsername && Config.o2tvPassword && Config.o2tvDeviceId && req.path == WebRoute.Login) 
            return res.redirect(WebRoute.Home);
        
        if (req.path == WebRoute.Login) 
            return next();

        if (!(username && password && deviceId)) 
            return res.redirect(WebRoute.Login);
        
        return next();
    }
}