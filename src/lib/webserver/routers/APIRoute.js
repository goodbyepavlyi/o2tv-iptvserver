const APIResponse = require("../../types/APIResponse");
const Route = require("../../types/Route");

module.exports = class APIRoute extends Route {
    constructor(webserver) {
        super(webserver);
    }
    
    loadRoutes() {
        this.router.get("/", (req, res, next) => APIResponse.OK.send(res));
    }
}