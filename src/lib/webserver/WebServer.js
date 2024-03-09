const express = require("express");
const path = require("path");
const { walkFs } = require("../utils/FileHelper");
const Application = require("../Application");
const LogHandler = require("./handlers/LogHandler");
const ErrorHandler = require("./handlers/ErrorHandler");
const Logger = require("../utils/Logger");
const Config = require("../Config");

module.exports = class WebServer {
    /**
     * 
     * @param {Application} application 
     */
    constructor(application) {
        this.application = application;
        this.express = express();
    }

    getExpress() {
        return this.express;
    }
    
    getServer() {
        return this.server;
    }

    async start() {
        Logger.info(Logger.Type.Webserver, "Starting Web Server..");
    
        this.express.set("trust proxy", 1);
        this.express.set("view engine", "ejs");
        this.express.set("views", path.resolve(__dirname, "../../views"));
        
        this.express.use(express.json())
        this.express.use("/favicon.ico", express.static(path.resolve(__dirname, "../../public/favicon.ico")))
        this.express.use("/public", express.static(path.resolve(__dirname, "../../public")))

        const logHandler = new LogHandler(this.application);
        this.express.use(logHandler.logRoute.bind(logHandler));

        await this.registerRoutes();

        const errorHandler = new ErrorHandler(this.application);
        this.express.use(errorHandler.handle404Error.bind(errorHandler));
        this.express.use(errorHandler.handleServerErrors.bind(errorHandler));

        this.listen();
    }

    async registerRoutes() {
        Logger.info(Logger.Type.Webserver, "Registering routes..");

        const files = walkFs(path.resolve(__dirname, "../../routes")).filter(file => file.endsWith(".js"));
        for (const fileName of files) {
            const route = new (require(fileName))(this.application);
            
            try {
                await route.setup(this.express);
                Logger.debug(Logger.Type.Webserver, `Route ${route.url} registered successfully.`);
            } catch (error) {
                Logger.error(Logger.Type.Webserver, `Failed to register route ${route.url}. Error: ${error.message}`);
            }
        };

        Logger.info(Logger.Type.Webserver, "Routes registered successfully.");
    }

    listen() {
        try {
            this.server = this.express.listen(Config.webserverPort, Config.webserverAddress, () => {
                Logger.info(Logger.Type.Webserver, `Web Server is listening on ${Config.webserverAddress}:${Config.webserverPort}`);
            }).on("error", (error) => {
                Logger.error(Logger.Type.Webserver, `Failed to start the Web Server. Error: ${error.message}`);
            });
        } catch (error) {
            Logger.error(Logger.Type.Webserver, `Failed to start the Web Server. Error: ${error.message}`);
        }
    }
}