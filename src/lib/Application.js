const Config = require("./Config");
const O2TV = require("./o2tv/O2TV");
const Logger = require("./utils/Logger");
const Webserver = require("./webserver/Webserver");

module.exports = class Application {
    constructor() {
        this.webserver = new Webserver(this);
        this.o2tv = new O2TV(this);

        this.start();
    }

    getWebserver = () => this.webserver;
    getO2TV = () => this.o2tv;

    async start() {
        const launchTime = Date.now();

        await this.o2tv.load();
        this.webserver.start();

        Logger.info(Logger.Type.Application, `Started in ${(Date.now() - launchTime) / 1000}ms`);
    };

    shutdown() {
        Logger.info(Logger.Type.Application, "Shutdown in progress..");
        Config.saveConfig();

        process.exit(0);
    } 
}