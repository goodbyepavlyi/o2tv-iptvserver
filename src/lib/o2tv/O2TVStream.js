const O2TVError = require("../types/errors/O2TVError");
const Logger = require("../utils/Logger");
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
            throw new O2TVError({ message: "An error occurred while trying to play the stream", type: O2TVError.Type.Unknown, data });
        }

        if (data.result[1].messages && data.result[1].messages.length > 0 && data.result[1].messages[0].code == "ConcurrencyLimitation") {
            throw new O2TVError({ message: "Account has too many concurrent streams", type: O2TVError.Type.AccountPlaybackConcurrencyLimitation, data });
        }

        if (data.result[1].sources.length < 0) {
            throw new O2TVError({ message: "An error occurred while trying to play the stream", type: O2TVError.Type.Unknown, data });
        }
        
        if (data.result[0] && data.result[0].error && data.result[0].error.objectType && data.result[0].error.objectType == "KalturaAPIException") {
            throw new O2TVError({ message: data.result[0].error.message, type: O2TVError.Type.Unknown, data });
        }

        const urls = {};
        for (const stream of data.result[1].sources) {
            const license = stream.drm.find(drm => drm.scheme == "WIDEVINE_CENC")?.licenseURL;

            urls[stream["type"]] = {
                url: stream["url"],
                license
            };
        }

        if (urls["DASH"]) {
            const { url } = urls["DASH"];

            return await fetch(url)
                .then(response => response.url)
                .catch(error => {
                    throw new O2TVError({ message: `Failed to fetch URL: ${url}`, type: O2TVError.Type.Unknown, data: { data, error } });
                });
        }

        throw new O2TVError({ message: "No stream found", type: O2TVError.Type.Unknown, data });
    }

    async playLive(channelId, mdId) {
        const liveEpg = await this.o2tv.getEpg().getLiveEpg();
        const channelEpg = liveEpg[channelId];

        if (!channelEpg) {
            throw new O2TVError({ message: `Channel ${channelId} doesn't have EPG`, type: O2TVError.Type.ChannelWithoutEpg });
        }
        
        if (channelEpg.md && mdId) {
            return this.playStream({
                data: {
                    1: {
                        service: "asset",
                        action: "get",
                        id: mdId,
                        assetReferenceType: "epg_internal",
                        ks: this.o2tv.getSession().getKS()
                    },
                    2: {
                        service: "asset",
                        action: "getPlaybackContext",
                        assetId: mdId,
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

        return this.playStream({
            data: {
                1: {
                    service: "asset",
                    action: "get",
                    assetReferenceType: "media",
                    id: channelId,
                    ks: this.o2tv.getSession().getKS()
                },
                2: {
                    service: "asset",
                    action: "getPlaybackContext",
                    assetId: channelId,
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