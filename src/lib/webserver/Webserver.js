const express = require("express");
const fs = require("fs");
const path = require("path");
const Logger = require("../utils/Logger");
const Config = require("../Config");

module.exports = class Webserver {
    /**
     * @param {import("../Application")} application 
     */
    constructor(application) {
        /** @type {import("../Application")} */
        this.application = application;
        
        this.routers = {};
        this.middlewares = {};
        
        this.app = express();
        this.port = Config.webserverPort;

        this.app.set("view engine", "ejs");
        this.app.set("views", path.join(__dirname, "./views"));
        this.app.disable("x-powered-by");

        this._registerRoutes();
    }

    async _registerRoutes() {
        await this.loadMiddlewares();
        await this.loadRouters();

        this.app.use("/api", express.json());
        this.app.use((req, res, next) => this.middlewares["RequestLog"].run(req, res, next));

        this.app.use("/favicon.ico", express.static(path.resolve(__dirname, "./public/favicon.ico")))
        this.app.use("/public", express.static(path.join(__dirname, "./public")));
        this.app.use("/", this.routers["RootRoute"].router);

        this.app.use("/api", this.routers["APIRoute"].router);
        this.app.use("/api/o2tv", this.routers["APIO2TVRoute"].router);

        this.app.use((req, res, next) => this.middlewares["RouteNotFound"].run(req, res, next));
        this.app.use((error, req, res, next) => this.middlewares["ServerError"].run(error, req, res, next));
    }

    async loadMiddlewares() {
        Logger.info(Logger.Type.Webserver, "Loading middlewares...");

        for (const filePath of fs.readdirSync(path.resolve(__dirname, "./middlewares")).filter(file => file.endsWith(".js"))) {
            try {
                const middleware = new(require(`./middlewares/${filePath}`))(this);
                const fileName = path.parse(filePath).name;

                this.middlewares[fileName] = middleware;
                Logger.debug(Logger.Type.Webserver, `Loaded middleware ${Logger.Colors.Fg.Magenta}${fileName}${Logger.Colors.Reset}`);
            } catch (error) {
                Logger.error(Logger.Type.Webserver, `An unknown error occured while loading middleware "${filePath}":`, error);
            }
        }

        if (Object.keys(this.middlewares).length === 0) {
            return Logger.warn(Logger.Type.Webserver, "No middlewares loaded");
        }

        Logger.info(Logger.Type.Webserver, `${Logger.Colors.Fg.Magenta}${Object.keys(this.middlewares).length}${Logger.Colors.Reset} middlewares loaded`);
    }


    async loadRouters() {
        Logger.info(Logger.Type.Webserver, "Loading routers...");

        for (const filePath of fs.readdirSync(path.resolve(__dirname, "./routers")).filter(file => file.endsWith(".js"))) {
            try {
                const router = new(require(`./routers/${filePath}`))(this);
                const fileName = path.parse(filePath).name;

                this.routers[fileName] = router;
                Logger.debug(Logger.Type.Webserver, `Loaded router ${Logger.Colors.Fg.Magenta}${fileName}${Logger.Colors.Reset}`);
            } catch (error) {
                Logger.error(Logger.Type.Webserver, `An unknown error occured while loading router "${filePath}":`, error);
            }
        }

        if (Object.keys(this.routers).length === 0) {
            return Logger.warn(Logger.Type.Webserver, "No routers loaded");
        }

        Logger.info(Logger.Type.Webserver, `${Logger.Colors.Fg.Magenta}${Object.keys(this.routers).length}${Logger.Colors.Reset} routers loaded`);
    }

    start() {
        try {
            this.server = this.app.listen(Config.webserverPort, Config.webserverAddress, () => 
                Logger.info(Logger.Type.Webserver, `Web Server is listening on ${Config.webserverAddress}:${Config.webserverPort}`))
        } catch (error) {
            Logger.error(Logger.Type.Webserver, "An error occured while starting the Web Server:", error);
        }
    }
}