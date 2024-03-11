const Route = require("../../types/Route");

module.exports = class RootRoute extends Route {
    constructor(webserver) {
        super(webserver);
    }
    
    loadRoutes() {
        this.router.get("/", this.webserver.middlewares["Authentication"].isSessionActive, (req, res) => res.render("index"));
        this.router.get("/login", this.webserver.middlewares["Authentication"].isSessionActive, (req, res) => res.render("login"));
    }
}