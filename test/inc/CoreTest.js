'use strict';

var Core = require('../..').Core,
	Items = require('./test-api-core'),
	util = require('util');

var TestCore = function(options) {  
	TestCore.super_.call(this, options);
  this.Items = new Items(options);
};

util.inherits(TestCore, Core);

module.exports = exports = TestCore;