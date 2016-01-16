/** Search and fetch data from the Official State Gazette.
 * @param {Storer} storer Storer used to save data. Cannot be null.
 * @param {Object} searchOptions Filters for the search. Cannot be null.
 * @param {Number} [searchOptions.year] Year of the required entries.
 */
module.exports = function Fetcher(storer, searchOptions) {
  const RESULTS_PER_PAGE = 1000;

  var debug = require("debug")("boletin_oficial");
  var request = require("request");
  var Q = require("q");

  var createPagination = function (offset, total, length) {
    var totalPages = Math.ceil(total / RESULTS_PER_PAGE +
      (total % RESULTS_PER_PAGE && 1));
    return {
      page: offset,
      length: length,
      totalPages: totalPages,
      totalItems: total
    };
  };

  var loadPage = function (offset, id, pagination) {
    return new Promise((resolve, reject) => {
      var done = false;
      var params = JSON.stringify({
        "numeroPagina": offset,
        "cantidadPorPagina": RESULTS_PER_PAGE,
        "largoMaximoCampo": 2000,
        "edicionCompleta": true,
        "normasSeleccionadas": [true, true, true],
        "asuntos": [],
        "seccion": null,
        "rubro": [],
        "tipocontratacion": [],
        "rubro2da": [],
        "getFromConvera": false,
        "voces": [],
        "emisorPrimera": "",
        "emisorPrimeraComienzaContiene": 1,
        "emisorTercera": "",
        "emisorTerceraComienzaContiene": 1,
        "fechaDesde": "",
        "fechaHasta": "",
        "numeroEjemplar": "",
        "anioNorma": searchOptions.year,
        "numeroNorma": "",
        "textoBuscar": "",
        "emisorSegunda": "",
        "nrocontratacion": "",
        "tipoNorma": "0",
        "asuntosAlgunaTodas": 1,
        "opcionPalabraLibre": 1,
        "fecha_portadas_ant_buscadoravanzado": "",
        "vocesInclusionAlgunaTodas": 1,
        "ordenamiento2da": 1,
        "tipoNormaDescripcion": "Seleccione un valor"
      });

      if (pagination) {
        debug("fetching page %s from %s", offset, pagination.totalPages);
      } else {
        debug("fetching first page");
      }

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

  var loadNextPage = function (progressCallback) {
    return Q.spawn(function* () {
      var totalPages = 1;
      var offset = 1;
      var pagination;
      var id;
      var data, results;
      var item;

      while (offset < (totalPages + 1)) {
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
        id = data.id;
        offset += 1;
      }
    });
  }

  return {
    fetch (progressCallback) {
      return new Promise((resolve, reject) => {
        resolve(loadNextPage(progressCallback));
      });
    }
  };
};
