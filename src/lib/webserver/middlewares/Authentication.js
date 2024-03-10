const Config = require("../../Config");
const Middleware = require("../../types/Middleware");
const Routes = require("../Routes");

module.exports = class Authentication extends Middleware {
    constructor(webserver) {
        super(webserver);
    }

    isSessionActive = (req, res, next) => {
        const sessionValid = this.webserver.application.getO2TV().getSession().validTo > Math.floor(Date.now() / 1000);
        if (!sessionValid && req.path != Routes.Login) {
            return res.redirect(Routes.Login);
        }

        if (sessionValid && req.path == Routes.Login) {
            return res.redirect(Routes.Home);
        }

        return next();
    }
}