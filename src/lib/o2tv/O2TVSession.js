const O2TV = require("./O2TV");
const { O2TVAuthenticationError, O2TVError } = require("./O2TVErrors");

module.exports = class O2TVSession {
    /**
     * 
     * @param {O2TV} o2tv 
     */
    constructor(o2tv) {
        this.o2tv = o2tv;

        this.valid_to = -1;
    }

    getKS() {
        return this.ks;
    }

    createDeviceId() {
        return [...Array(15)]
            .map(() => Math.random().toString(36)[2])
            .join("")
            .toUpperCase();
    }

    anonymousLogin() {
        return new Promise(async (resolve, reject) => {
            const data = await this.o2tv.getApi().call({
                url: `https://${this.o2tv.getPartnerId()}.frp1.ott.kaltura.com/api_v3/service/ottuser/action/anonymousLogin?format=1&clientTag=${this.o2tv.getClientTag()}`,
                method: "POST",
                data: {
                    language: "*",
                    partnerId: this.o2tv.getPartnerId(),
                    clientTag: this.o2tv.getClientTag(),
                    apiVersion: this.o2tv.getApiVersion(),
                },
                headers: this.o2tv.getApi().getHeaders(),
            });

            if (data.err || !data.result || !data.result.objectType || data.result.objectType != "KalturaLoginSession")
                return reject(new O2TVError(data));

            return resolve(data);
        });
    }

    login(username, password, deviceId) {
        return new Promise(async (resolve, reject) => {
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
                    headers: this.o2tv.getApi().getHeaders(), 
                });
    
                if (data.err || !data.jwt || !data.refresh_token) 
                    return reject(new O2TVAuthenticationError(data));
    
                resolve(data);
            } catch (error) {
                if (error.data && error.data.status == 401) 
                    return reject(new O2TVAuthenticationError(error));
                
                return reject(error);
            }
    
        });
    }

    fetchServices(jwtToken, ks) {
        return new Promise(async (resolve, reject) => {
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
                            relatedObjects: {},
                        },
                        {
                            _allowedEmptyArray: [],
                            _allowedEmptyObject: [],
                            _dependentProperties: {},
                            key: "pageIndex",
                            value: 0,
                            relatedObjects: {},
                        },
                        {
                            _allowedEmptyArray: [],
                            _allowedEmptyObject: [],
                            _dependentProperties: {},
                            key: "pageSize",
                            value: 100,
                            relatedObjects: {},
                        }
                    ],
                    ks,
                },
                headers: this.o2tv.getApi().getHeaders(),
            });

            if (data.err || !data.result || !data.result.adapterData || !data.result.adapterData.service_list)
                return reject(new O2TVError(data));

            return resolve(data);
        });
    }

    kalturaLogin(deviceId, jwtToken, ks, ksCode) {
        return new Promise(async (resolve, reject) => {
            const data = await this.o2tv.getApi().call({
                url: `https://${this.o2tv.getPartnerId()}.frp1.ott.kaltura.com/api_v3/service/ottuser/action/login?format=1&clientTag=${this.o2tv.getClientTag()}`,
                method: "POST",
                data: {
                    language: "ces",
                    ks: ks,
                    partnerId: this.o2tv.getPartnerId(),
                    username: "NONE",
                    password: "NONE",
                    extraParams: {
                        token: {
                            objectType: "KalturaStringValue",
                            value: jwtToken,
                        },
                        loginType: {
                            objectType: "KalturaStringValue",
                            value: "accessToken",
                        },
                        brandId: {
                            objectType: "KalturaStringValue",
                            value: 22,
                        },
                        externalId: {
                            objectType: "KalturaStringValue",
                            value: ksCode,
                        }
                    },
                    udid: deviceId,
                    clientTag: this.o2tv.getClientTag(),
                    apiVersion: this.o2tv.getApiVersion(),
                },
                headers: this.o2tv.getApi().getHeaders(),
            });

            if (data.err || !data.result || !data.result.objectType || data.result.objectType  != "KalturaLoginResponse" || !data.result.loginSession)
                return reject(new O2TVError(data));

            return resolve(data);
        });
    }

    async createSession() {
        try {
            const { O2TV_Username: username, O2TV_Password: password, O2TV_DeviceId: deviceId } = this.o2tv.getApplication().getConfig();
    
            this.o2tv.getApplication().getConsoleLog().debug("O2TV", `Getting user credentials... ${JSON.stringify({ username, password, deviceId })}`);
    
            const anonymousLogin = await this.anonymousLogin()
                .then((data) => data.result)
                .catch((error) => {
                    this.o2tv.getApplication().getConsoleLog().error("O2TV", `Error during anonymous login: ${error}`);
                    throw error;
                });
    
            const ks = anonymousLogin.ks;
    
            const login = await this.login(username, password, deviceId)
                .catch((error) => {
                    this.o2tv.getApplication().getConsoleLog().error("O2TV", `Error during login: ${error}`);
                    throw error;
                });
    
            const jwtToken = login.jwt;
    
            const services = await this.fetchServices(jwtToken, ks)
                .then((data) => JSON.parse(data.result.adapterData.service_list.value)["ServicesList"])
                .catch((error) => {
                    this.o2tv.getApplication().getConsoleLog().error("O2TV", `Error fetching services: ${error}`);
                    throw error;
                });
    
            let ks_codes = {};
            let ks_names = {};
    
            for (const service of services) {
                for (const id in service) {
                    ks_codes[service[id]] = service[id];
                    ks_names[service[id]] = id;
                }
            }
    
            if (!ks_codes || Object.entries(ks_codes).length < 1) {
                this.o2tv.getApplication().getConsoleLog().error("O2TV", "No KS codes found.");
                throw new O2TVError();
            }
    
            for (const service in ks_codes) {
                const ksCode = ks_codes[service];
                const data = await this.kalturaLogin(deviceId, jwtToken, ks, ksCode)
                    .catch((error) => {
                        this.o2tv.getApplication().getConsoleLog().error("O2TV", `Error during Kaltura login for service ${service}: ${error}`);
                        throw error;
                    });
    
                if (!this.services) 
                    this.services = {};

                this.services[service] = {
                    ks_name: ks_names[service],
                    ks_code: ks_codes[service],
                    ks_expiry: data.result.loginSession.expiry,
                    ks_refresh_token: data.result.loginSession.refreshToken,
                    ks: data.result.loginSession.ks,
                    enabled: this.services[service] ? this.services[service].enabled : 0,
                };
            }
    
            for (const service of Object.keys(this.services)) 
                if (!(service in ks_codes)) 
                    delete this.services[service];
            
            this.o2tv.getApplication().getConsoleLog().info("O2TV", `Fetched services ${JSON.stringify(this.services)}`);
            return;
        } catch (error) {
            this.o2tv.getApplication().getConsoleLog().error("O2TV", `Error while fetching services: ${error}`);
            throw error;
        }
    }

    /**
     * Loads the session data from storage.
     */
    async loadSession() {
        try {
            this.o2tv.getApplication().getConsoleLog().info("O2TV", "Loading session...");
    
            const { O2TV_Username: username, O2TV_Password: password, O2TV_DeviceId: deviceId } = this.o2tv.getApplication().getConfig();
            if (!(username && password && deviceId)) {
                this.o2tv.getApplication().getConsoleLog().error("O2TV", "Credentials not found!");
                return;
            }
    
            const services = this.o2tv.getApplication().getConfig().O2TV_Services;
            this.services = null;
    
            if (services) {
                this.o2tv.getApplication().getConsoleLog().debug("O2TV", `Loaded services: ${JSON.stringify(services)}`);
    
                let reset = 0;
                this.services = {};
    
                for (const serviceId in services) {
                    const id = services[serviceId]["ks_code"];
                    this.services[id] = services[serviceId];
                }
    
                for (const serviceId in this.services) {
                    const service = this.services[serviceId];
    
                    if (service.ks_expiry && service.ks_expiry > Math.floor(Date.now() / 1000)) 
                        continue;
    
                    if (reset != 0) 
                        continue;
    
                    await this.createSession();
                    reset = 1;
                }
            } else {
                await this.createSession();
            }
    
            let active;
    
            for (const service in this.services) {
                if (this.services[service].enabled !== 1) 
                    continue;
    
                active = true;
                this.ks = this.services[service]["ks"];
            }
    
            if (active) {
                this.o2tv.getApplication().getConsoleLog().success("O2TV", "Session loaded successfully.");
                return;
            } 
    
            for (const service in this.services) {
                if (active) 
                    continue;
    
                active = true;
                this.ks = this.services[service]["ks"];
                this.services[service]["enabled"] = 1;
                this.saveSession();
            }
    
            this.o2tv.getApplication().getConsoleLog().success("O2TV", "Session loaded successfully.");
        } catch (error) {
            this.o2tv.getApplication().getConsoleLog().error("O2TV", `Error loading session: ${error.message}`);
        }
    }    

    /**
     * Saves the session data to storage.
     */
    saveSession() {
        this.o2tv.getApplication().getConsoleLog().debug("O2TV", "Saving session...");
        this.o2tv.getApplication().getConfig().O2TV_Services = this.services;
    }

    /**
     * Removes the session data.
     */
    removeSession() {
        this.o2tv.getApplication().getConfig().O2TV_Services = {};
        this.valid_to = -1;
        this.createSession();
    }
}