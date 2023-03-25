const fs = require('fs');
const debug = require('debug')('Config');
const { CONFIG_PATH, O2TV_EMAIL, O2TV_PASSWORD } = require('../config');

module.exports = class Config {
    async initializeConfig() {
        if (this.config) return;

        if (!(O2TV_EMAIL || O2TV_PASSWORD))
            throw new Error('The O2TV_EMAIL and O2TV_PASSWORD environment variables must be set in order to use the O2TV service. Please set these variables before proceeding.');

        debug('Initializing configuration...');
        let config;
        
        try {
            config = fs.readFileSync(CONFIG_PATH, 'utf8');
            config = JSON.parse(config);
        } catch (error) {
            config = {};
        }
        debug('The configuration has been loaded.');

        await this.__saveConfig(config);

        this.config = config;
    }

    getConfig() {
        return this.config;
    }

    async saveConfig() {
        const config = this.getConfig();
        await this.__saveConfig(config);
    }

    async __saveConfig(config) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4), {
            mode: 0o600,
        });
        debug('Configuration has been saved.');
    }
}