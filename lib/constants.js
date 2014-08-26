"use strict";

/**
 * Provides immutable constant variables
 * 
 * @return  {void} 
 */
var Constants = function() {
  this.STRIP_FIELDS = {
    GET: ['api_key', 'password'],
    POST: ['api_key'],
    PUT: [],
    DELETE: []
  };
};

Object.freeze(Constants);

exports = module.exports = Constants;
