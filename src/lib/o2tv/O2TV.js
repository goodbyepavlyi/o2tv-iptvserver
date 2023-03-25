const { default: axios } = require('axios');
const debug = require('debug')('O2TV');
const { O2TV_EMAIL, O2TV_PASSWORD } = require('../../config');
const Config = require('../Config');
const O2TVError = require('./O2TVError');

module.exports = class O2TV {
    /**
     * 
     * @param {Config} config 
     */
    constructor(config) {
        this.config = config;
        this.username = O2TV_EMAIL;
        this.password = O2TV_PASSWORD;
        this.deviceName = 'O2 TV IPTV Server';
        this.deviceId = this.config.getConfig()['o2tv_deviceid'] || (this.config.getConfig()['o2tv_deviceid'] = Math.random().toString(36).substring(2, 18));    
        this.config.__saveConfig(this.config.getConfig());
        this.token = this.config.getConfig()['o2tv_token'];
        this.subscription = this.config.getConfig()['o2tv_subscription'];

        this.headers = {
            'X-NanguTv-App-Version': 'Android#6.4.1',
            'User-Agent': 'Dalvik/2.1.0',
            'Connection': 'Keep-Alive',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'X-NanguTv-Device-Id': this.deviceId,
            'X-NanguTv-Device-Name': this.deviceName,
        };
    }

    async isAuthenticated() {
        const data = await this.getProfileInformation();
        console.log(data)
        return !!data.code && this.token && this.subscription;
    }

    async login() {
        debug('Initiating connection to O2 TV Service account..')
        const loginResponse = await axios.post('https://ottmediator.o2tv.cz/ottmediator-war/login',
            {
                username: this.username,
                password: this.password,
            },
            { headers: this.headers }
        ).then(res => {
            debug('Obtained O2 TV Service authentication token.')
            return res.data;
        })
        .catch(error => { throw new O2TVError(`Failed to retrieve O2 TV service access token: ${error.message}`, error.response.status, error.response.data) });

        let service = loginResponse.services[0];

        const loginChoiceServiceResponse = await axios.post('https://ottmediator.o2tv.cz/ottmediator-war/loginChoiceService',
            {
                service_id: service.service_id,
                remote_access_token: loginResponse.remote_access_token,
            },
            { headers: this.headers }
        ).then(res => res.data)
            .catch(error => { throw new O2TVError(`Failed to login to the O2 TV service: ${error.message}`, error.response.status, error.response.data) });

        const tokenResponse = await axios.post('https://oauth.o2tv.cz/oauth/token',
            {
                grant_type: 'remote_access_token',
                client_id: 'tef-web-portal-etnetera',
                client_secret: '2b16ac9984cd60dd0154f779ef200679',
                platform_id: '231a7d6678d00c65f6f3b2aaa699a0d0',
                language: 'cs',
                remote_access_token: loginResponse.remote_access_token,
                authority: 'tef-sso',
                isp_id: '1',
            },
            { headers: this.headers }
        ).then(res => res.data)
            .catch(error => { throw new O2TVError(`Failed to login to the O2 TV service: ${error.message}`, error.response.status, error.response.data) });

        let result = await this.config.getConfig();
        result['o2tv_token'] = this.token = tokenResponse.access_token;
        
        const profileInfoResponse = await this.getProfileInformation();
        result['o2tv_subscription'] = this.subscription = profileInfoResponse['code'];

        await this.config.__saveConfig(result);
        debug('Logged in to O2 TV Service Account')
    }

    async getProfileInformation() {
        const data = await axios.get('https://api.o2tv.cz/unity/api/v1/user/profile',
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:75.0) Gecko/20100101 Firefox/75.0',
                    'Content-Type': 'application/json',
                    'x-o2tv-access-token': this.token,
                    'x-o2tv-device-id': this.deviceId,
                    'x-o2tv-device-name': this.deviceName,
                },
            }
        ).then(res => res.data)
            .catch(error => { throw new O2TVError(`Failed to retrieve profile information from the O2 TV service: ${error.message}`, error.response.status, error.response.data) });

        return data;
    }

    async getChannelDetails() {
        const data = await axios.get('https://api.o2tv.cz/unity/api/v1/channels/')
            .then(res => res.data)
            .catch(error => { throw new O2TVError(`Failed to retrieve channel details from the O2 TV service: ${error.message}`, error.response.status, error.response.data) });

        return data['result'];
    }

    async getStream(id) {
        console.log(this);
        const data = await axios.get(`https://app.o2tv.cz/sws/server/streaming/uris.json?serviceType=LIVE_TV&deviceType=STB&streamingProtocol=HLS&subscriptionCode=${this.subscription}&channelKey=${encodeURIComponent(id.split('.')[0])}&encryptionType=NONE`,
            {
                headers: {
                    'X-NanguTv-App-Version': 'Android#6.4.1',
                    'User-Agent': 'Dalvik/2.1.0',
                    'Connection': 'Keep-Alive',
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'X-NanguTv-Device-Id': 'b7pzci54mrzbcvy',
                    'X-NanguTv-Device-Name': 'TV-BOX',
                    'X-NanguTv-Access-Token': this.token,
                }
            }).then(res => res.data)
            .catch(error => { throw new O2TVError(`Failed to retrieve channel stream from the O2 TV service: ${error.message}`, error.response.status, error.response.data) });

        const url = data.uris.map(uri => {
            if (uri.resolution !== 'HD') return;

            return uri.uri;
        }).find(u => u !== undefined) || 'http://sledovanietv.sk/download/noAccess-cs.m3u8';

        return url;
    }

    async getCatchup(id, utc, utcend) {
        let end = utcend === '' ? parseInt(utc) + 18000 : utcend;
        let now = parseInt(new Date().getTime() / 1000);
        if (end > now)
            end = now - 200;
        
        const data = axios.get(`https://app.o2tv.cz/sws/server/streaming/uris.json?serviceType=TIMESHIFT_TV&deviceType=STB&streamingProtocol=HLS&subscriptionCode=${this.subscription}&fromTimestamp=${utc}000&toTimestamp=${end}000&channelKey=${encodeURIComponent(id.split('.')[0])}&encryptionType=NONE`,
            {
                headers: {
                    'X-NanguTv-App-Version': 'Android#6.4.1',
                    'User-Agent': 'Dalvik/2.1.0',
                    'Connection': 'Keep-Alive',
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'X-NanguTv-Device-Id': 'b7pzci54mrzbcvy',
                    'X-NanguTv-Device-Name': 'TV-BOX',
                    'X-NanguTv-Access-Token': this.token,
                }
            }).then(res => res.data)
            .catch(error => { throw new O2TVError(`Failed to retrieve channel catchup from the O2 TV service: ${error.message}`, error.response.status, error.response.data) });

        return data.uris[0].uri || 'http://sledovanietv.sk/download/noAccess-cs.m3u8';
    }

    async refreshChannels() {
        const isAuthenticated = await this.isAuthenticated();

        if (!isAuthenticated)
            await this.login();

        const data = await this.getProfileInformation();
        const ottChannels = data['ottChannels']['live'];
        const channelDetails = await this.getChannelDetails();
        const channels = {};

        for (const channel of channelDetails) {
            const { channelKey, name, images: imageUrls } = channel.channel;

            if (!(ottChannels.includes(channelKey))) continue;

            let image;
            for (const url of Object.values(imageUrls).map(image => `https://assets.o2tv.cz${image.url}`)) {
                await axios.head(url)
                    .then(() => {
                        image = url;
                        return image;
                    })
                    .catch(error => console.log(`Invalid image URL: ${url}`));

                break;
            }

            channels[channelKey] = { name, image };
        }

        this.channels = channels;
    }
}