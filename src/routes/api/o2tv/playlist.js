const Application = require("../../../lib/Application");
const { O2TVAuthenticationError, O2TVApiError } = require("../../../lib/o2tv/O2TVErrors");
const ApiResponse = require("../../../lib/webserver/ApiResponse");
const WebRoute = require("../../../lib/webserver/WebRoute");

module.exports = class {
    /**
     * Constructs an instance of SetupHandler.
     * 
     * @param {Application} application - The Application instance.
     */
    constructor(application) {
        this.application = application;
        this.url = WebRoute.ApiO2TVPlaylist;
    }

    /**
     * Sets up the API route.
     * 
     * @param {import("express").Express} express - The Express app instance.
     */
    async setup(express) {
        express.get(this.url, async (req, res) => {
            try {
                const { id, md } = req.query;

                const channelsList = this.application.getO2TV().getChannels().getChannelsList('number');
                const liveEpg = await this.application.getO2TV().getEpg().getLiveEpg();

                let playlistM3U = "#EXTM3U";

                for (const channelNum of Object.keys(channelsList)) {
                    const channel = channelsList[channelNum];

                    // If channel doesn't have EPG
                    if (!liveEpg[channel.getID()]) 
                        continue;

                    // If id is specified and it doesn't match the channel's id
                    if (id && channel.getID() != id) 
                        continue;
                    
                    // If channel is a Multi-dimension stream
                    if (liveEpg[channel.getID()].md) {
                        const multiDimension = await channel.fetchMultiDimension(liveEpg[channel.getID()]);

                        multiDimension.map((data) => {
                            if (md && data.id != md) 
                                return;

                            playlistM3U += `\n#EXTINF:-1 catchup=\"append\" catchup-days=\"7\" catchup-source=\"&catchup_start_ts={utc}&catchup_end_ts={utcend}\" tvg-id=\"${channel.getNumber()}\" tvh-epg=\"0\" tvg-logo=\"${channel.getLogo()}\",${channel.getName()} MD: ${data.name}\n${this.application.getConfig().WebServer_PublicURL}/api/o2tv/stream?id=${channel.getID()}&md=${data.id}`;
                        });

                        continue;
                    }

                    playlistM3U += `\n#EXTINF:-1 catchup=\"append\" catchup-days=\"7\" catchup-source=\"&catchup_start_ts={utc}&catchup_end_ts={utcend}\" tvg-id=\"${channel.getNumber()}\" tvh-epg=\"0\" tvg-logo=\"${channel.getLogo()}\",${channel.getName()}\n${this.application.getConfig().WebServer_PublicURL}/api/o2tv/stream?id=${channel.getID()}`
                }

                res.setHeader("Content-Type", "text/plain")
                    .setHeader("Content-Disposition", "attachment; filename=\"playlist.m3u\"")
                    .send(playlistM3U);
            } catch (error) {
                let response;

                if (error instanceof O2TVAuthenticationError) 
                    response = ApiResponse.O2TVAuthenticationFailed;

                if (error instanceof O2TVApiError) 
                    response = ApiResponse.O2TVApiError;
                
                if (!response) 
                    response = ApiResponse.ServerError;
                
                this.application.getConsoleLog().error("WebServer", error);
                response.send(res);
            }
        });
    }
};
