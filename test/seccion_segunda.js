var SearchRequest = require("../").SearchRequest;
var debug = require("debug")("test");

new SearchRequest()
  .outputFile("boletin-oficial-segunda-" + Date.now() + ".json")
  .section(2)
  .startDate(new Date("2010-01-01"))
  .endDate(new Date("2016-01-01"))
  .dateRange(90)
  .jobs(5)
  .resultsPerPage(1000)
  .progress(require("./progress")())
  .fetch()
.then(result => debug("done"))
.catch(err => debug("err %s", err));
