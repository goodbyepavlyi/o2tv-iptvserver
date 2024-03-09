const Config = require("../Config");
const Logger = require("../utils/Logger");
const { O2TVAuthenticationError, O2TVError } = require("./O2TVErrors");

module.exports = class O2TVSession {
    /**
     * @param {import("./O2TV")} o2tv 
     */
    constructor(o2tv) {
        this.o2tv = o2tv;
        this.valid_to = -1;
    }

    getKS = () => this.ks;

    createDeviceId = () => [...Array(15)]
        .map(() => Math.random().toString(36)[2])
        .join("")
        .toUpperCase();

    anonymousLogin = () => new Promise(async (resolve, reject) => {
        const data = await this.o2tv.getApi().call({
            url: `https://${this.o2tv.getPartnerId()}.frp1.ott.kaltura.com/api_v3/service/ottuser/action/anonymousLogin?format=1&clientTag=${this.o2tv.getClientTag()}`,
            method: "POST",
            data: {
                language: "*",
                partnerId: this.o2tv.getPartnerId(),
                clientTag: this.o2tv.getClientTag(),
                apiVersion: this.o2tv.getApiVersion(),
            },
            headers: this.o2tv.getApi().getHeaders()
        });

        if (data.err || !data.result || !data.result.objectType || data.result.objectType != "KalturaLoginSession") {
            return reject(new O2TVError(data));
        }

        return resolve(data);
    })

    login = (username, password, deviceId) => new Promise(async (resolve, reject) => {
        try {
            const data = await this.o2tv.getApi().call({
                url: `https://login-a-moje.o2.cz/cas-external/v1/login`,
                method: "POST",
                data: {
                    username,
                    password,
                    udid: deviceId,
                    service: "https://www.new-o2tv.cz/",
                },
                headers: this.o2tv.getApi().getHeaders()
            });

            if (data.err || !data.jwt || !data.refresh_token) {
                return reject(new O2TVAuthenticationError(data));
            }

            resolve(data);
        } catch (error) {
            if (error.data && error.data.status == 401) {
                return reject(new O2TVAuthenticationError(error));
            }
            
            return reject(error);
        }
    })

    fetchServices = (jwtToken, ks) => new Promise(async (resolve, reject) => {
        const data = await this.o2tv.getApi().call({
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
        const data = await this.o2tv.getApi().call({
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
            headers: this.o2tv.getApi().getHeaders()
        });

        if (data.err || !data.result || !data.result.objectType || data.result.objectType  != "KalturaLoginResponse" || !data.result.loginSession) {
            return reject(new O2TVError(data));
        }

        return resolve(data);
    });

    async createSession() {
        try {
            const ks = await this.anonymousLogin()
                .then((data) => data.result.ks)
                .catch((error) => {
                    Logger.error(Logger.Type.O2TV, "An error occurred during anonymous login:", error);
                    throw error;
                });
    
            const jwtToken = await this.login(Config.o2tvUsername, Config.o2tvPassword, Config.o2tvDeviceId)
                .then((data) => data.jwt)
                .catch((error) => {
                    Logger.error(Logger.Type.O2TV, "An error occurred during login:", error);
                    throw error;
                });
    
            const services = await this.fetchServices(jwtToken, ks)
                .then((data) => JSON.parse(data.result.adapterData.service_list.value)["ServicesList"])
                .catch((error) => {
                    Logger.error(Logger.Type.O2TV, "An error occurred during fetching services:", error);
                    throw error;
                });
            
            const ksServices = services.reduce((acc, service) => {
                Object.entries(service).forEach(([id, code]) => acc[code] = id);
                return acc;
            }, {});
    
            if (!ksServices || Object.keys(ksServices).length < 1) {
                Logger.error(Logger.Type.O2TV, "No services found (possible that account doesn't have any?).");
                throw new O2TVError("No services found.");
            }
    
            for (const [ ksCode, ksName ] of Object.entries(ksServices)) {
                const data = await this.kalturaLogin(Config.o2tvDeviceId, jwtToken, ks, ksCode)
                    .catch((error) => {
                        Logger.error(Logger.Type.O2TV, `An error occured during Kaltura login for service ${ksName}:`, error);
                        throw error;
                    });
                    
                if (!this.services) {
                    this.services = {};
                }

                this.services[ksCode] = {
                    ks_name: ksName,
                    ks_code: ksCode,
                    ks_expiry: data.result.loginSession.expiry,
                    ks_refresh_token: data.result.loginSession.refreshToken,
                    ks: data.result.loginSession.ks,
                    enabled: this.services[ksCode] ? this.services[ksCode].enabled : 0,
                };
            }
            
            for (const service of Object.keys(this.services))  {
                if (service in ksServices) {
                    continue;
                }

                delete this.services[service];
            }
            
            Logger.info(Logger.Type.O2TV, "Session created successfully.");
        } catch (error) {
            Logger.error(Logger.Type.O2TV, `An error occured while fetching services:`, error);
            throw error;
        }
    }

    /**
     * Loads the session data from storage.
     */
    async loadSession() {
        try {
            Logger.info(Logger.Type.O2TV, "Loading session...");
    
            if (!(Config.o2tvUsername && Config.o2tvPassword && Config.o2tvDeviceId)) {
                Logger.error(Logger.Type.O2TV, "Credentials not found!");
                return;
            }
    
            this.services = {};
            if (Config.o2tvServices) {
                Logger.debug(Logger.Type.O2TV, 'Loading session from config...');
    
                this.services = Config.o2tvServices;
                
                let reset = 0;
                for (const service of Object.values(this.services)) {
                    if (service.ks_expiry && service.ks_expiry > Math.floor(Date.now() / 1000)) {
                        continue;
                    }
    
                    if (reset != 0) {
                        continue;
                    }
    
                    await this.createSession();
                    reset = 1;
                }
            } else {
                await this.createSession();
            }
    
            let active;
            for (const service in this.services) {
                if (this.services[service].enabled != 1) 
                    continue;
    
                active = true;
                this.ks = this.services[service]["ks"];
            }

            if (active) {
                Logger.info(Logger.Type.O2TV, "Session loaded successfully.");
                await this.o2tv.channels.loadChannels();
                return true;
            } 
    
            for (const service in this.services) {
                if (active) {
                    continue;
                }

                active = true;
                this.ks = this.services[service]["ks"];
                this.services[service]["enabled"] = 1;
                this.saveSession();
            }
    
            Logger.info(Logger.Type.O2TV, "Session loaded successfully.");
            await this.o2tv.channels.loadChannels();
            return true;
        } catch (error) {
            Logger.error(Logger.Type.O2TV, "An error occured while loading session:", error);
        }
    }    

    /**
     * Saves the session data to storage.
     */
    saveSession() {
        Logger.debug(Logger.Type.O2TV, "Saving session...");
        Config.o2tvServices = this.services;
    }

    /**
     * Removes the session data.
     */
    removeSession() {
        Config.o2tvServices = {};
        this.valid_to = -1;
        this.createSession();
    }
}