module.exports = function SearchRequest() {
  const RESULTS_PER_PAGE = 1000;
  const BASE_SEARCH_URL = "https://www.boletinoficial.gob.ar/secciones";
  const SIMPLE_SEARCH_URL = BASE_SEARCH_URL + "/BuscadorRapido";
  const ADVANCED_SEARCH_URL = BASE_SEARCH_URL + "/BuscadorAvanzado";
  const SECTIONS_URL = BASE_SEARCH_URL + "/secciones.json";
  const DATE_MILLIS = 60 * 60 * 24 * 1000;

  /** Number of days of the time frame used as the lower and
   * higher boundaries of the date filter. This strategy is used to bypass a
   * limitation in the search services which prevents from fetching data in
   * large date ranges.
   */
  const DATE_FILTER_DATE_RANGE = 30;

  const RegulationTypes = {
    "0": "Seleccione un valor",
    "1": "COMUNICACION",
    "2": "DECRETO",
    "3": "DISPOSICION",
    "4": "INSTRUCCION",
    "5": "RESOLUCION",
    "500": "CONSTITUCION NACIONAL",
    "501": "ESTATUTO",
    "600": "CODIGO",
    "1100": "LEY",
    "1110": "ASAMBLEA LEGISLATIVA",
    "1330": "RESOLUCION CONJUNTA DEL CONGRESO",
    "1360": "DIRECTIVA",
    "1370": "DECISION",
    "1380": "SENTENCIA",
    "1390": "RES.GRAL.CONJUNTA",
    "1500": "DECISION ADMINISTRATIVA",
    "1700": "ACORDADA",
    "1800": "CIRCULAR",
    "2000": "CONCURSO OFICIAL",
    "3000": "REMATE OFICIAL",
    "4000": "AVISO OFICIAL",
    "5000": "FE DE ERRATAS",
    "6000": "ACLARACION",
    "7000": "NUEVA PUBLICACION",
    "7200": "LAUDO",
    "7300": "NOTA EXTERNA",
    "7400": "ACTA",
    "7500": "CONVENIO",
    "7600": "ACUERDO",
    "7700": "FALLO",
    "7800": "MENSAJES",
    "7900": "AUDIENCIAS PUBLICAS"
  };

  var searchRequest = {
    "numeroPagina": 0,
    "cantidadPorPagina": RESULTS_PER_PAGE,
    "largoMaximoCampo": 2000,
    "edicionCompleta": true,
    "normasSeleccionadas": [false, false, false],
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
    "anioNorma": "",
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
  };

  /** The fourth section does not support search by date range,
  so we need to use the standard sections service. */
  var sectionsRequest = {
    nombreSeccion: "cuarta",
    subCat: "all",
    offset: 0,
    itemsPerPage: RESULTS_PER_PAGE,
    fecha: null
  };

  var meta = {
    endpoint: ADVANCED_SEARCH_URL,
    offset: 0,
    endPage: 0,
    jobs: 1,
    section: 1,
    startDate: null,
    endDate: null,
    dateRange: DATE_FILTER_DATE_RANGE,
    currentDateRange: {
      start: null,
      end: null
    },
    itemsPerPage: RESULTS_PER_PAGE,
    progressCallback: null,
    json: true
  };

  var debug = require("debug")("search_request");

  /** Fetches data from the official gazette. */
  var Fetcher = require("./Fetcher");

  /** Stores data in a single bundle file. */
  var FileSystemStorer = require("./FileSystemStorer");

  /** Storer only required to fetch the data from this request. */
  var storer = null;

  /** Indicates whether it is the first request. */
  var first = true;

  /** Number of concurrent jobs. */
  var jobs = 1;

  /** Formats a date to the search request supported format.
   * @param {Date} date Date to format. Cannot be null.
   * @return {String} the formatted date string, never null.
   */
  var formatDate = function (date) {
    var pad = num => num < 10 ? "0" + num : String(num);
    return pad(date.getDate()) + "/" + pad(date.getMonth() + 1) + "/" +
      date.getFullYear();
  };

  /** Formats a date to the sections request supported format.
   * @param {Date} date Date to format. Cannot be null.
   * @return {Number} the formatted date as number, never null.
   */
  var formatDateAsNumber = function (date) {
    var pad = num => num < 10 ? "0" + num : String(num);

    return parseInt(date.getFullYear().toString() + pad(date.getMonth() + 1) +
      pad(date.getDate()), 10);
  };

  var hasMoreItems = function() {
    return meta.offset <= meta.endPage;
  };

  var nextDateRange = function(startDate) {
    var currentEndDate = meta.currentDateRange.end ||
      new Date(meta.startDate - DATE_MILLIS);
    var nextStartDate = (startDate && new Date(startDate.getTime())) ||
      new Date(currentEndDate + DATE_MILLIS);
    var nextRange = {
      start: new Date(nextStartDate.getTime()),
      end: new Date(nextStartDate.setDate(nextStartDate.getDate() +
        meta.dateRange))
    };

    if (nextRange.end > meta.endDate) {
      nextRange.end = meta.endDate;
    }

    if (meta.offset >= meta.endPage && nextRange.start < meta.endDate) {
      debug("next range: %s", JSON.stringify(nextRange));

      meta.currentDateRange = nextRange;
      meta.offset = 0;
      meta.endPage = 0;
      first = true;
      searchRequest.numeroPagina = 0;
      sectionsRequest.offset = 0;
      searchRequest.fechaDesde = formatDate(nextRange.start);
      searchRequest.fechaHasta = formatDate(nextRange.end);
    } else {
      debug("current range: %s", JSON.stringify(meta.currentDateRange));
    }
  };

  return {
    RegulationTypes: RegulationTypes,

    section(number) {
      var sections = [false, false, false];
      if (number > 4 || number < 1) {
        throw new Error("Invalid section number: " + number);
      }

      meta.section = number;

      if (meta.section === 4) {
        meta.endpoint = searchRequest.textoBuscar ? SIMPLE_SEARCH_URL : SECTIONS_URL;
        searchRequest.seccion = "Cuarta";
        searchRequest.normasSeleccionadas = [];
      } else {
        sections[number - 1] = true;
        searchRequest.normasSeleccionadas = sections;
      }

      debug("section: %s", number);

      return this;
    },

    startDate(date) {
      var startDate = new Date(date.getTime());

      searchRequest.fechaDesde = formatDate(startDate);
      meta.startDate = startDate;
      this.dateRange(meta.dateRange);

      debug("start date: %s", date);

      return this;
    },

    endDate(date) {
      searchRequest.fechaHasta = formatDate(date);
      meta.endDate = date;
      debug("end date: %s", date);
      return this;
    },

    year(number) {
      // Only first section supports "anioNorma" parameter.
      // Other sections require a date range.
      if (meta.section === 1) {
        searchRequest.anioNorma = number;
      }
      this.startDate(new Date(number + "-01-01"));
      this.endDate(new Date((number + 1) + "-01-01"));
      debug("year: %s", number);

      return this;
    },

    regulationType(id) {
      searchRequest.tipoNorma = id;
      searchRequest.tipoNormaDescripcion = RegulationTypes[id];
      debug("regulation type %s: %s", id, searchRequest.tipoNormaDescripcion);
      return this;
    },

    resultsPerPage(number) {
      searchRequest.cantidadPorPagina = number;
      sectionsRequest.itemsPerPage = number;
      meta.itemsPerPage = number;
      debug("results per page: %s", number);

      return this;
    },

    page(number) {
      searchRequest.numeroPagina = number - 1;
      sectionsRequest.offset = number - 1;
      meta.offset = number - 1;
      meta.endPage = number;
      debug("page: %s", number);

      return this;
    },

    startPage(number) {
      searchRequest.numeroPagina = number;
      debug("start page: %s", number);

      return this;
    },

    endPage(number) {
      if (number < searchRequest.numeroPagina) {
        throw new Error("end page cannot be less than start page");
      }
      meta.endPage = number;
      debug("end page: %s", number);
      return this;
    },

    storer(theStorer) {
      storer = theStorer;
      return this;
    },

    outputFile(dataFile) {
      storer = new FileSystemStorer(dataFile);
      debug("output file: %s", dataFile);

      return this;
    },

    jobs(number) {
      if (number < 1) {
        throw new Error("invalid number of jobs: " + number);
      }
      meta.jobs = number;
      debug("jobs: %s", number);

      return this;
    },

    text(searchText) {
      searchRequest.textoBuscar = searchText;

      // Four section uses simple search.
      if (meta.section === 4) {
        meta.endpoint = SIMPLE_SEARCH_URL;
      }

      debug("text: %s", searchText);

      return this;
    },

    dateRange(days) {
      var endDate;

      meta.dateRange = days;
      nextDateRange(meta.startDate);
      debug("date range: %s", days);
      return this;
    },

    progress(callback) {
      meta.progressCallback = callback;
      debug("with progress callback");
      return this;
    },

    build() {
      var i;
      var requests = [];
      var frameSize;
      var buildNext = () => {
        var formData;

        searchRequest.numeroPagina += 1;
        sectionsRequest.offset += 1;
        meta.offset += 1;
        sectionsRequest.fecha = formatDateAsNumber(
          new Date(meta.endDate.getTime() - DATE_MILLIS));

        if (meta.endpoint === SECTIONS_URL) {
          formData = sectionsRequest;
          meta.json = false;
        } else {
          formData = {
            parametros: JSON.stringify(searchRequest)
          };
        }

        return {
          formData: Object.assign({}, formData),
          meta: Object.assign({}, meta)
        };
      };

      // The first request must be single since we need
      // to get the session id for the underlying requests.
      if (first) {
        jobs = meta.jobs;
        meta.jobs = 1;
        first = false;
      } else {
        meta.jobs = jobs;
      }

      frameSize = meta.jobs;

      // Calculates the last frame size.
      if (meta.offset + meta.jobs > meta.endPage) {
        frameSize = (meta.offset + meta.jobs) - meta.endPage;
      }

      debug("adding %s requests", frameSize);

      for (i = 0; i < frameSize; i++) {
        requests.push(buildNext());
      }

      return requests;
    },

    next(response) {
      meta.endPage = meta.endPage || response.pagination.totalPages;
      debug("position: %s", JSON.stringify(meta));

      nextDateRange();
      return hasMoreItems();
    },

    fetch() {
      if (!storer) {
        throw new Error("storer cannot be null");
      }
      debug("fetching from: %s", meta.endpoint);
      return new Fetcher(storer, this).fetch(meta.progressCallback);
    }
  };
};