'use strict'

var ConnectMiddleware = function( core ) {
  this.core = core;
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
ConnectMiddleware.prototype.facetInitBuilder = function(apiCore) {

  return function facetInit(req, res, next) {
    var nodeStack = {
      req: req,
      res: res,
      next: next
    };

    // console.log("running facetInit, res exists? ", nodeStack.hasOwnProperty('res'));
    apiCore.intercom.emit('facet:init:nodestack', nodeStack, true);
    next();
  }
};



ConnectMiddleware.prototype.getRouterBinder = function(apiCore) {
  var _this = this;

  return function routerBinder(router, verb, route) {
    var routeProcessor = _this.routeVerbHandler(apiCore);
    router.route(route)[verb](routeProcessor.bind(apiCore));
  };
};




/**
 * General handler for all route verb requests
 *
 * @param    {Object}     req    The request object
 * @param    {Object}     res    The response object
 * @param    {Function}   next   The next function to call in the node stack
 *
 * @return   {void} 
 */
ConnectMiddleware.prototype.routeVerbHandler = function(apiCore) {
  var _this = this;

  return function routeVerbHandler(req, res, next) {
    var reqData = _this.getRequestVariables(req, res, next),
      uniqueRouteKey = req.method + '::' + req.route.path,
      routeObj = apiCore._routeEventTracker[uniqueRouteKey],
      crudEvent = routeObj.emit;

    if( routeObj.processor === true ) {
      apiCore.requestToQuery(reqData, crudEvent);
    }
    else {
      var processorEvent = (routeObj.processor) ? routeObj.processor : routeObj.emit;
      apiCore.intercom.emit( processorEvent, reqData, crudEvent );
    }
  };
};



/**
 * Get the request variables based on method
 *
 * @this     <some router instance>
 *
 * @param    {Object}     req    The request object
 * @param    {Object}     res    The response object
 * @param    {Function}   next   The next function to call in the node stack
 *
 * @return   {void}
 */
ConnectMiddleware.prototype.getRequestVariables = function(req, res, next) {
  // console.log('req in getRequestVariables: ', req.body, req.params, req.query);

  var emitValue = {
    params: {},
    body: {},
    query: {},
    headers: req.headers,
    method: req.method
  };
  
  if( req.hasOwnProperty("params") ) {
    emitValue.params = req.params;
  }

  if( req.hasOwnProperty('query') ){
    emitValue.query = req.query;
  }

  if( req.hasOwnProperty('body') ) {
    emitValue.body = req.body;
  }

  return emitValue;
};

exports = module.exports = ConnectMiddleware;

