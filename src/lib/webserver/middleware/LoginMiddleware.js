const Application = require("../../Application");
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
        const { O2TV_Username: username, O2TV_Password: password, O2TV_DeviceId: deviceId } = this.application.getConfig();
        
        if (username && password && deviceId && req.path == WebRoute.Login) 
            return res.redirect(WebRoute.Home);
        
        if (req.path == WebRoute.Login) 
            return next();

        if (!(username && password && deviceId)) 
            return res.redirect(WebRoute.Login);
        
        return next();
    }
}