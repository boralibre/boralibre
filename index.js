var ProgressBar = require('progress');
var Fetcher = require("./lib/Fetcher");
var FileSystemStorer = require("./lib/FileSystemStorer");
var storer = new FileSystemStorer("boletin-oficial-2015.json");
var fetcher = new Fetcher(storer, {
  year: 2015
});
var bar;

fetcher.fetch(pagination => {
  if (pagination.page === 1) {
    bar = new ProgressBar("  fetching [:bar] :percent", {
      complete: '=',
      incomplete: ' ',
      width: 40,
      total: pagination.totalPages
    });
  }

  bar.tick();
}).then(result => debug("done"))
  .catch(err => debug("err %s", err));
