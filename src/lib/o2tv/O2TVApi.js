const axios = require("axios");
const { O2TVApiError, O2TVError, O2TVAuthenticationError } = require("./O2TVErrors");

module.exports = class O2TVApi {
    /**
     * @param {import("./O2TV")} o2tv 
     */
    constructor(o2tv) {
        this.o2tv = o2tv;
        this.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:98.0) Gecko/20100101 Firefox/98.0", 
            "Accept-Encoding": "gzip", 
            "Accept": "*/*", 
            "Content-type": "application/json;charset=UTF-8", 
        };
    }

    getHeaders = () => this.headers;

    /**
     * @param {object} options
     * @param {string} options.url
     * @param {string} options.method
     * @param {object} options.data
     * @param {object} options.headers
     * @returns {Promise<object>}
     */
    async call(options) {
        if (options.data) {
            options.data = JSON.stringify(options.data);
        }

        try {
            const response = await axios({
                url: options.url, 
                method: options.method, 
                data: options.data, 
                headers: options.headers, 
            });

            return response.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status == 401) {
                    throw new O2TVAuthenticationError({ data: error.response.data });
                }
            }

            throw new O2TVApiError(error.message, error.response);
        }
    }

    async callList(data) {
        let result = [];
        let fetch = true;

        while (fetch) {
            const response = await this.call({
                url: `https://${this.o2tv.getPartnerId()}.frp1.ott.kaltura.com/api_v3/service/asset/action/list?format=1&clientTag=${this.o2tv.getClientTag()}`,
                method: "POST",
                data,
                headers: this.getHeaders()
            });

            if (response.err || response.error || !response.result || !response.result.hasOwnProperty('totalCount')) {
                fetch = false;
                throw new O2TVApiError(`Failed to fetch data from O2 TV. Error: ${JSON.stringify(response)}`, response);
            }

            const totalCount = response.result.totalCount;
            if (totalCount <= 0) {
                fetch = false;
                return;
            }
            
            for (const object of response.result.objects) {
                result.push(object);
            }
    
            if (totalCount == result.length) {
                fetch = false;
            }

            // let pager = response["pager"];
            // pager["pageIndex"] =+ 1;
            // response["pager"] = pager;
            data['pager']['pageIndex'] += 1;
        }

        return result;
    }

    /**
     * @returns {Promise<import("../types/Types").O2TVChannel[]>}
     */
    getChannels = () => this.callList({
        language: "ces",
        ks: this.o2tv.getSession().getKS(),
        filter: {
            objectType: "KalturaChannelFilter",
            kSql: "(and asset_type='607')",
            idEqual: 355960
        },
        pager: {
            objectType: "KalturaFilterPager",
            pageSize: 300,
            pageIndex: 1
        },
        clientTag: this.o2tv.getClientTag(),
        apiVersion: this.o2tv.getApiVersion()
    })

    anonymousLogin = () => new Promise(async (resolve, reject) => {
        const data = await this.call({
            url: `https://${this.o2tv.getPartnerId()}.frp1.ott.kaltura.com/api_v3/service/ottuser/action/anonymousLogin?format=1&clientTag=${this.o2tv.getClientTag()}`,
            method: "POST",
            data: {
                language: "*",
                partnerId: this.o2tv.getPartnerId(),
                clientTag: this.o2tv.getClientTag(),
                apiVersion: this.o2tv.getApiVersion(),
            },
            headers: this.getHeaders()
        });

        if (data.err || !data.result || data.result.objectType != "KalturaLoginSession") {
            reject(new O2TVApiError("An error occurred while attempting to login anonymously", data));
        }

        return resolve(data);
    });

    login = (username, password, deviceId) => new Promise(async (resolve, reject) => {
        try {
            const data = await this.call({
                url: `https://login-a-moje.o2.cz/cas-external/v1/login`,
                method: "POST",
                data: {
                    username,
                    password,
                    udid: deviceId,
                    service: "https://www.new-o2tv.cz/"
                },
                headers: this.getHeaders()
            });
    
            if (data.err || !data.jwt || !data.refresh_token) {
                return reject(new O2TVAuthenticationError({ data }));
            }
    
            return resolve(data);
        } catch (error) {
            if (error instanceof O2TVAuthenticationError) {
                return reject(error);
            }

            return reject(new O2TVError());
        }
    })

    fetchServices = (jwtToken, ks) => new Promise(async (resolve, reject) => {
        const data = await this.call({
            url: `https://${this.o2tv.getPartnerId()}.frp1.ott.kaltura.com/api/p/${this.o2tv.getPartnerId()}/service/CZ/action/Invoke`,
            method: "POST",
            data: {
                intent: "Service List",
                adapterData: [
                    {
                        _allowedEmptyArray: [],
                        _allowedEmptyObject: [],
                        _dependentProperties: {},
                        key: "access_token",
                        value: jwtToken,
                        relatedObjects: {}
                    },
                    {
                        _allowedEmptyArray: [],
                        _allowedEmptyObject: [],
                        _dependentProperties: {},
                        key: "pageIndex",
                        value: 0,
                        relatedObjects: {}
                    },
                    {
                        _allowedEmptyArray: [],
                        _allowedEmptyObject: [],
                        _dependentProperties: {},
                        key: "pageSize",
                        value: 100,
                        relatedObjects: {}
                    }
                ],
                ks
            },
            headers: this.o2tv.getApi().getHeaders()
        });

        if (data.err || !data.result || !data.result.adapterData || !data.result.adapterData.service_list) {
            return reject(new O2TVError(data));
        }

        return resolve(data);
    });

    kalturaLogin = (deviceId, jwtToken, ks, ksCode) => new Promise(async (resolve, reject) => {
        try {
            const data = await this.call({
                url: `https://${this.o2tv.getPartnerId()}.frp1.ott.kaltura.com/api_v3/service/ottuser/action/login?format=1&clientTag=${this.o2tv.getClientTag()}`,
                method: "POST",
                data: {
                    language: "ces",
                    ks,
                    partnerId: this.o2tv.getPartnerId(),
                    username: "NONE",
                    password: "NONE",
                    extraParams: {
                        token: {
                            objectType: "KalturaStringValue",
                            value: jwtToken
                        },
                        loginType: {
                            objectType: "KalturaStringValue",
                            value: "accessToken"
                        },
                        brandId: {
                            objectType: "KalturaStringValue",
                            value: 22
                        },
                        externalId: {
                            objectType: "KalturaStringValue",
                            value: ksCode
                        }
                    },
                    udid: deviceId,
                    clientTag: this.o2tv.getClientTag(),
                    apiVersion: this.o2tv.getApiVersion()
                },
                headers: this.getHeaders()
            });
    
            if (data.err || !data.result || data.result.objectType  != "KalturaLoginResponse" || !data.result.loginSession) {
                return reject(new O2TVError(data));
            }
    
            return resolve(data);
        } catch (error) {
            if (error instanceof O2TVError) {
                return reject(error);
            }

            return reject(new O2TVError());
        }
    });
}