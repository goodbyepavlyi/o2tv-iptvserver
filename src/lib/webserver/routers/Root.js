const Route = require("../../types/Route");

module.exports = class WebRoute extends Route {
    constructor(webserver) {
        super(webserver);
    }
    
    loadRoutes() {
        this.router.get("/", this.webserver.middlewares["Authentication"].isSessionActive, (req, res) => res.render("index"));
        this.router.get("/channels", this.webserver.middlewares["Authentication"].isSessionActive, (req, res) => res.render("channels"));
        this.router.get("/login", this.webserver.middlewares["Authentication"].isSessionActive, (req, res) => res.render("login"));
    }
}