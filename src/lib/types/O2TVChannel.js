const Config = require("../Config");
const O2TVMDChannel = require("./O2TVMDChannel");

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
        this.logo = data.images.find(image => image.ratio === "16x9").url || `${data.images[0].url}/height/320/width/480`;
    }

    getPlaylistM3U(md) {
        let playlistM3U = `#EXTINF:-1 catchup="append" catchup-days="7" catchup-source="&catchup_start_ts={utc}&catchup_end_ts={utcend}" tvg-id="${this.number}" tvh-epg="0" tvg-logo="${this.logo}",${this.name}`;

        if (md) {
            // TODO: maybe smth like MD: ID?
            playlistM3U += ` MD: ${md.name}`;
        }

        playlistM3U += `\n${Config.webserverPublicUrl}/api/o2tv/stream/${this.id}`;
        if (md) {
            playlistM3U += `/${md.id}`;
        }

        return playlistM3U;
    }

    // TODO: improve this later on
    async fetchMultiDimension(channelEpg) {
        let mds = [];

        // move this to O2TVAPI.js
        const mdEpg = await this.o2tv.getApi().callList({
            language: "ces",
            ks: this.o2tv.getSession().getKS(),
            filter: {
                objectType: "KalturaSearchAssetFilter",
                orderBy: "START_DATE_ASC",
                kSql: `(and IsMosaicEvent='1' MosaicInfo='mosaic' (or externalId='${channelEpg.md}'))`,
            },
            pager: {
                objectType: "KalturaFilterPager",
                pageSize: 200,
                pageIndex: 1,
            },
            clientTag: this.o2tv.getClientTag(),
            apiVersion: this.o2tv.getApiVersion(),
        });

        for (const mdEpgItem of mdEpg) {
            const mdIDs = [];

            if (!mdEpgItem.tags.MosaicChannelsInfo)
                continue;

            for (const mdItem of mdEpgItem.tags.MosaicChannelsInfo.objects)
                if (mdItem.value.includes('ProgramExternalID'))
                    mdIDs.push(mdItem.value.split('ProgramExternalID=')[1]);

            for (const mdID of mdIDs) {
                const epg = await this.o2tv.getApi().callList({
                    language: "ces",
                    ks: this.o2tv.getSession().getKS(),
                    filter: {
                        objectType: "KalturaSearchAssetFilter",
                        orderBy: "START_DATE_ASC",
                        kSql: `(or externalId='${mdID}')`,
                    },
                    pager: {
                        objectType: "KalturaFilterPager",
                        pageSize: 200,
                        pageIndex: 1,
                    },
                    clientTag: this.o2tv.getClientTag(),
                    apiVersion: this.o2tv.getApiVersion(),
                });

                if (epg.length <= 0) 
                    continue;

                const epgItem = epg[0];
                mds.push(new O2TVMDChannel({
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