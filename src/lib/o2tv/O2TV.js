const Application = require("../Application");
const O2TVChannels = require("./O2TVChannels");
const O2TVSession = require("./O2TVSession");
const O2TVStream = require("./O2TVStream");
const O2TVApi = require("./O2TVApi");

module.exports = class O2TV {
    /**
     * 
     * @param {Application} application 
     */
    constructor(application) {
        this.application = application;
        
        this.clientTag = "1.22.0-PC";
        this.apiVersion = "5.4.0";
        this.partnerId = 3201;

        this.api = new O2TVApi(this);
        this.session = new O2TVSession(this);
        this.channels = new O2TVChannels(this);
        this.stream = new O2TVStream(this);
    }
    
    getClientTag() {
        return this.clientTag;
    }

    getApiVersion() {
        return this.apiVersion;
    }

    getPartnerId() {
        return this.partnerId;
    }

    getApplication() {
        return this.application;
    }

    getApi() {
        return this.api;
    }

    getSession() {
        return this.session;
    }

    getChannels() {
        return this.channels;
    }

    getStream() {
        return this.stream;
    }
}