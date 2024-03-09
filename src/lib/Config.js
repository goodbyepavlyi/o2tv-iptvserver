const fs = require("fs");
const Logger = require("./utils/Logger");
const Utils = require("./utils/Utils");

class Config {
    static configPath = `${Utils.getDataDirectory()}/config.json`

    /**
     * @private
     * @returns {ConfigData} 
     */
    static _getDefaultConfig = () => ({
        webserver: {
            address: "0.0.0.0",
            port: 3000,
            publicUrl: "CHANGE_ME"
        },
        o2tv: {
            services: null,
            username: null,
            password: null,
            deviceId: null,
        }
    });

    /**
     * @returns {ConfigData} 
     */
    static getConfig() {
        if (this._config) {
            return this._config;
        }

        this._config = this.load();
        return this._config;
    }

    static saveConfig() {
        Logger.info(Logger.Type.Config, "Saving config..");

        if (!fs.existsSync(Utils.getDataDirectory())) {
            Logger.info(Logger.Type.Config, "Data directory not found, creating one...");
            fs.mkdirSync(Utils.getDataDirectory());
        }

        fs.writeFileSync(this.configPath, JSON.stringify(this._config, null, 4));
    }

    /**
     * @returns {ConfigData} 
     */
    static load() {
        Logger.info(Logger.Type.Config, "Loading config..");

        if (!fs.existsSync(this.configPath)) {
            Logger.info(Logger.Type.Config, "Config file not found, creating...");
            this._config = this._getDefaultConfig();
            this.saveConfig();
            return this._config;
        }

        const config = JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
        return config;
    }
    
    static get webserverAddress() {
        return this.getConfig().webserver.address;
    }

    static get webserverPort() {
        return this.getConfig().webserver.port;
    }

    static get webserverPublicUrl() {
        return this.getConfig().webserver.publicUrl;
    }

    static get o2tvUsername() {
        return this.getConfig().o2tv.username;
    }

    static set o2tvUsername(username) {
        this.getConfig().o2tv.username = username;
        this.saveConfig();
    }

    static get o2tvPassword() {
        return this.getConfig().o2tv.password;
    }

    static set o2tvPassword(password) {
        this.getConfig().o2tv.password = password;
        this.saveConfig();
    }

    static get o2tvDeviceId() {
        return this.getConfig().o2tv.deviceId;
    }

    static set o2tvDeviceId(deviceId) {
        this.getConfig().o2tv.deviceId = deviceId;
        this.saveConfig();
    }

    static get o2tvServices() {
        return this.getConfig().o2tv.services;
    }

    static set o2tvServices(services) {
        this.getConfig().o2tv.services = services;
        this.saveConfig();
    }
}

Config.load();
module.exports = Config;

/**
 * @typedef {Object} ConfigData
 * @property {object} webserver
 * @property {string} webserver.address
 * @property {number} webserver.port
 * @property {object} o2tv
 * @property {string} o2tv.username
 * @property {string} o2tv.password
 * @property {string} o2tv.deviceId
 * @property {Object.<number, import("./Enums").O2TVService>} o2tv.services
 */