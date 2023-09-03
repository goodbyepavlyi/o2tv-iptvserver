const xml2js = require("xml2js");

module.exports = class O2TVMPD {
    /**
     * 
     * @param {String} mpd 
     */
    constructor(mpd) {
        this.mpd = mpd;
        this.xml = xml2js.parseString(this.mpd, (error, result) => {
            if (error) 
                throw error;

            return result;
        });

        console.log(this.xml)
    }


}