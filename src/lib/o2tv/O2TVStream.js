const O2TVApiError = require("../types/errors/O2TVApiError");
const Utils = require("../utils/Utils");

module.exports = class O2TVStream {
    /**
     * @param {import("./O2TV")} o2tv 
     */
    constructor(o2tv) {
        this.o2tv = o2tv;
    }

    async fetchStream(streamUrl) {
        try {
            let xml = streamUrl;
            if (Utils.isURL(streamUrl)) {
                const response = await fetch(streamUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch URL: ${streamUrl}`);
                }

                xml = await response.text();
            }

            const newBaseURL = streamUrl.split('/manifest.mpd')[0];
            return xml.replace(/<BaseURL>.*<\/BaseURL>/, `<BaseURL>${newBaseURL}/</BaseURL>`);
        } catch (error) {
            throw new Error(`Failed to fetch or parse XML: ${error.message}`);
        }
    }


    async playStream(options) {
        const data = await this.o2tv.getApi().call({
            url: `https://${this.o2tv.getPartnerId()}.frp1.ott.kaltura.com/api_v3/service/multirequest`,
            method: "POST",
            headers: this.o2tv.getApi().getHeaders(),
            data: options.data,
        }).catch((error) => {
            throw error;
        });
        
        if (data.err || !data.result || data.result.length == 0 || !data.result[1].sources) {
            throw new O2TVApiError(`An error occurred while attempting to stream: ${JSON.stringify(data)}`, data);
        }

        if (data.result[1].messages && data.result[1].messages.length > 0 && data.result[1].messages[0].code == "ConcurrencyLimitation") {
            throw new O2TVApiError("Playback limit exceeded", data);
        }

        if (data.result[1].sources.length < 0) {
            throw new O2TVApiError("An error occurred while trying to play the content", data);
        }
        
        if (data.result[0] && data.result[0].error && data.result[0].error.objectType && data.result[0].error.objectType == "KalturaAPIException") {
            throw new O2TVApiError("An error occurred in the Kaltura API", data);
        }

        const urls = {};
        for (const stream of data.result[1].sources) {
            let license;
            for (const drm of stream.drm) 
                if (drm.scheme == "WIDEWINE_CENC") 
                    license = drm.licenseUrl;
            
            urls[stream["type"]] = {
                url: stream["url"],
                license,
            };
        }

        if (urls["DASH"]) {
            const { url } = urls["DASH"];

            return await fetch(url)
                .then((response) => response.url)
                .catch((error) => {
                    // i forgot i even left this here :D
                    // TODO: well this is very self-explanatory but yeah change it to something more meaningful
                    throw new O2TVApiError("mpd not found or smth blabla", error);
                });
        }

        throw new O2TVApiError("Unknown error occurred", data);
    }

    async playLive(id, md) {
        const liveEpg = await this.o2tv.getEpg().getLiveEpg();
        const epg = liveEpg[id];

        if (!epg) {
            throw new O2TVApiError('Unknown error occurred', epg);
        }
        
        // Multi dimension stream
        if (md && epg.md) {
            return this.playStream({
                data: {
                    1: {
                        service: "asset",
                        action: "get",
                        id: md,
                        assetReferenceType: "epg_internal",
                        ks: this.o2tv.getSession().getKS()
                    },
                    2: {
                        service: "asset",
                        action: "getPlaybackContext",
                        assetId: md,
                        assetType: "epg",
                        contextDataParams: {
                            objectType: "KalturaPlaybackContextOptions",
                            context: "START_OVER",
                            streamerType: "mpegdash",
                            urlType: "DIRECT"
                        },
                        ks: this.o2tv.getSession().getKS()
                    },
                    apiVersion: "7.8.1",
                    ks: this.o2tv.getSession().getKS(),
                    partnerId: this.o2tv.getPartnerId()
                }
            });
        }

        // Normal stream
        return this.playStream({
            data: {
                1: {
                    service: "asset",
                    action: "get",
                    assetReferenceType: "media",
                    id,
                    ks: this.o2tv.getSession().getKS()
                },
                2: {
                    service: "asset",
                    action: "getPlaybackContext",
                    assetId: id,
                    assetType: "media",
                    contextDataParams: {
                        objectType: "KalturaPlaybackContextOptions",
                        context: "PLAYBACK",
                        streamerType: "mpegdash",
                        urlType: "DIRECT"
                    },
                    ks: this.o2tv.getSession().getKS()
                },
                apiVersion: "7.8.1",
                ks: this.o2tv.getSession().getKS(),
                partnerId: this.o2tv.getPartnerId()
            }
        });
    }
}