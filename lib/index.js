"use strict";

var Core = require('./core'),
  ApiCore = require('./api-core'),
  CoreSchema = require('./model/CoreSchema');


// export the main function
exports = module.exports = {
  Core: Core,
  ApiCore: ApiCore,
  CoreSchema: CoreSchema
};
