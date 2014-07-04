"use strict";
var util = require('util'),
  EventEmitter = require('eventemitter2').EventEmitter;

/**
 * Facet Core constructor
 * 
 * @param   {Object}   options   Options object - must contain 'db' (mongoose instance)
 *                               and 'intercom' (EventEmitter instance) keys.
 *
 * @return  {void} 
 */
var FacetCore = function( options ) {
  this.setOptions(options);
}

/**
 * Facet Core inherits from EventEmitter
 */
util.inherits(FacetCore, EventEmitter);

/**
 * Sets the options for this instance
 *
 * @param   {[type]}   options
 */
FacetCore.prototype.setOptions = function ( options ) {

  //EventEmitter.call(this);
  this.router = null;
  this.options = options;
  this.intercom = options.intercom;
}

/**
 * Checks the constraints of the facet module interface
 *
 * @param    {Object}   api     The API that is being checked
 * @param    {String}   schema  The string reference to the schema added to this instance
 *
 * @return   {Boolean}
 */
// FacetCore.prototype.checkConstraints = function ( api, schema ){
//   return true;
//   if( schema ){
//     // check the schema, manifest, interface, etc..
//     return this.schemas[schema].check(api);
//   } else {
//     // console.log('what now?')
//   } 
//   return false;
// }

/**
 * Registers API event listeners
 * 
 * @return  {void}
 */
FacetCore.prototype.registerEvents = function ( ) {
  // throw new Error("Event registration needed. Please override .registerEvents function.");
}

/**
 * Binds the routes passed into the provided router instance.
 * 
 * @param   {Object}   router         Router instance (express, koa, custom, etc)
 * @param   {Object}   routeOptions   Options for route setup.
 * 
 * @return  {Object}   router
 */
FacetCore.prototype.bindRoutes = function( router, routeOptions ) {

  // set the router
  this.router = router;

  // iterate through the routeOptions 
  for( var route in routeOptions.routes ) {
    var api = routeOptions.routes[route];

    if( this.hasOwnProperty(api) ) {
      this[api].bindRoutes( this.router, {'route': route} );
    }
    else {
      // TODO: emit or log error about incorrect route binding attempt
    }
  }

  return this.router;

};

// export the main function
exports = module.exports = FacetCore;
