const { release } = require('./package.json');

module.exports.RELEASE = release;
module.exports.URL = process.env.URL || `http://localhost:${process.env.port || 8649}`;
module.exports.PORT = process.env.PORT || 8649;
module.exports.CONFIG_PATH = process.env.CONFIG_PATH || '/config/config.conf';
module.exports.O2TV_EMAIL = process.env.O2TV_EMAIL;
module.exports.O2TV_PASSWORD = process.env.O2TV_PASSWORD;