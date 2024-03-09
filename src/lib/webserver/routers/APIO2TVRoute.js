const Config = require("../../Config");
const { O2TVAuthenticationError, O2TVApiError } = require("../../o2tv/O2TVErrors");
const O2TVMPD = require("../../o2tv/O2TVMPD");
const APIResponse = require("../../types/APIResponse");
const Route = require("../../types/Route");
const ApiResponse = require("../ApiResponse");

module.exports = class APIO2TVRoute extends Route {
    constructor(webserver) {
        super(webserver);
    }
    
    loadRoutes() {
        this.router.post("/login", async (req, res, next) => {
            try {
                const { username, password } = req.body;
                if (!(username && password)) {
                    return ApiResponse.MalformedRequest.send(res);
                }

                await this.webserver.application.getO2TV().getSession().login(username, password, null)
                    .then(async () => {
                        Config.o2tvUsername = username;
                        Config.o2tvPassword = password;
                        Config.o2tvDeviceId = this.webserver.application.getO2TV().getSession().createDeviceId();

                        await this.webserver.application.getO2TV().getSession().loadSession()
                            .then(() => ApiResponse.Success.send(res));
                    });
            } catch (error) {
                if (error instanceof O2TVAuthenticationError) {
                    return APIResponse.AUTHENTICATION_ERROR.send(res);
                }
                
                if (error instanceof O2TVApiError) {
                    return APIResponse.O2TV_API_ERROR.send(res);
                }

                return next(error);
            }
        });

        this.router.get("/channels", async (req, res, next) => {
            try {
                const channelsList = this.webserver.application.getO2TV().getChannels().getChannelsList('number');
                const liveEpg = await this.webserver.application.getO2TV().getEpg().getLiveEpg();

                const channels = [];

                for (const channelNum of Object.keys(channelsList)) {
                    const channel = channelsList[channelNum];

                    // If channel doesn't have EPG
                    if (!liveEpg[channel.getID()]) 
                        continue;
                    
                    // If channel is a Multi-dimension stream
                    if (liveEpg[channel.getID()].md) {
                        const mdStreams = await channel.fetchMultiDimension(liveEpg[channel.getID()]);

                        for (const mdStream of mdStreams) {
                            channels.push({
                                channel: {
                                    id: channel.getID(),
                                    name: channel.getName(),
                                    logo: channel.getLogo(),
                                },
                                md: {
                                    id: mdStream.id,
                                    name: mdStream.name,
                                    description: mdStream.description,
                                },
                                epg: {
                                    title: mdStream.name,
                                    description: mdStream.description,
                                    startts: mdStream.startts,
                                    endts: mdStream.endts,
                                }
                            });
                        }

                        continue;
                    }

                    channels.push({
                        channel: {
                            id: channel.getID(),
                            name: channel.getName(),
                            logo: channel.getLogo(),
                        },
                        epg: {
                            title: liveEpg[channel.getID()].title,
                            description: liveEpg[channel.getID()].description,
                            startts: liveEpg[channel.getID()].startts,
                            endts: liveEpg[channel.getID()].endts,
                        }
                    });
                }

                return APIResponse.OK.send(res, { channels });
            } catch (error) {
                if (error instanceof O2TVAuthenticationError) {
                    return APIResponse.AUTHENTICATION_ERROR.send(res);
                }
                
                if (error instanceof O2TVApiError) {
                    return APIResponse.O2TV_API_ERROR.send(res);
                }
                
                return next(error);
            }
        });

        this.router.get("/playlist", async (req, res, next) => {
            try {
                const { id, md } = req.query;

                const channelsList = this.webserver.application.getO2TV().getChannels().getChannelsList('number');
                const liveEpg = await this.webserver.application.getO2TV().getEpg().getLiveEpg();

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

                            playlistM3U += `\n#EXTINF:-1 catchup=\"append\" catchup-days=\"7\" catchup-source=\"&catchup_start_ts={utc}&catchup_end_ts={utcend}\" tvg-id=\"${channel.getNumber()}\" tvh-epg=\"0\" tvg-logo=\"${channel.getLogo()}\",${channel.getName()} MD: ${data.name}\n${Config.webserverPublicUrl}/api/o2tv/stream?id=${channel.getID()}&md=${data.id}`;
                        });

                        continue;
                    }

                    playlistM3U += `\n#EXTINF:-1 catchup=\"append\" catchup-days=\"7\" catchup-source=\"&catchup_start_ts={utc}&catchup_end_ts={utcend}\" tvg-id=\"${channel.getNumber()}\" tvh-epg=\"0\" tvg-logo=\"${channel.getLogo()}\",${channel.getName()}\n${Config.webserverPublicUrl}/api/o2tv/stream?id=${channel.getID()}`
                }

                res.setHeader("Content-Type", "text/plain")
                    .setHeader("Content-Disposition", "attachment; filename=\"playlist.m3u\"")
                    .send(playlistM3U);
            } catch (error) {
                if (error instanceof O2TVAuthenticationError) {
                    return APIResponse.AUTHENTICATION_ERROR.send(res);
                }
                
                if (error instanceof O2TVApiError) {
                    return APIResponse.O2TV_API_ERROR.send(res);
                }

                return next(error);
            }
        });

        this.router.get("/stream", async (req, res, next) => {
            try {
                const { id, md } = req.query;
                if (!id) {
                    return ApiResponse.MalformedRequest.send(res);
                }
                
                await this.webserver.application.getO2TV().getStream().playLive(id, md)
                    .then(async (streamUrl) => {
                        const mpd = new O2TVMPD(streamUrl);
                        const streamXML = await mpd.getXML();

                        res.set('Content-Type', 'application/dash+xml')
                            .send(streamXML);
                    });
            } catch (error) {
                if (error instanceof O2TVAuthenticationError) {
                    return APIResponse.AUTHENTICATION_ERROR.send(res);
                }
                
                if (error instanceof O2TVApiError) {
                    return APIResponse.O2TV_API_ERROR.send(res);
                }

                return next(error);
            }
        });
    }
}