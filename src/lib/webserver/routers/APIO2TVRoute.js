const Config = require("../../Config");
const APIResponse = require("../../types/APIResponse");
const Route = require("../../types/Route");
const O2TVError = require("../../types/errors/O2TVError");
const Logger = require("../../utils/Logger");

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
                if (error instanceof O2TVError) {
                    if (error.type === O2TVError.Type.Unauthorized) {
                        return APIResponse.AUTHENTICATION_ERROR.send(res);
                    }
                }

                return next(error);
            }
        });

        this.router.get("/channels", async (req, res, next) => {
            try {
                const channelsList = await this.webserver.application.getO2TV().getChannels().getChannelsList('number');
                const liveEpg = await this.webserver.application.getO2TV().getEpg().getLiveEpg();

                let channels = [];
                for (const channel of Object.values(channelsList)) {
                    const channelEpg = liveEpg[channel.id];

                    // If channel doesn't have EPG, skip it
                    if (!channelEpg) {
                        Logger.debug(Logger.Type.O2TV, `Channel ${channel.id} doesn't have EPG, skipping...`);
                        continue;
                    }
                    
                    // If channel has Multi-dimension stream
                    if (channelEpg.md) {
                        Logger.debug(Logger.Type.O2TV, `Channel ${channel.id} has multi-dimension stream, fetching...`);
                        const mdStreams = await channel.fetchMultiDimension(channelEpg.md);

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
                            title: channelEpg.title,
                            description: channelEpg.description,
                            startts: channelEpg.startts,
                            endts: channelEpg.endts
                        }
                    });
                }

                return APIResponse.OK.send(res, { channels });
            } catch (error) {
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
                        Logger.debug(Logger.Type.O2TV, `Channel ${channel.id} doesn't have EPG, skipping...`);
                        continue;
                    }

                    // If id is specified and it doesn't match the channel's id
                    if (channelId && channel.id != channelId) {
                        continue;
                    }
                    
                    // If channel is streaming multi-dimensional stream
                    if (liveEpg[channel.id].md) {
                        (await channel.fetchMultiDimension(liveEpg[channel.id].md)).forEach(mdStream => {
                            if (mdId && mdStream.id != mdId) {
                                return;
                            }

                            playlistM3U.push(mdStream.getPlaylistM3U());
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
                return next(error);
            }
        });

        this.router.get("/stream/:channelId/:mdId?", async (req, res, next) => {
            try {
                const { channelId, mdId } = req.params;
                if (!channelId) {
                    return APIResponse.MalformedRequest.send(res);
                }

                const streamUrl = await this.webserver.application.getO2TV().getStream().playLive(channelId, mdId)
                const streamXML = await this.webserver.application.getO2TV().getStream().fetchStream(streamUrl);

                return res.set({
                    "Content-Type": "application/dash+xml",
                    "Content-Disposition": "attachment; filename=\"stream.xml\""
                }).send(streamXML);
            } catch (error) {
                if (error instanceof O2TVError) {
                    if (error.type === O2TVError.Type.ChannelWithoutEpg) {
                        return APIResponse.CHANNEL_WITHOUT_EPG.send(res);
                    }
                    
                    if (error.type === O2TVError.Type.AccountPlaybackConcurrencyLimitation) {
                        // TODO: respond with a image
                        return APIResponse.ACCOUNT_PLAYBACK_CONCURRENCY_LIMITATION.send(res);
                    }

                    Logger.error(Logger.Type.O2TV, "An error occurred while playing stream", error);
                    return APIResponse.O2TV_API_ERROR.send(res);
                }

                return next(error);
            }
        });
    }
}