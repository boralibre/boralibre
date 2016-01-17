/** Search and fetch data from the Official State Gazette.
 * @param {Storer} storer Storer used to save data. Cannot be null.
 * @param {Object} searchOptions Filters for the search. Cannot be null.
 * @param {Number} [searchOptions.year] Year of the required entries.
 */
module.exports = function Fetcher(storer, searchRequest) {
  var debug = require("debug")("fetcher");
  var request = require("request");
  var Q = require("q");
  var currentRequest = searchRequest.build();

  var createPagination = function (offset, total, length) {
    var totalPages = Math.ceil(total / currentRequest.data.cantidadPorPagina +
      (total % currentRequest.data.cantidadPorPagina && 1));
    return {
      page: offset,
      length: length,
      totalPages: totalPages,
      totalItems: total
    };
  };

  var loadPage = function (offset, id, pagination) {
    return new Promise((resolve, reject) => {
      var params;

      searchRequest.page(offset);
      currentRequest = searchRequest.build();
      params = JSON.stringify(currentRequest.data);

      if (pagination) {
        debug("fetching page %s from %s", offset, pagination.totalPages);
      } else {
        debug("fetching first page");
      }

      debug("request: %s", params);

      request.post({
        url: "https://www.boletinoficial.gob.ar/secciones/BuscadorAvanzado",
        formData: {
          parametros: params,
          idSesion: id || ""
        },
        json: true
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

  var fetch = function (progressCallback) {
    return Q.spawn(function* () {
      var totalPages = 1;
      var endPage = currentRequest.meta.endPage || totalPages;
      var offset = 1;
      var pagination;
      var id;
      var data, results;
      var item;

      while (offset <= totalPages || offset <= endPage) {
        data = yield loadPage(offset, id, pagination);
        results = data.dataList;

        if (Array.isArray(results)) {
          throw new Error("Invalid response: " + JSON.stringify(data));
        }

        pagination = createPagination(offset,
          data.dataList.CantidadTotal, results.ResultadoBusqueda.length);
        debug("fetched %s results in page %s from %s",
          pagination.length, pagination.page,
          pagination.totalPages);

        while (item = results.ResultadoBusqueda.shift()) {
          yield storer.store(item);
        }

        if (progressCallback) {
          progressCallback(pagination);
        }

        totalPages = pagination.totalPages;
        endPage = endPage || totalPages;
        id = data.id;
        offset += 1;
      }
    });
  }

  return {
    fetch (progressCallback) {
      return new Promise((resolve, reject) => {
        resolve(fetch(progressCallback));
      });
    }
  };
};
