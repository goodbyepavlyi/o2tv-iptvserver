const O2TV = require("./O2TV");

module.exports = class O2TVEpg {
    /**
     * @param {import("./O2TV")} o2tv 
     */
    constructor(o2tv) {
        this.o2tv = o2tv;
    }

    getLiveEpg() {
        const currentTime = Math.floor(Date.now() / 1000);

        return this.callEpgAPI('channelId', {
            language: "ces",
            ks: this.o2tv.getSession().getKS(),
            filter: {
                objectType: "KalturaSearchAssetFilter",
                orderBy: "START_DATE_ASC",
                kSql: `(and start_date <= '${currentTime}' end_date  >= '${currentTime}' asset_type='epg' auto_fill= true)`
            },
            pager: {
                objectType: "KalturaFilterPager",
                pageSize: 500,
                pageIndex: 1
            },
            clientTag: this.o2tv.getClientTag(),
            apiVersion: this.o2tv.getApiVersion()
        });
    }
    
    getChannelEpg(id, fromTs, toTs) {
        return this.callEpgAPI('startts', {
            language: "ces",
            ks: this.o2tv.getSession().getKS(),
            filter: {
                objectType: "KalturaSearchAssetFilter",
                orderBy: "START_DATE_ASC",
                kSql: `(and linear_media_id:'${id}' start_date >= '${fromTs}' end_date  <= '${toTs}' asset_type='epg' auto_fill=true)`
            },
            pager: {
                objectType: "KalturaFilterPager",
                pageSize: 500,
                pageIndex: 1
            },
            clientTag: this.o2tv.getClientTag(),
            apiVersion: this.o2tv.getApiVersion()
        });
    }

    async callEpgAPI(key, data) {
        const epg = {};
        const result = await this.o2tv.getApi().callList(data);
        const channels = this.o2tv.getChannels().getChannelsList('id', false);

        // TODO: definitely there's a better way of doing whatever this is (tbh i don't even want to touch this)
        for (const item of result) {
            if ((item.objectType != 'KalturaProgramAsset' || item.objectType != 'KalturaRecordingAsset') && !item.linearAssetId) {
                continue;
            }

            let { id, linearAssetId: channelId, name: title, description, startDate: startts, endDate: endts, } = item;
            let cover = '';
            let poster = '';
            let imdb = '';
            let year = '';
            let contentType = '';
            let original = '';
            let genres = [];
            let cast = [];
            let directors = [];
            let writers = [];
            let country = '';

            let ratios = {
                '2x3': '/height/720/width/480',
                '3x2': '/height/480/width/720',
                '16x9': '/height/480/width/853'
            };

            if (item.images) {
                if (item.images.length > 0)
                    poster = item.images[0].url + ratios[item.images[0].ratio];

                if (item.images.length > 1)
                    cover = item.images[1].url + ratios[item.images[1].ratio];
            }

            let episodeNumber = -1;
            let seasonNumber = -1;
            let episodesInSeason = -1;
            let episodeName = '';
            let seasonName = '';
            let seriesName = '';
            let seriesId = '';
            let isSeries = false;

            if (item.metas) {
                if (item.metas.original_name)
                    original = item.metas.original_name.value;

                if (item.metas.imdb_id)
                    imdb = item.metas.imdb_id.value;

                if (item.metas.Year)
                    year = item.metas.Year;

                if (item.metas.ContentType)
                    contentType = item.metas.ContentType.value;

                // TV Show information
                if (item.metas.EpisodeNumber)
                    episodeNumber = item.metas.EpisodeNumber.value;

                if (item.metas.SeasonNumber)
                    seasonNumber = item.metas.SeasonNumber.value;

                if (item.metas.EpisodeInSeason)
                    episodesInSeason = item.metas.EpisodeInSeason.value;

                if (item.metas.EpisodeName)
                    episodeName = item.metas.EpisodeName.value;

                if (item.metas.SeasonName)
                    seasonName = item.metas.SeasonName.value;

                if (item.metas.SeriesName)
                    seriesName = item.metas.SeriesName.value;

                if (item.metas.IsSeries && item.metas.IsSeries.value == 1) {
                    isSeries = true;
                    seriesId = item.metas.SeriesID.value;
                } else {
                    isSeries = false;
                    seriesId = '';
                }

                if (item.tags) {
                    if (item.tags.Genre)
                        genres = item.tags.Genre.objects.map(genre => genre.value);

                    if (item.tags.PersonReference)
                        for (const person of item.tags.PersonReference.objects) {
                            const personData = person.value.split('|');
                            if (personData.length < 3)
                                personData.push('');

                            cast.push([
                                personData[1], personData[2]
                            ]);
                        }

                    if (item.tags.Director)
                        for (const director of item.tags.Director.objects)
                            directors.push(director.value);

                    if (item.tags.Writers)
                        for (const writer of item.tags.Writers.objects)
                            writers.push(writer.value);

                    if (item.tags.Country && item.tags.Country.value)
                        country = item.tags.Country.value;
                }

                // Multi-dimension plabyack
                let md;
                let mdIds = [];
                if (item.tags.MosaicInfo) {
                    for (const mdItem of item.tags.MosaicInfo.objects) {
                        if (!mdItem.value.includes("MosaicProgramExternalId"))
                            continue;

                        md = mdItem.value.replace('MosaicProgramExternalId=', '');

                        // TODO: move this to a separate function in O2TVApi.js but i'm not sure yet what this is doing
                        const result = await this.o2tv.getApi().callList({
                            language: "ces",
                            ks: this.o2tv.getSession().getKS(),
                            filter: {
                                objectType: "KalturaSearchAssetFilter",
                                orderBy: "START_DATE_ASC",
                                kSql: `(and IsMosaicEvent='1' MosaicInfo='mosaic' (or externalId='${md}'))`,
                            },
                            pager: {
                                objectType: "KalturaFilterPager",
                                pageSize: 200,
                                pageIndex: 1,
                            },
                            clientTag: this.o2tv.getClientTag(),
                            apiVersion: this.o2tv.getApiVersion(),
                        });

                        if (!result) {
                            continue;
                        }

                        if (result.length > 0 && result[0].name) {
                            title = result[0].name;
                        }
                    }
                }

                if (item.tags.MosaicChannelsInfo) {
                    for (const mdItem of item.tags.MosaicChannelsInfo.objects) {
                        if (!mdItem.value.includes("ProgramExternalID"))
                            continue;

                        const mdId = mdItem.value.split('ProgramExternalID=')[1];
                        mdIds.push(mdId);
                    }
                }

                let epgItem = { id, title, channelId, description, startts, endts, cover, poster, original, imdb, year, contentType, genres, cast, directors, writers, country, episodeNumber, seasonNumber, episodesInSeason, episodeName, seasonName, seriesName, isSeries, seriesId, md, mdIds, };
                if (key == 'startts') 
                    epg[startts] = epgItem;
                
                if (key == 'channelId') 
                    epg[channelId] = epgItem;
                
                if (key == 'id') 
                    epg[id] = epgItem;
                
                if (key == 'startts_channel_number') {
                    if (channels[channelId]) {
                        const combinedKey = parseInt(`${startts}${channels[channelId].channel_number.toString().padStart(5, '0')}`);
                        epg[combinedKey] = epgItem;
                    }
                }
            }
        }

        return epg;
    }
}