const O2TV = require("./o2tv/O2TV");
const Config = require("./utils/Config");
const ConsoleLog = require("./utils/ConsoleLog");
const WebServer = require("./webserver/WebServer");

module.exports = class Application {
    constructor() {
        this.config = new Config();
        this.consoleLog = new ConsoleLog();

        this.webServer = new WebServer(this);
        this.o2tv = new O2TV(this);

        this.start();
    }

    getConfig() {
        return this.config;
    }

    getConsoleLog() {
        return this.consoleLog;
    }

    getWebServer() {
        return this.webServer;
    }

    getO2TV() {
        return this.o2tv;
    }

    start() {
        return new Promise(async (resolve, reject) => {
            let launchTime = Date.now();

            await this.o2tv.load();
            await this.webServer.start();
            this.consoleLog.info("Application", `Started in ${(Date.now() - launchTime) / 1000}ms`);
        });
    }

    shutdown() {
        return new Promise(async (resolve, reject) => {
            this.consoleLog.info("Application", "Shutdown in progress..");
    
            this.config.save();
            resolve();
        });
    }
}