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
 * @property {Array<O2TVImage>} images
 * @property {Object.<string, O2TVMeta>} metas
 */

/**
 * @typedef {Object} O2TVImage
 * @property {string} id
 * @property {number} imageTypeId
 * @property {string} imageTypeName
 * @property {boolean} isDefault
 * @property {string} ratio
 * @property {string} url
 * @property {number} version
 */

/**
 * @typedef {Object} O2TVMeta
 * @property {string} objectType
 * @property {any} value
 */

/**
 * @typedef {Object} O2TVChannelProgram
 * @property {number} id
 * @property {string} externalId
 * @property {string} name
 * @property {string} description
 * @property {number} createDate
 * @property {number} startDate
 * @property {number} endDate
 * @property {number} epgChannelId
 * @property {string} epgId
 * @property {number} linearAssetId
 * @property {Array<O2TVImage>} images
 * @property {Object.<string, O2TVMeta>} metas
 * @property {Object.<string, O2TVProgramTag>} tags
 */

/**
 * @typedef {Object} O2TVProgramTag
 * @property {string} objectType
 * @property {Array<O2TVProgramTagObject>} objects
 */

/**
 * @typedef {Object} O2TVProgramTagObject
 * @property {string} objectType
 * @property {string} value
 */

module.exports = {
    O2TVService,
    O2TVChannel,
    O2TVChannelImage,
    O2TVChannelMeta
}