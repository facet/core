'use strict'

var ConnectMiddleware = function( apiCore ) {
  this.apiCore = apiCore;
};


/**
 * Call this before any route executes
 *
 * @this     FacetApiCore
 * 
 * @param    {Object}     req    The request object
 * @param    {Object}     res    The response object
 * @param    {Function}   next   The next function in the node stack to call
 *
 * @return   {void}
 */
ConnectMiddleware.prototype.preAPIRoute = function(req, res, next) {
  this._req = req;
  this._res = res;
  this._next = next;

  next();
};


/**
 * Process route function that sets the items of the node stack
 *
 * @this FacetApiCore
 * 
 * @param    {Object}     req    The request object
 * @param    {Object}     res    The response object
 * @param    {Function}   next   The next function to call in the node stack
 *
 * @return   {void} 
 */
ConnectMiddleware.prototype.processRoute = function (apiCore) {
  var _this = this;

  return function (req, res, next) {

    var emitValue = null,
      uniqueRouteKey = req.method + '::' + req.route.path,
      emitEvent = apiCore._routeEventTracker[uniqueRouteKey];

    emitValue = _this.getRequestVariables(req, res, next);

    // emit the route event
    apiCore.intercom.emit( emitEvent, emitValue );

  }
};


/**
 * The route verb for GET
 *
 * @param    {Object}     req    The request object
 * @param    {Object}     res    The response object
 * @param    {Function}   next   The next function to call in the node stack
 *
 * @return   {void} 
 */
ConnectMiddleware.prototype.routeVerbGET = function(apiCore) {
  var _this = this;

  return function (req, res, next) {

    var emitValue = null,
      uniqueRouteKey = req.method + '::' + req.route.path,
      emitEvent = apiCore._routeEventTracker[uniqueRouteKey];

    emitValue = _this.getRequestVariables(req, res, next);

    // emit the route event
    apiCore.intercom.emit( emitEvent, emitValue );
  };
};


/**
 * The route verb for POST
 *
 * @param    {Object}     req    The request object
 * @param    {Object}     res    The response object
 * @param    {Function}   next   The next function to call in the node stack
 *
 * @return   {void} 
 */
ConnectMiddleware.prototype.routeVerbPOST = function(apiCore) {
  var _this = this;

  return function (req, res, next) {
    var emitValue = null,
      uniqueRouteKey = req.method + '::' + req.route.path,
      emitEvent = apiCore._routeEventTracker[uniqueRouteKey];

    emitValue = _this.getRequestVariables(req, res, next);

    // emit the route event
    apiCore.intercom.emit( emitEvent, emitValue );
  };
};


/**
 * The route verb for PUT
 *
 * @param    {Object}     req    The request object
 * @param    {Object}     res    The response object
 * @param    {Function}   next   The next function to call in the node stack
 *
 * @return   {void} 
 */
ConnectMiddleware.prototype.routeVerbPUT = function(apiCore){
  var _this = this;

  return function (req, res, next) {

    var emitValue = null,
      uniqueRouteKey = req.method + '::' + req.route.path,
      emitEvent = apiCore._routeEventTracker[uniqueRouteKey];

    emitValue = _this.getRequestVariables(req, res, next);

    // emit the route event
    apiCore.intercom.emit( emitEvent, emitValue );

  };
};


/**
 * The route verb for DELETE 
 *
 * @param    {Object}     req    The request object
 * @param    {Object}     res    The response object
 * @param    {Function}   next   The next function to call in the node stack
 *
 * @return   {void} 
 */
ConnectMiddleware.prototype.routeVerbDELETE = function(apiCore) {
  var _this = this;

  return function (req, res, next) {

    var emitValue = null,
      uniqueRouteKey = req.method + '::' + req.route.path,
      emitEvent = apiCore._routeEventTracker[uniqueRouteKey];

    emitValue = _this.getRequestVariables(req, res, next);

    // emit the route event
    apiCore.intercom.emit( emitEvent, emitValue );

  };
};



/**
 * Get the request variables based on method
 *
 * @param    {Object}     req    The request object
 * @param    {Object}     res    The response object
 * @param    {Function}   next   The next function to call in the node stack
 *
 * @return   {void}
 */
ConnectMiddleware.prototype.getRequestVariables = function(req, res, next) {
  // console.log('req in getRequestVariables: ', req.body, req.params, req.query);

  var emitValue = null,
    apiModelId = this.apiCore.routerManifest.manifest.apiModelId;

  // setup the get or put values
  if( req.method == 'GET' || req.method == 'PUT' ){
    emitValue = {
      conditions: {},
      fields: '',
      options: {}
    };

    if( req.hasOwnProperty("params") && req.params.hasOwnProperty(apiModelId) ){
      emitValue.conditions['_id'] = req.params[apiModelId];
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
    if( req.hasOwnProperty('body') && Object.keys(req.body).length !== 0 ){
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

  return emitValue;
};

exports = module.exports = ConnectMiddleware;

