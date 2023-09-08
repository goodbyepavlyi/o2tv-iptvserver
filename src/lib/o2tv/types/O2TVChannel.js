module.exports = class O2TVChannel {
    constructor(o2tv, data) {
        this.o2tv = o2tv;
        this.id = data.id;
        this.number = data.number;
        this.name = data.name;
        this.logo = data.logo;
    }

    getID() {
        return this.id;
    }

    getNumber() {
        return this.number;
    }

    getName() {
        return this.name;
    }

    getLogo() {
        return this.logo;
    }

    async fetchMultiDimension(channelEpg) {
        let mds = [];

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
                mds.push({
                    id: epgItem.id, 
                    name: epgItem.name, 
                    description: epgItem.description, 
                    images: epgItem.images, 
                    startts: epgItem.startDate,
                    endts: epgItem.endDate,
                });
            }
        }

        return mds;
    }
}