const fs = require("fs");
const path = require("path");
const { version } = require("../../package.json");

module.exports = class Config {
    constructor() {
        this.configPath = this.EnvironmentInProduction ? "/data/config.json" : path.join(__dirname, "../../config.json");
        
        this.load();
    }

    load() {
        if (fs.existsSync(this.configPath))
            return this.config = require(this.configPath);

        this.config = this.getDefaultConfig();
        this.save();
    }
    
    save() {
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 4));
    }

    getDefaultConfig() {
        return {
            webServer: {
                address: "0.0.0.0", 
                port: 3000, 
            }, 
            o2tv: {
                services: null, 
                username: null, 
                password: null, 
                deviceId: null, 
            }, 
        };
    }

    get Environment() {
        return process.env.NODE_ENV || "PRODUCTION";
    }

    get EnvironmentInProduction() {
        return this.Environment == "PRODUCTION";
    }

    get Version() {
        return version;
    }

    get WebServer_ListenAddress() {
        return process.env.WEBSERVER_LISTENADDRESS || this.config.webServer.address;
    }
    
    get WebServer_Port() {
        return process.env.WEBSERVER_PORT || this.config.webServer.port;
    }

    get WebServer_PublicURL() {
        return process.env.WEBSERVER_PUBLICURL;
    }

    get O2TV_Services() {
        return this.config.o2tv.services;
    }
    
    set O2TV_Services(value) {
        this.config.o2tv.services = value;
    }

    get O2TV_Username() {
        return process.env.O2TV_USERNAME || this.config.o2tv.username;
    }
    
    set O2TV_Username(value) {
        return this.config.o2tv.username = value;
    }

    get O2TV_Password() {
        return process.env.O2TV_PASSWORD || this.config.o2tv.password;
    }
    
    set O2TV_Password(value) {
        return this.config.o2tv.password = value;
    }

    get O2TV_DeviceId() {
        return process.env.O2TV_DEVICEID || this.config.o2tv.deviceId;
    }
    
    set O2TV_DeviceId(value) {
        return this.config.o2tv.deviceId = value;
    }
}