const O2TVChannels = require("./O2TVChannels");
const O2TVSession = require("./O2TVSession");
const O2TVStream = require("./O2TVStream");
const O2TVApi = require("./O2TVApi");
const O2TVEpg = require("./O2TVEpg");
const Logger = require("../utils/Logger");

module.exports = class O2TV {
    /**
     * @param {import("../Application")} application 
     */
    constructor(application) {
        this.application = application;
        
        this.clientTag = "1.22.0-PC";
        this.apiVersion = "5.4.0";
        this.partnerId = 3201;

        this.session = new O2TVSession(this);
        this.api = new O2TVApi(this);
        this.channels = new O2TVChannels(this);
        this.stream = new O2TVStream(this);
        this.epg = new O2TVEpg(this);
    }
    
    getClientTag = () => this.clientTag;
    getApiVersion = () => this.apiVersion;
    getPartnerId = () => this.partnerId;
    getSession = () => this.session;
    getApi = () => this.api;
    getChannels = () => this.channels;
    getStream = () => this.stream;
    getEpg = () => this.epg;

    async load() {
        try {
            await this.session.loadSession();

            if (this.session.isValid()) {
                await this.channels.loadChannels();
            }
        } catch (error) {
            Logger.error(Logger.Type.O2TV, "An error occurred while loading O2TV", error);
            this.application.shutdown();
        }
    }
}