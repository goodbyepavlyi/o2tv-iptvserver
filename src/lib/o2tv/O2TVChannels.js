const O2TVChannel = require("../types/O2TVChannel");
const Logger = require("../utils/Logger");

module.exports = class O2TVChannels {
    /**
     * @param {import("./O2TV")} o2tv 
     */
    constructor(o2tv) {
        this.o2tv = o2tv;

        /** @type {Object.<string, import("../types/O2TVChannel")>} */
        this.channels = {};
    }

    async getChannels() {
        if (this.validTo < Math.floor(Date.now() / 1000) || Object.keys(this.channels).length <= 0) {
            Logger.info(Logger.Type.O2TV, "Channels valid to is expired, reloading...");
            this.validTo = -1;
            await this.loadChannels();
        }

        return this.channels;
    }

    /**
     * @returns {Promise<Object.<string, import("../types/O2TVChannel")>>}
     */
    async getChannelsList(key) {
        if (!key) {
            return this.channels;
        }
        
        const channels = {};
        for (const channel of Object.values(await this.getChannels())) {
            channels[channel[key]] = channel;
        }
    
        return channels;
    }

    async loadChannels() {
        Logger.info(Logger.Type.O2TV, "Loading channels...");
        this.channels = {};

        const result = await this.o2tv.getApi().getChannels();
        for (const data of result) {
            if (!data.metas.ChannelNumber) {
                Logger.warn(Logger.Type.O2TV, `Channel &c${data.name} &r(&c${data.id}) &rhas no channel number`);
                continue;
            }

            this.channels[data.id] = new O2TVChannel(this.o2tv, data);
        }

        this.validTo = Math.floor(Date.now() / 1000) + 60*60*24;
        Logger.info(Logger.Type.O2TV, `Loaded &c${Object.keys(this.channels).length} &rchannels`);

        return this.channels;
    }
}