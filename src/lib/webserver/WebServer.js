const debug = require('debug')('WebServer');
const path = require('path');
const express = require('express');
const Util = require('./Util');
const { PORT, URL } = require('../../config');

module.exports = class WebServer {
    constructor(o2tv) {
        this.o2tv = o2tv;

        this.app = express()
            .disable('etag')
            .use(express.static(path.join(__dirname, '..', '..', 'www')))
            .use(express.json())

            .get('/api/playlist', Util.promisify(async (req, res) => {
                const url = req.query.url || URL;
                let result = '';
                for (const [x, y] of Object.entries(this.o2tv.channels))
                    result += `#EXTINF:-1 provider="O2 TV" tvg-logo="${y.image}" catchup="append" catchup-source="?utc={utc}&utcend={utcend}",${y.name.replace(' HD', '')}\n#KODIPROP:inputstream=inputstream.adaptive\n#KODIPROP:inputstream.adaptive.manifest_type=hls\n#KODIPROP:mimetype=application/x-mpegURL\n${url}/api/channel/${encodeURI(x.replace('/', '|'))}.m3u8\n`

                if (result !== '')
                    result = `#EXTM3U\n${result}`;

                res.header('Content-Disposition', 'attachment; filename="playlist.m3u8"');
                res.header('Content-Type', 'text/plain; charset=UTF-8');
                res.send(result);
            }))

            .get('/api/channels', Util.promisify(async (req, res) => {
                res.send(this.o2tv.channels);
            }))

            .get('/api/channel/:id', Util.promisify(async (req, res) => {
                const channelId = decodeURIComponent(req.params.id).replace("|", "/");

                const stream = (req.query['end']) ? await this.o2tv.getCatchup(channelId, req.query['utc'], req.query['utcend'] || '') : await this.o2tv.getStream(channelId);
                
                res.header('Content-Type', 'application/x-mpegURL');
                return res.redirect(stream);
            }))

            .listen(PORT, () => {
                debug(`Listening on http://0.0.0.0:${PORT}`);
            });
    }
}