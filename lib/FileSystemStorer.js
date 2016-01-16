/** Storer that stores data in a bundle file.
 *
 * @param {String} dataFile Bundle file to write items to. Cannot be null.
 * @constructor
 */
module.exports = function FileSystemStorer(dataFile) {

  /** Promises library.
   * @type {Function}
   */
  var Promise = require("promise/setimmediate");

  /** Node's FileSystem API.
   * @type {Object}
   * @private
   */
  var fs = require("fs");

  /** Bundle file write stream.
   * @type {Stream}
   * @private
   */
  var bundleStream = (function () {
    var stream = fs.createWriteStream(dataFile);
    stream.write("[");
    return stream;
  }());

  var writeItem = function (item) {
    var jsonData = JSON.stringify(item);

    bundleStream.write(jsonData);
    bundleStream.write(",");
  };

  return {

    /** Stores the specified data object into the file system.
     *
     * @param {Object} data Object having the data to store. Cannot be null.
     */
    store (data) {
      return new Promise((resolve, reject) => {
        writeItem(data);
        resolve();
      });
    },

    /** Closes and clean up this storer.
     */
    close () {
      bundleStream.write(JSON.stringify({ done: true }) + "]");
      bundleStream.end();
    }
  };
};
