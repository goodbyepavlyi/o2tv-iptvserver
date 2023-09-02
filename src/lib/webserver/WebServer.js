const express = require("express");
const path = require("path");
const { walkFs } = require("../utils/FileHelper");
const Application = require("../Application");
const LogHandler = require("./handlers/LogHandler");
const ErrorHandler = require("./handlers/ErrorHandler");

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
        this.application.getConsoleLog().info("WebServer", "Starting Web Server..");
    
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
        this.application.getConsoleLog().info("WebServer", "Registering routes..");

        const files = walkFs(path.resolve(__dirname, "../../routes")).filter(file => file.endsWith(".js"));
        for (const fileName of files) {
            const route = new (require(fileName))(this.application);
            
            try {
                await route.setup(this.express);
                this.application.getConsoleLog().debug("WebServer", `Route ${route.url} registered successfully.`);
            } catch (error) {
                this.application.getConsoleLog().error("WebServer", `Failed to register route ${route.url}. Error: ${error.message}`);
            }
        };

        this.application.getConsoleLog().success("WebServer", "Routes registered successfully.");
    }

    listen() {
        const listenAddress = this.application.getConfig().WebServer_ListenAddress;
        const port = this.application.getConfig().WebServer_Port;

        try {
            this.server = this.express.listen(port, listenAddress, () => {
                this.application.getConsoleLog().success("WebServer", `Web Server is listening on ${listenAddress}:${port}`);
            }).on("error", (error) => {
                this.application.getConsoleLog().error("WebServer", `Failed to start the Web Server. Error: ${error.message}`);
            });
        } catch (error) {
            this.application.getConsoleLog().error("WebServer", `Failed to start the Web Server. Error: ${error.message}`);
        }
    }
}