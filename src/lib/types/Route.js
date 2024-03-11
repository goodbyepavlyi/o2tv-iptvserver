const { Router } = require("express");

module.exports = class Route {
    /**
     * @param {import("../webserver/Webserver")} webserver 
     */
    constructor(webserver) {
        this.webserver = webserver;
        this.router = Router();

        this.loadRoutes();
    }

    getRouter = () => this.router;
    loadRoutes() {
        throw new Error("Method not implemented");
    }
}