module.exports = function SearchRequest() {
  const RESULTS_PER_PAGE = 1000;

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
    "numeroPagina": 1,
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
    "anioNorma": new Date().getFullYear(),
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

  var meta = {
    endPage: 0
  };

  /** Fetches data from the official gazette. */
  var Fetcher = require("./Fetcher");

  /** Stores data in a single bundle file. */
  var FileSystemStorer = require("./FileSystemStorer");

  /** Storer only required to fetch the data from this request. */
  var storer = null;

  /** Formats a date to the request supported format.
   * @param {Date} date Date to format. Cannot be null.
   * @return {String} the formatted date string, never null.
   */
  var formatDate = function (date) {
    var pad = num => num < 10 ? "0" + num : String(num);
    return pad(date.getDate()) + "/" + pad(date.getMonth() + 1) + "/" +
      date.getFullYear();
  };

  return {
    RegulationTypes: RegulationTypes,

    section (number) {
      var sections = [false, false, false, false];
      if (number > 4 || number < 1) {
        throw new Error("Invalid section number: " + number);
      }
      sections[number - 1] = true;
      searchRequest.normasSeleccionadas = sections;
      return this;
    },

    fromDate (date) {
      searchRequest.fechaDesde = formatDate(date);
      return this;
    },

    toDate (date) {
      searchRequest.fechaHasta = formatDate(date);
      return this;
    },

    year (number) {
      searchRequest.anioNorma = number;
      return this;
    },

    regulationType (id) {
      searchRequest.tipoNorma = id;
      searchRequest.tipoNormaDescripcion = RegulationTypes[id];
      return this;
    },

    resultsPerPage (number) {
      searchRequest.cantidadPorPagina = number;
      return this;
    },

    page (number) {
      searchRequest.numeroPagina = number;
      meta.endPage = number;
      return this;
    },

    startPage (number) {
      searchRequest.numeroPagina = number;
      return this;
    },

    endPage (number) {
      if (number < searchRequest.numeroPagina) {
        throw new Error("end page cannot be less than start page");
      }
      meta.endPage = number;
      return this;
    },

    storer (theStorer) {
      storer = theStorer;
      return this;
    },

    outputFile (dataFile) {
      storer = new FileSystemStorer(dataFile);
      return this;
    },

    build () {
      return {
        data: searchRequest,
        meta: meta
      };
    },

    fetch (progressCallback) {
      if (!storer) {
        throw new Error("storer cannot be null");
      }
      return new Fetcher(storer, this).fetch(progressCallback);
    }
  };
};
