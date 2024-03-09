const O2TVChannel = require("./types/O2TVChannel");

module.exports = class O2TVChannels {
    /**
     * @param {import("./O2TV")} o2tv 
     */
    constructor(o2tv) {
        this.o2tv = o2tv;

        this.validTo = -1;
        this.channels = {};
    }

    async getChannels() {
        if (this.validTo < Math.floor(Date.now() / 1000) || !this.channels) {
            this.validTo = -1;
            await this.loadChannels();
        }

        return this.channels;
    }

    getChannelsList(byKey) {
        if (!byKey) {
            return this.channels;
        }
        
        const channels = {};
        // TODO: this probably can be optimized but i'm not sure rn
        for (const channel in this.channels) {
            channels[this.channels[channel][byKey]] = this.channels[channel];
        }
    
        return channels;
    }

    async loadChannels() {
        this.channels = {};

        const result = await this.o2tv.getApi().callList({
            language: "ces", 
            ks: this.o2tv.getSession().getKS(), 
            filter: {
                objectType: "KalturaChannelFilter", 
                kSql: "(and asset_type='607')", 
                idEqual: 355960, 
            }, 
            pager: {
                objectType: "KalturaFilterPager", 
                pageSize: 300, 
                pageIndex: 1, 
            }, 
            clientTag: this.o2tv.getClientTag(), 
            apiVersion: this.o2tv.getApiVersion(), 
        });
        
        for (const channel of result) {
            if (!channel.metas.ChannelNumber) {
                continue;
            }

            let image;
            if (channel.images.length > 1) {
                for (const image in channel.images) 
                    if (image.ratio == "16x9") 
                        image = image.url;
                
                if (!image) 
                    image = `${channel.images[0].url}/height/320/width/480`;
            }

            this.channels[channel.id] = new O2TVChannel(this.o2tv, {
                number: channel.metas.ChannelNumber.value,
                name: channel.name,
                id: channel.id,
                logo: image,
            });
        }

        this.validTo = Math.floor(Date.now() / 1000) + 60*60*24;
        return this.channels;
    }
}