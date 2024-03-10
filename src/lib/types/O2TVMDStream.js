const Config = require("../Config");

module.exports = class O2TVMDStream {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.images = data.images;
        this.startts = data.startts;
        this.endts = data.endts;
        this.channel = data.channel;
    }

    getPlaylistM3U = () => `#EXTINF:-1 catchup="append" catchup-days="7" catchup-source="&catchup_start_ts={utc}&catchup_end_ts={utcend}" tvg-id="${this.channel.number}" tvh-epg="0" tvg-logo="${this.channel.logo}",${this.channel.name}- MD: ${this.name}\n${Config.webserverPublicUrl}/api/o2tv/stream/${this.channel.id}/${this.id}`
}