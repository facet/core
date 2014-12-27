"use strict";

var util = require('util'),
  RouterManifest = require('./router-manifest'),
  _ = require('underscore'),
  util = require('util');


/**
 * Facet Core constructor
 * 
 * @param   {Object}   options   Options object - must contain 'db' (mongoose instance)
 *                               and 'intercom' (EventEmitter instance) keys.
 *
 * @return  {void} 
 */
var FacetCore = function ( options ) {
  // set the options
  this.setCommonAttributes( options );

  // load the appropriate middleware generating class
  var middlewareClass = require('./middleware/'+this.middlewareType);
  this.middleware = new middlewareClass(this);

  this.registerCoreEvents();
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
  this.doAccessCheck = (options.doAccessCheck !== undefined && typeof options.doAccessCheck === 'boolean') ? options.doAccessCheck : true;

  // the type of api auth to use, currently 'basic' and 'jwt' are supported
  this.apiAuthMethod = options.apiAuthMethod || 'basic';
  
  // api secret key used for encoding access tokens
  this.apiSecret = options.apiSecret || '';

  // TODO: is apiAuthInitialized still used anywhere?
  // was the api auth middleware used yet?
  this.apiAuthInitialized = false;

  // the router type dictates what signatures the middleware functions have
  this.middlewareType = options.middlewareType || 'connect';
  
  this._routeEventTracker = {};
  
  // nodeStack contains keys for req, res, next
  this.nodeStack = {};

  this._respondFacetEvent = null;

  // init the restricted fields object
  this.STRIP_FIELDS = {
    GET: [],
    POST: [],
    PUT: []
  };
};


FacetCore.prototype.registerCoreEvents = function ( ) {
  var _this = this;
  
  // set the nodeStack (contains req, res, next keys)
  this.intercom.on('facet:init:nodestack', function initNodeStack(nodeStack, force) {    
    _this.nodeStack = nodeStack;

  });

  // set apiAuthInitialized class variable
  this.intercom.on('facet:init:apiauth', function initApiAuth(value) {
    if( typeof value == 'boolean' ) {
      _this.apiAuthInitialized = value;
    }
  });
};



/**
 * Standard fare noop().
 */
FacetCore.prototype.noop = function(){};



/**
 * Adds a 'type' key of 'extended' to each route defined at the application
 * level (instead of routes defined within each facet module) and concats the 
 * routeBase to the 'route' key of each route object. These are extended
 * or related routes which tie together resources from two different facet modules
 *
 * @param {string} routeBase - the prefix for each route in routesArr
 * @param {Array} routesArr - an array of route definition objects
 * 
 * @return {Array}
 */
FacetCore.prototype._prepareExtendedRoutes = function(routeBase, routesArr) {
  var extendedRoutes = routesArr.map(function extendedRouteMapper( routeObj ) {
    routeObj.type = 'extended';
    routeObj.route = routeBase + routeObj.route;

    return routeObj;
  });

  return extendedRoutes;
}


/**
 * Binds the routes passed into the provided router instance. This function exists
 * alongside FacetApiCore::bindRoutes as it is used for binding route definitions for
 * composite facet modules (ie modules that are made up of several other facet api modules).
 * 
 * @param   {Object}   router         Router instance (express, koa, custom, etc)
 * @param   {Array}   routeOptions   Array of route definition objects
 * 
 * @return  {Object}   router
 */
FacetCore.prototype.bindRoutes = function( router, routeOptions ) {
  // console.log("STARTING FacetCore::bindRoutes ", util.inspect(routeOptions, {depth:null}));
  // console.log("");

  var _this = this;
  // set the router
  this.router = router;

  // check for routes key, ie this is a composite module containing several api classes
  if(routeOptions.hasOwnProperty('routes') && _.isArray(routeOptions.routes)){
    for( var i in routeOptions.routes ) {
      var route = routeOptions.routes[i];

      if( route.hasOwnProperty('resourceReference') ) {
        var apiInstanceName = route.resourceReference;
      }
      else {
        throw new Error('A resourceReference key is required for each route');
      }

      // add extended routes to the router manifest of the  
      // corresponding subfacet modules if defined on 
      // this route object
      if( route.hasOwnProperty('extended') ) {
        
        // console.log("-------------- extended routes found for route: ", route);

        // an array of extended route objects could be passed...
        if( _.isArray(route.extended) ) {
          var extendObj = route.extended.map(function extendedObjectMapper( currVal, idx, arr ) {
            currVal.routes = _this._prepareExtendedRoutes(currVal.routeBase, currVal.routes);
            return currVal;
          });

          for (var i = 0; i < extendObj.length; i++) {
            this[apiInstanceName].routerManifest.addRoutes(extendObj[i].routes);
          };
        }
        // or the 'extended' key may only contain a single routeBase extension
        else if( route.extended.hasOwnProperty('routeBase') && route.extended.hasOwnProperty('routes') ) {
          route.extended.routes = this._prepareExtendedRoutes(route.extended.routeBase, route.extended.routes);
          this[apiInstanceName].routerManifest.addRoutes(route.extended.routes);
        }
        // otherwise the 'extended' key has not been properly used
        else {
          throw new Error('Extended routes must be defined as an object containing \'routeBase\' and \'route\' keys or an array of such objects.')
        }
      }

      // finish handling the current route object by calling
      // FacetApiCore::bindRoutes for the module specified
      // by the 'resourceReference' key (aka apiInstanceName)
      if( this.hasOwnProperty(apiInstanceName) ) {
        this[apiInstanceName].bindRoutes( this.router, {routeBase: route.routeBase} )
      }
      else {
        throw new Error('No '+apiInstanceName+' key found on the current API class.');
      }
    } // end for( var i in routeOptions.routes )
  }
  else {
    throw new Error('Facetcore::bindRoutes requires an object with a "routes" key to be provided.');
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
  // console.log('');
  // console.log('');
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
  // console.log('in defaultSuccessCb: ', data, typeof data);
  
  // TODO: add more checks for failure to complete operation
  if( data === null || data === 0 ) {
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
  // console.log('in defaultErrorCb: ', err);

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
