const Config = require("../Config");
const Logger = require("../utils/Logger");
const O2TVMDStream = require("./O2TVMDStream");

module.exports = class O2TVChannel {
    /**
     * @param {import("../o2tv/O2TV")} o2tv 
     * @param {import("./Types").O2TVChannel} data 
     */
    constructor(o2tv, data) {
        this.o2tv = o2tv;

        this.id = data.id;
        this.number = data.metas["ChannelNumber"].value;
        this.name = data.name;
        this.images = data.images;
        this.logo = data.images.find(image => image.imageTypeId == 18).url || `${data.images[0].url}/height/320/width/480`;
    }

    getPlaylistM3U = () => `#EXTINF:-1 catchup="append" catchup-days="7" catchup-source="&catchup_start_ts={utc}&catchup_end_ts={utcend}" tvg-id="${this.number}" tvh-epg="0" tvg-logo="${this.logo}",${this.name}\n${Config.webserverPublicUrl}/api/o2tv/stream/${this.id}`

    // TODO: improve this later on
    async fetchMultiDimension(mdId) {
        const mdEpg = await this.o2tv.getApi().getEPGInfo(mdId);
        const mds = [];

        if (!mdEpg) {
            return mds;
        }

        for (const epgItem of mdEpg) {
            const externalIds = [];

            if (!epgItem.tags.MosaicChannelsInfo) {
                continue;
            }

            for (const mdItem of epgItem.tags.MosaicChannelsInfo.objects) {
                const externalId = mdItem.value.match(/ProgramExternalID=(\d+)/)[1];
                if (!externalId) {
                    Logger.debug(Logger.Type.O2TV, `MD ${epgItem.id} has invalid external ID`);
                    continue;
                }

                externalIds.push(externalId);
            }

            for (const externalId of externalIds) {
                const epg = await this.o2tv.getApi().getMDEPGInfo(externalId);
                if (epg.length <= 0) {
                    Logger.debug(Logger.Type.O2TV, `MD ${epgItem.id} has no EPG`);
                    continue;
                }

                const epgItem = epg[0];
                mds.push(new O2TVMDStream({
                    id: epgItem.id,
                    name: epgItem.name,
                    description: epgItem.description,
                    images: epgItem.images,
                    startts: epgItem.startDate,
                    endts: epgItem.endDate,
                    channel: {
                        id: this.id,
                        name: this.name,
                        logo: this.logo,
                        number: this.number
                    }
                }));
            }
        }

        return mds;
    }
}