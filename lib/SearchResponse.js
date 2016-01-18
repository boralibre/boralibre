module.exports = function SearchResponse(meta, response) {

  var results = [];
  var total = 0;
  var id;
  var error = null;

  var createPagination = function (offset, total, length) {
    var totalPages = Math.ceil(total / meta.itemsPerPage);

    return {
      page: offset,
      length: length,
      totalPages: totalPages,
      totalItems: total
    };
  };

  (function __init() {
    var values = Array.isArray(response) ? response : [response];
    var lastValue;

    if (meta.json) {
      results = values.reduce((prev, item) =>
        prev.concat(item.dataList.ResultadoBusqueda), []);
      lastValue = values.pop();
      total = lastValue.dataList.CantidadTotal;
    } else {
      values = values.map(jsonResponse => JSON.parse(jsonResponse));
      results = values.reduce((prev, item) =>
        prev.concat(item.dataList.shift()), []);
      lastValue = values.pop();
      total = parseInt(lastValue.dataList.pop(), 10);
    }

    id = lastValue.id;

    if (lastValue.mensajeError) {
      error = {
        code: lastValue.codigoError,
        message: lastValue.mensajeError
      };
    }
  }());

  return {
    id: id,
    error: error,
    total: total,
    results: results,
    pagination: createPagination(meta.offset, total, results.length)
  };
};
