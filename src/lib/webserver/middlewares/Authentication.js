const Config = require("../../Config");
const Middleware = require("../../types/Middleware");
const Routes = require("../Routes");

module.exports = class Authentication extends Middleware {
    constructor(webserver) {
        super(webserver);
    }

    // TODO: check if o2tv is actually logged in etc..
    isSessionActive(req, res, next) {
        if (Config.o2tvUsername && Config.o2tvPassword && Config.o2tvDeviceId && req.path == Routes.Login) 
            return res.redirect(Routes.Home);
        
        if (req.path == Routes.Login) 
            return next();

        if (!(Config.o2tvUsername && Config.o2tvPassword && Config.o2tvDeviceId)) 
            return res.redirect(Routes.Login);
        
        return next();
    }
}