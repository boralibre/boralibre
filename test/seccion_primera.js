var SearchRequest = require("../").SearchRequest;
var debug = require("debug")("test");

new SearchRequest()
  .outputFile("boletin-oficial-primera-" + Date.now() + ".json")
  .section(1)
  .year(2015)
  .dateRange(90)
  .jobs(5)
  .resultsPerPage(1000)
  .progress(require("./progress")())
  .fetch()
.then(result => debug("done"))
.catch(err => debug("err %s", err));
