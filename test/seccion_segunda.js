var SearchRequest = require("../").SearchRequest;
var debug = require("debug")("test");

new SearchRequest()
  .outputFile("boletin-oficial-segunda-" + Date.now() + ".json")
  .section(2)
  .startDate(new Date("2015-01-01"))
  .endDate(new Date("2016-01-01"))
  .jobs(5)
  .resultsPerPage(1000)
  .fetch(require("./progress")())
.then(result => debug("done"))
.catch(err => debug("err %s", err));
