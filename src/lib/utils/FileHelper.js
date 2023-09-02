const fs = require("fs");
const path = require("path");

/**
 * @param {string} destination
     * @returns {Promise<string[]>}
*/
function walkFs(destination) {
    const results = [];
    
    fs.readdirSync(destination).forEach(dirItem => {
        const stat = fs.statSync(path.join(destination, dirItem));

        if (stat.isFile()) return results.push(path.join(destination, dirItem));
        if (stat.isDirectory()) walkFs(path.join(destination, dirItem)).forEach(walkItem => results.push(walkItem));
    });

    return results;
}
module.exports = {
    walkFs,
}