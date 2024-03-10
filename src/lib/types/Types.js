/**
 * @typedef {Object} O2TVService
 * @property {string} ks_name
 * @property {string} ks_code
 * @property {number} ks_expiry
 * @property {string} ks_refresh_token
 * @property {string} ks
 * @property {number} enabled
 */

/**
 * @typedef {Object} O2TVChannel
 * @property {number} id
 * @property {string} name
 * @property {string} externalId
 * @property {string} description
 * @property {number} createDate
 * @property {number} endDate
 * @property {Array<O2TVChannelImage>} images
 * @property {Object.<string, O2TVChannelMeta>} metas
 */

/**
 * @typedef {Object} O2TVChannelImage
 * @property {string} id
 * @property {number} imageTypeId
 * @property {string} imageTypeName
 * @property {boolean} isDefault
 * @property {string} ratio
 * @property {string} url
 * @property {number} version
 */

/**
 * @typedef {Object} O2TVChannelMeta
 * @property {string} objectType
 * @property {any} value
 */

module.exports = {
    
}