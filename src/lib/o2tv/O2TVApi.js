const axios = require("axios");
const { O2TVApiError } = require("./O2TVErrors");

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
            if (!error.response) {
                throw new O2TVApiError(error.message);
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
                headers: this.o2tv.getApi().getHeaders()
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
}