const Config = require("../../Config");
const APIResponse = require("../../types/APIResponse");
const Route = require("../../types/Route");
const O2TVApiError = require("../../types/errors/O2TVApiError");
const O2TVAuthenticationError = require("../../types/errors/O2TVAuthenticationError");

module.exports = class APIO2TVRoute extends Route {
    constructor(webserver) {
        super(webserver);
    }
    
    loadRoutes() {
        this.router.post("/login", async (req, res, next) => {
            try {
                const { username, password } = req.body;
                if (!(username && password)) {
                    return APIResponse.MISSING_REQUIRED_VALUES.send(res);
                }
                
                await this.webserver.application.getO2TV().getApi().login(username, password, null);
                Config.o2tvUsername = username;
                Config.o2tvPassword = password;
                Config.o2tvDeviceId = this.webserver.application.getO2TV().getSession().createDeviceId();

                await this.webserver.application.getO2TV().getSession().loadSession();
                return APIResponse.OK.send(res);
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
                for (const channel of Object.values(channelsList)) {
                    // If channel doesn't have EPG, skip it
                    if (!liveEpg[channel.id]) {
                        continue;
                    }
                    
                    // If channel has Multi-dimension stream
                    if (liveEpg[channel.id].md) {
                        const mdStreams = await channel.fetchMultiDimension(liveEpg[channel.id]);

                        for (const mdStream of mdStreams) {
                            channels.push({
                                channel: {
                                    id: channel.id,
                                    name: channel.name,
                                    logo: channel.logo
                                },
                                md: {
                                    id: mdStream.id,
                                    name: mdStream.name,
                                    description: mdStream.description
                                },
                                epg: {
                                    title: mdStream.name,
                                    description: mdStream.description,
                                    startts: mdStream.startts,
                                    endts: mdStream.endts
                                }
                            });
                        }

                        continue;
                    }

                    channels.push({
                        channel: {
                            id: channel.id,
                            name: channel.name,
                            logo: channel.logo
                        },
                        epg: {
                            title: liveEpg[channel.id].title,
                            description: liveEpg[channel.id].description,
                            startts: liveEpg[channel.id].startts,
                            endts: liveEpg[channel.id].endts
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

        this.router.get('/playlist/:channelId?/:mdId?', async (req, res, next) => {
            try {
                const { channelId, mdId } = req.params;
                const channelsList = await this.webserver.application.getO2TV().getChannels().getChannelsList("number");
                const liveEpg = await this.webserver.application.getO2TV().getEpg().getLiveEpg();

                let playlistM3U = ["#EXTM3U"];
                for (const channelNum of Object.keys(channelsList)) {
                    const channel = channelsList[channelNum];

                    // If channel doesn't have EPG
                    if (!liveEpg[channel.id]) {
                        continue;
                    }

                    // If id is specified and it doesn't match the channel's id
                    if (channelId && channel.id != channelId) {
                        continue;
                    }
                    
                    // If channel is a Multi-dimension stream
                    if (liveEpg[channel.id].md) {
                        (await channel.fetchMultiDimension(liveEpg[channel.id])).forEach(stream => {
                            if (mdId && stream.id != mdId) {
                                return;
                            }

                            playlistM3U.push(stream.getPlaylistM3U(stream));
                        });

                        continue;
                    }

                    playlistM3U.push(channel.getPlaylistM3U());
                }

                return res.set({
                    "Content-Type": "text/plain",
                    "Content-Disposition": "attachment; filename=\"playlist.m3u\""
                }).send(playlistM3U.join("\n"));
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

        this.router.get("/stream/:channelId/:mdId?", async (req, res, next) => {
            try {
                const { channelId, mdId } = req.params;
                if (!channelId) {
                    return ApiResponse.MalformedRequest.send(res);
                }
                
                const streamUrl = await this.webserver.application.getO2TV().getStream().playLive(channelId, mdId)
                const streamXML = await this.webserver.application.getO2TV().getStream().fetchStream(streamUrl);

                return res.set({
                    "Content-Type": "application/dash+xml",
                    "Content-Disposition": "attachment; filename=\"stream.xml\""
                }).send(streamXML);
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