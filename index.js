var ProgressBar = require('progress');
var SearchRequest = require("./lib/SearchRequest");
var searchRequest = new SearchRequest();
var bar;
var progressCallback = pagination => {
  if (pagination.page === 1) {
    bar = new ProgressBar("  fetching [:bar] :percent", {
      complete: '=',
      incomplete: ' ',
      width: 40,
      total: pagination.totalPages
    });
  }

  bar.tick(pagination.jobs);
};

searchRequest
  .outputFile("boletin-oficial-segunda-2015-" + Date.now() + ".json")
  .section(2)
  .fromDate(new Date("2015-01-01"))
  .toDate(new Date("2016-01-01"))
  .jobs(4)
  .resultsPerPage(1000)
  .fetch(progressCallback)
  .then(result => debug("done"))
  .catch(err => debug("err %s", err));
