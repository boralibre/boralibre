/** Search and fetch data from the Official State Gazette.
 * @param {Storer} storer Storer used to save data. Cannot be null.
 * @param {Object} searchOptions Filters for the search. Cannot be null.
 * @param {Number} [searchOptions.year] Year of the required entries.
 */
module.exports = function Fetcher(storer, searchRequest) {
  var debug = require("debug")("fetcher");
  var request = require("request");
  var SearchResponse = require("./SearchResponse");
  var Q = require("q");

  var loadPage = function (rawRequest, id) {
    return new Promise((resolve, reject) => {
      debug("fetching page %s", rawRequest.meta.offset);
      debug("request: %s", JSON.stringify(rawRequest));

      request.post({
        url: rawRequest.meta.endpoint,
        formData: Object.assign(rawRequest.formData, {
          idSesion: id || ""
        }),
        json: rawRequest.meta.json
      }, (err, response, data) => {
        if (err) {
          reject(err);
        } else {
          debug("status: %s", response.statusCode);
          resolve(data);
        }
      });
    });
  };

  var loadNextPages = function (id) {
    return new Promise((resolve, reject) => {
      var requests = searchRequest.build();
      var promises = requests.map(rawRequest => loadPage(rawRequest, id))

      Q.all(promises).then(values => {
        resolve(new SearchResponse(requests.pop().meta, values));
      }).catch(err => reject(err));
    });
  };

  var fetch = function (progressCallback) {
    return Q.spawn(function* () {
      var response;
      var totalResults = 0;
      var item;

      do {
        response = yield loadNextPages(response && response.id);

        if (response.error) {
          throw new Error("Invalid response: " + JSON.stringify(response));
        }

        totalResults += response.pagination.length;

        debug("fetched %s results from %s", totalResults,
          response.pagination.totalItems);

        while (item = response.results.shift()) {
          yield storer.store(item);
        }

        if (progressCallback) {
          progressCallback(response.pagination);
        }
      } while (searchRequest.hasMoreItems(response));

      storer.close();
    });
  }

  return {
    fetch (progressCallback) {
      return new Promise((resolve, reject) => {
        fetch(progressCallback)
          .then(() => resolve())
          .catch(err => reject(err));
      });
    }
  };
};
