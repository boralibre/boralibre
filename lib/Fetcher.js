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

  var createPagination = function (offset, jobs, total, length) {
    var totalPages = Math.ceil(total / currentRequest.data.cantidadPorPagina);

    return {
      page: offset,
      jobs: jobs,
      length: length,
      totalPages: totalPages,
      totalItems: total
    };
  };

  var loadPage = function (offset, id) {
    return new Promise((resolve, reject) => {
      var params;

      searchRequest.page(offset);
      currentRequest = searchRequest.build();
      params = JSON.stringify(currentRequest.data);

      debug("fetching page %s", offset);
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

  var loadPages = function (fromPage, toPage, id) {
    return new Promise((resolve, reject) => {
      var page = fromPage;
      var promises = [];

      while (page < toPage) {
        promises.push(loadPage(page, id));
        page += 1;
      }

      Q.all(promises).then(values => {
        var results = values.reduce((prev, item) =>
          prev.concat(item.dataList.ResultadoBusqueda), []);
        var response = values.pop();
        response.dataList.ResultadoBusqueda = results;
        resolve(response);
      }).catch(err => reject(err));
    });
  };

  var fetch = function (progressCallback) {
    return Q.spawn(function* () {
      var endPage = currentRequest.meta.endPage;
      var jobs = currentRequest.meta.jobs;
      var offset = 1;
      var pagination;
      var id;
      var data, results;
      var item;
      var toPage = jobs + 1;

      do {
        data = yield loadPages(offset, toPage, id);
        results = data.dataList;

        if (Array.isArray(results)) {
          throw new Error("Invalid response: " + JSON.stringify(data));
        }

        pagination = createPagination(offset, toPage - offset,
          data.dataList.CantidadTotal, results.ResultadoBusqueda.length);

        debug("fetched %s results in pages %s to %s from %s",
          pagination.length, pagination.page, toPage, pagination.totalPages);

        while (item = results.ResultadoBusqueda.shift()) {
          yield storer.store(item);
        }

        if (progressCallback) {
          progressCallback(pagination);
        }

        endPage = endPage || pagination.totalPages;
        id = data.id;
        offset += jobs;
        toPage = offset + jobs;

        if (toPage >= endPage) {
          toPage = endPage + 1;
        }
      } while (offset <= endPage);

      storer.close();
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
