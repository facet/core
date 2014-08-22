"use strict";

var util = require('util'),
  RouterManifest = require('./router-manifest'),
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

  // load the appropriate middleware generating class
  // this.middleware = new require('./middleware/'+this.middlewareType)(this);
  var middlewareClass = require('./middleware/'+this.middlewareType);
  this.middleware = new middlewareClass(this);
};


/**
 * Returns middleware that sets up a nodeStack and emits it for other modules.
 * This function is to be used when no other facet middleware is used in your app.
 * 
 * @return  {function}
 */
FacetCore.prototype.facetInit = function () {
  return this.middleware.facetInitBuilder(this);
};


/**
 * Sets the common attributes for this instance
 *
 * @param   {Object}   options
 */
FacetCore.prototype.setCommonAttributes = function ( options ) {
  this.router = null;
  this.options = options;
  this.intercom = options.intercom;
  this.routerManifest = new RouterManifest();

  // set flag to toggle api access checking
  this.doAccessCheck = (options.doAccessCheck !== undefined) ? options.doAccessCheck : true;

  // the type of api auth to use, currently 'basic' and 'jwt' are supported
  this.apiAuthMethod = options.apiAuthMethod || 'basic';
  
  // api secret key used for encoding access tokens
  this.apiSecret = options.apiSecret || '';

  // was the api auth middleware used yet?
  this.apiAuthInitialized = false;

  // the router type dictates what signatures the middleware functions have
  this.middlewareType = options.middlewareType || 'connect';
  
  this._routeEventTracker = {};
  
  // nodeStack contains keys for req, res, next
  this.nodeStack = {};

  this._respondFacetEvent = null;

  // console.log('');
  // console.log('');
  // console.log('');
  // console.log('FacetCore.middlewareType: ', this.middlewareType);
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

  if(routeOptions.hasOwnProperty('routes')){
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
  } else if(routeOptions.hasOwnProperty('route')) {  
    // set the route base
    this.routerManifest.setRouteBase(routeOptions.route);

    // bind the router manifest
    this.bindRouterManifest();
  } else {
    throw new Error('The bindRoutes function requires a "routes" object or "route" string to be provided.');
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
 * @param   {Function}  successCb   Custom function for handling CRUD succeess
 * @param   {Function}  errorCb     Custom function for handling CRUD error
 *
 * @return  {Object} | {void}
 */
FacetCore.prototype.respond = function(fEvent, promise, successCb, errorCb) {
  // console.log('is fn successCb: ', _.isFunction(successCb));
  // console.log('listener count for ' + fEvent + ': ', this.intercom.listenerCount(fEvent));
  // console.log(promise);
  // console.log(successCb);
  // console.log('');
  // console.log('');
  
  // set the fEvent for access in the callback function
  this._respondFacetEvent = fEvent;

  if( _.isFunction(successCb) ) {
    if( !_.isFunction(errorCb) ){
      errorCb = this.defaultErrorCb.bind(this);
    }
    promise.then(successCb, errorCb);
  }
  else if( this.intercom.listenerCount(fEvent) > 0 ) {
    // console.log('event listener present, waiting for promise to resolve...');
    promise.then(this.defaultSuccessCb.bind(this), this.defaultErrorCb.bind(this)).end();
  }
  else {
    return promise;
  }
};

/**
 * The default Facet Core success callback function
 *
 * @param    {[type]}   data   [description]
 *
 * @return   {[type]}          [description]
 */
FacetCore.prototype.defaultSuccessCb = function(data) {
  // console.log('data after "successful" '+fEvent+' operation: ', data);
  // TODO: add more checks for failure to complete operation
  if( data === null ) {
    var findMessage = 'No item(s) matched your criteria.';
    if(
      this.hasOwnProperty('routerManifest')
      && this.routerManifest.hasOwnProperty('manifest')
      && this.routerManifest.manifest.hasOwnProperty('routeErrorMessages')
      && this.routerManifest.manifest.routeErrorMessages.hasOwnProperty('find')
    ){
      // override the default findMessage
      findMessage = this.routerManifest.manifest.routeErrorMessages.find;
    }
    this.intercom.emit('facet:response:error', 404, findMessage);
  }
  else {
    // console.log(fEvent);
    this.intercom.emit(this._respondFacetEvent, data);
    this._respondFacetEvent = null;
  }
};

/**
 * The default Facet Core error callback function
 *
 * @param    {Object}   err   The error object
 *
 * @return   {void} 
 */
FacetCore.prototype.defaultErrorCb = function(err) {
  var status = err.status || 400,
    errors = [];

  // handle all the validation errors from mongoose
  if(err.hasOwnProperty('errors')){
    for (var i in err.errors){
      errors.push({
        message: err.errors[i].message,
        type: err.errors[i].name || err.name || 'GeneralError'
      });
    }
  } else {
    errors.push({
      message: err.message,
      type: err.name || 'GeneralError'
    })
  }

  this.intercom.emit('facet:response:error', status, errors);
};


// export the main function
exports = module.exports = FacetCore;
