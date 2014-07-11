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
  this.setOptions(options);
};

/**
 * Sets the options for this instance
 *
 * @param   {Object}   options
 */
FacetCore.prototype.setOptions = function ( options ) {

  //EventEmitter.call(this);
  this.router = null;
  this.options = options;
  this.intercom = options.intercom;
  this.routerManifest = {};
  this._routeEventTracker = {};
};

/**
 * Sets up the router manifest for route automation
 *
 * @return   {void}
 */
FacetCore.prototype.setupRouterManifest = function () {
  this.routerManifest = {};
};

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
  // console.log('listener count for '+fEvent+': ', this.intercom.listenerCount(fEvent));
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


/** 
 * Binds the router manifest to the provided router instance.
 *
 * @return  {void}
 */
FacetCore.prototype.bindRouterManifest = function() {

  var routeBase = this.routerManifest.routeBase;
  var routes = this.routerManifest.routes;
  var apiModelId = this.routerManifest.apiModelId;

  // TODO: Decide on what to do if the router cant be found 
  // if( typeof this.router === 'undefined' || this.router === null ){
  //   throw new Error('The router must be defined.');
  //   return false;
  // }
  
  var _this = this;

  // bind the preAPIRoute
  this.router.use(function preAPIRoute(req, res, next) {
    _this._req = req;
    _this._res = res;
    _this._next = next;

    next();
  });

  // iterate over the routes, and bind them
  for (var i = 0, j = routes.length; i < j; i++) {
    var routeSetting = routes[i],
      verb = routeSetting.verb.toLowerCase(),
      route = routeSetting.route,
      actualRoute = routeBase + route,
      uniqueRouteKey = routeSetting.verb + '::' + actualRoute; 

    // add the event to emit to the route tracker for retrieval during requests
    this._routeEventTracker[uniqueRouteKey] = routeSetting.emit;

    // add the verbs to the router
    this.router.route(actualRoute)[verb](function ( req, res, next ) {

        var emitValue = null,
          uniqueRouteKey = req.method + '::' + req.route.path,
          emitEvent = _this._routeEventTracker[uniqueRouteKey];

        // setup the get or put values
        if( req.method == 'GET' || req.method == 'PUT' ){
          emitValue = {
            conditions: {},
            fields: '',
            options: {}
          };

          if( req.hasOwnProperty("params") && req.params.hasOwnProperty(apiModelId) ){
            emitValue['id'] = req.params[apiModelId];
          }

          // process all the query params
          if( req.hasOwnProperty('query') ){
            // if the query param contains the q attribute
            if( req.query.hasOwnProperty('q') && req.query.q ){
              emitValue.conditions = JSON.parse(req.query.q);
            }
            // if the query param contains the f attribute
            if( req.query.hasOwnProperty('q') && req.query.f ){
              emitValue.fields = JSON.parse(req.query.f);
            }
            // if the query param contains the o attribute
            if( req.query.hasOwnProperty('o') && req.query.o ){
              emitValue.options = JSON.parse(req.query.o);
            }
          }

          // process all the body params
          if( req.hasOwnProperty('body') ){
            // delete the conditions 
            delete emitValue.conditions;
            // delete the options 
            delete emitValue.options;
            // if the body contains the fields, set those
            if( req.body.hasOwnProperty('fields') ){
              emitValue['fields'] = req.body.fields;
            }
            // if the body contains the updates, set those
            if( req.body.hasOwnProperty('updates') ){
              emitValue['updates'] = req.body.updates;
            }
          }

        }
        // set up the post values
        else if ( req.method == 'POST' ){
          emitValue = req.body;
        }

        // emit the route event
        _this.intercom.emit( emitEvent, emitValue );

      }); // this.router.route(actualRoute)[verb](function ( req, res, next ) {

  }; // end for (var i = routes.length - 1; i >= 0; i--) {

}; // end of function

// export the main function
exports = module.exports = FacetCore;
