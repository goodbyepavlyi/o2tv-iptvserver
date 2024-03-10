const path = require("path");
const { version } = require("../../package.json");

module.exports = class Utils {
    static isDev = () => process.argv.includes("--dev");
    static getVersion = () => Utils.isDev() ? `${version}-dev` : version;
    static getDataDirectory = () => path.resolve(__dirname, "../../data");

    /**
     * @returns {boolean}
     */
    static isURL(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }
}