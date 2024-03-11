const Config = require("../Config");
const O2TVError = require("../types/errors/O2TVError");
const Logger = require("../utils/Logger");

module.exports = class O2TVSession {
    /**
     * @param {import("./O2TV")} o2tv 
     */
    constructor(o2tv) {
        this.o2tv = o2tv;

        /** @type {Object.<string, import("../types/Types").O2TVService>} */
        this.services = {};
        this.validTo = -1;
    }

    getKS = () => this.ks;
    isValid = () => this.validTo > Math.floor(Date.now() / 1000);

    createDeviceId = () => [...Array(15)]
        .map(() => Math.random().toString(36)[2])
        .join("")
        .toUpperCase();

    /**
     * @private
     */
    _saveSession() {
        Logger.debug(Logger.Type.O2TV, "Saving session...");
        Config.o2tvServices = this.services;
    }

    /**
     * @private
     */
    _removeSession() {
        Config.o2tvServices = {};
        this.validTo = -1;
        this.createSession();
    }

    async createSession() {
        try {
            Logger.info(Logger.Type.O2TV, "Creating session...");

            const ks = await this.o2tv.getApi().anonymousLogin()
                .then((data) => {
                    Logger.debug(Logger.Type.O2TV, `KS: &c${data.result.ks}&r`);
                    return data.result.ks;
                });

            const jwtToken = await this.o2tv.getApi().login(Config.o2tvUsername, Config.o2tvPassword, Config.o2tvDeviceId)
                .then((data) => {
                    Logger.debug(Logger.Type.O2TV, `JWT token: &c${data.jwt}&r`);
                    return data.jwt;
                });

            const services = await this.o2tv.getApi().fetchServices(jwtToken, ks)
                .then((data) => JSON.parse(data.result.adapterData.service_list.value)["ServicesList"])

            const ksServices = services.reduce((acc, service) => {
                Object.entries(service).forEach(([id, code]) => acc[code] = id);
                return acc;
            }, {});
    
            if (!ksServices || Object.keys(ksServices).length < 1) {
                Logger.error(Logger.Type.O2TV, "No services found (possible that the account doesn't have any?).");
                throw new O2TVError({ type: O2TVError.Type.NoAccountServices });
            }

            Logger.debug(Logger.Type.O2TV, "Fetched services:", Object.entries(ksServices).map(([ ksCode, ksName ]) => `&c${ksName}&r (&c${ksCode}&r)`).join(", "));
       
            for (const [ ksCode, ksName ] of Object.entries(ksServices)) {
                const data = await this.o2tv.getApi().kalturaLogin(Config.o2tvDeviceId, jwtToken, ks, ksCode)

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

                Logger.debug(Logger.Type.O2TV, `Service &c${this.services[service].ks_name}&r (&c${service}&r) is no longer available.`);
                delete this.services[service];
            }
            
            Logger.debug(Logger.Type.O2TV, "Loaded services:", Object.values(this.services).map((ksService) => `&c${ksService.ks_name}&r (&c${ksService.ks_code}&r)`).join(", "));
        } catch (error) {
            throw error;
        }
    }

    async loadSession() {
        try {
            Logger.info(Logger.Type.O2TV, "Loading session...");
    
            if (!(Config.o2tvUsername && Config.o2tvPassword && Config.o2tvDeviceId)) {
                return Logger.error(Logger.Type.O2TV, "Missing credentials, aborting loading session...");
            }
    
            this.services = {};
            if (Config.o2tvServices && Object.keys(Config.o2tvServices).length > 0) {
                Logger.debug(Logger.Type.O2TV, "Services found in config, loading session...");
                this.services = Config.o2tvServices;
                
                let reset = 0;
                for (const service of Object.values(this.services)) {
                    if (service.ks_expiry && service.ks_expiry > Math.floor(Date.now() / 1000)) {
                        continue;
                    }

                    if (reset != 0) {
                        continue;
                    }
    
                    Logger.debug(Logger.Type.O2TV, `Service &c${service.ks_name}&r (&c${service.ks_code}&r) has expired, creating new session...`);
                    await this.createSession();
                    reset = 1;
                }
            } else {
                Logger.debug(Logger.Type.O2TV, "No services found in config, creating session...");
                await this.createSession();
            }
    
            let active;
            for (const [ ksCode, ksService ] of Object.entries(this.services)) {
                if (ksService.enabled != 1) {
                    Logger.debug(Logger.Type.O2TV, `Service &c${ksService.ks_name}&r (&c${ksCode}&r) is disabled.`);
                    continue;
                }

                active = true;
                this.ks = ksService["ks"];
                this.validTo = ksService["ks_expiry"];
                Logger.info(Logger.Type.O2TV, `Service &c${ksService.ks_name}&r (&c${ksCode}&r) is active.`);
                break;
            }

            if (active) {
                return true;
            } 
    
            for (const ksService of Object.values(this.services)) {
                if (active) {
                    continue;
                }

                active = true;
                this.ks = ksService["ks"];
                this.validTo = ksService["ks_expiry"];
                ksService["enabled"] = 1;

                Logger.info(Logger.Type.O2TV, `Service &c${ksService.ks_name}&r (&c${ksService.ks_code}&r) is active.`);
                this._saveSession();
            }
    
            Logger.info(Logger.Type.O2TV, "Successfully loaded session");
            return true;
        } catch (error) {
            Logger.error(Logger.Type.O2TV, "An error occured while loading session:", error);
            throw error;
        }
    }    
}