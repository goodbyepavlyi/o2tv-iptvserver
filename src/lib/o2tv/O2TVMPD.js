const xml2js = require("xml2js");

module.exports = class O2TVMPD {
    /**
     * 
     * @param {String} content 
     */
    constructor(content) {
        this.content = content;
    }

    async getXML() {
        if (!this.xml) 
            await this.fetch();

        return this.xml;
    }

    async buildXML() {
        const builder = new xml2js.Builder();
        return builder.buildObject(this.xml);
    }

    async fetch() {
        try {
            if (this.isURL(this.content)) {
                const response = await fetch(this.content);
                if (!response.ok) 
                    throw new Error(`Failed to fetch URL: ${this.content}`);
                
                this.xml = await response.text();
            } else {
                this.xml = this.content;
            }

            const streamUrlParts = this.content.split('/manifest.mpd');
            const newBaseURL = streamUrlParts[0];

            this.xml = this.xml.replace(/<BaseURL>.*<\/BaseURL>/, `<BaseURL>${newBaseURL}/</BaseURL>`);
        } catch (error) {
            throw new Error(`Failed to fetch or parse XML: ${error.message}`);
        }

        if (!this.xml) 
            throw new Error('Failed to fetch or parse XML');

        return this.xml;
    }

    isURL(value) {
        try {
            new URL(value);
            return true;
        } catch (error) {
            return false;
        }
    }

    async parseXml(xmlString) {
        return new Promise((resolve, reject) => {
            xml2js.parseString(xmlString, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }
}