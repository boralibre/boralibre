module.exports = function () {
  var ProgressBar = require('progress');
  var bar;

  return function (pagination) {
    if (!bar) {
      bar = new ProgressBar("  fetching [:bar] :percent", {
        complete: '=',
        incomplete: ' ',
        width: 40,
        total: pagination.totalItems
      });
    }

    bar.tick(pagination.length);
  };
};
