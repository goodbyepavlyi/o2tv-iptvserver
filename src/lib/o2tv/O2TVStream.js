const { parseString } = require('xml2js');
const O2TV = require("./O2TV");
const { O2TVApiError } = require("./O2TVErrors");

module.exports = class O2TVStream {
    /**
     * 
     * @param {O2TV} o2tv 
     */
    constructor(o2tv) {
        this.o2tv = o2tv;
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
        
        if (data.err || !data.result || data.result.length == 0 || !data.result[1].sources)
            throw new O2TVApiError("An error occurred while attempting to stream", data);

        if (data.result[1].messages && data.result[1].messages.length > 0 && data.result[1].messages[0].code == "ConcurrencyLimitation") 
            throw new O2TVApiError("Playback limit exceeded", data);

        if (data.result[1].sources.length < 0) 
            throw new O2TVApiError("An error occurred while trying to play the content", data);
        
        if (data.result[0] && data.result[0].error && data.result[0].error.objectType && data.result[0].error.objectType == "KalturaAPIException")
            throw new O2TVApiError("An error occurred in the Kaltura API", data);

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
                    throw new O2TVApiError("mpd not found or smth blabla", error);
                });
        }

        throw new O2TVApiError("Unknown error occurred", data);
    }

    playLive(id) {
        return this.playStream({
            data: {
                1: {
                    service: "asset", 
                    action: "get", 
                    assetReferenceType: "media", 
                    id, 
                    ks: this.o2tv.getSession().getKS(), 
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
                        urlType: "DIRECT", 
                    },
                    ks: this.o2tv.getSession().getKS(), 
                },
                apiVersion: "7.8.1", 
                ks: this.o2tv.getSession().getKS(), 
                partnerId: this.o2tv.getPartnerId(), 
            }            
        });
    }

    getKeepaliveURL(url, mpd) {
        let keepalive;

        parseString(mpd, (error, result) => {
            if (error) 
                return console.error('Error parsing XML:', error);

            const adaptationSets = result.MPD.Period[0].AdaptationSet;
            for (const adaptationSet of adaptationSets) {
                if (adaptationSet.$.contentType != "video") 
                    continue;
                
                const maxBandwidth = adaptationSet.$.maxBandwidth;
                const segmentTemplates = adaptationSet.SegmentTemplate;
                for (const segmentTemplate of segmentTemplates) {
                    const timelines = segmentTemplate.SegmentTimeline;
                    
                    let ts;
                    for (const timeline of timelines) 
                        ts = timeline.S[0].$.t;
                    
                    const uri = 'dash/' + segmentTemplate.$.media.replace('&amp;', '&').replace('$RepresentationID$', 'video=' + maxBandwidth).replace('$Time$', ts);
                    keepalive = url.replace('manifest.mpd?bkm-query', uri);
                }
            }
        });

        return keepalive;
    }
}