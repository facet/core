"use strict";

var util = require('util'),
  _ = require('underscore');


/**
 * Facet Core constructor
 * 
 * @param   {Object}   options   Options object - must contain 'db' (mongoose instance)
 *                               and 'intercom' (EventEmitter instance) keys.
 *
 * @return  {void} 
 */
var FacetCore = function( options ) {

  // set the options
  this.setCommonAttributes( options );
};


/**
 * Sets the common attributes for this instance
 *
 * @param   {Object}   options
 */
FacetCore.prototype.setCommonAttributes = function ( options ) {

  //EventEmitter.call(this);
  this.router = null;
  this.options = options;
  this.intercom = options.intercom;
  this.routerManifest = {};
  this._routeEventTracker = {};
  this._req = null;
  this._res = null;
  this._next = null;
};


FacetCore.prototype.noop = function(){};

/**
 * Registers API event listeners
 * 
 * @return  {void}
 */
FacetCore.prototype.registerEvents = function ( ) {
  // throw new Error("Event registration needed. Please override .registerEvents function.");
};


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


/**
 * Executes a response for a given event. Determines how the data/error should
 * be handled. IF a success callback is passed, that trumps all other methods as 
 * the user wants to override the flow with their own custom logic. Otherwise if 
 * the current event has any listeners registered for it on intercom, the event is 
 * emitted. Finally if none of those are true, a promise is returned so the user 
 * can interact with it however they see fit.
 *
 * @param   {String}    fEvent      The current event
 * @param   {Object}    promise     A promise for performing a CRUD operation
 * @param   {string}    errMsg      Error message
 * @param   {Function}  successCb   Custom function for handling CRUD succeess
 * @param   {Function}  errorCb     Custom function for handling CRUD error
 *
 * @return  {Object} | {void}
 */
FacetCore.prototype.respond = function(fEvent, promise, errMsg, successCb, errorCb) {
  var _this = this;

  // console.log('is fn successCb: ', _.isFunction(successCb));
  // console.log('listener count for ' + fEvent + ': ', this.intercom.listenerCount(fEvent));
  // console.log(promise);

  if( _.isFunction(successCb) ) {
    promise.then(successCb, errorCb);
  }
  else if( this.intercom.listenerCount(fEvent) > 0 ) {
    promise.then(function(data) {
      // console.log('data after "successful" '+fEvent+' operation: ', data);
      // TODO: add more checks for failure to complete operation
      if( data === null ) {
        _this.intercom.emit('facet:response:error', 404, errMsg);
      }
      else {
        _this.intercom.emit(fEvent, data);  
      }
    },
    function(err) {
      _this.intercom.emit('facet:response:error', 400, err.message);
    });
  }
  else {
    return promise;
  }
};


// export the main function
exports = module.exports = FacetCore;
