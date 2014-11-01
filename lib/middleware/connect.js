'use strict'

/**
 * ConnectMiddleware object class
 *
 * @param   {object}   core   [description]
 *
 * @return   {void}
 */
var ConnectMiddleware = function( core ) {
  this.core = core;
};


/**
 * Call this before any route executes
 *
 * @this     FacetApiCore
 * 
 * @param    {object}   apiCore   The facet api core object
 *
 * @return   {function}   The return function of getRouterBinder
 */
ConnectMiddleware.prototype.facetInitBuilder = function(apiCore) {

  /**
   * The return function of getRouterBinder
   *
   * @param    {Object}     req    The request object
   * @param    {Object}     res    The response object
   * @param    {Function}   next   The next function to call in the node stack
   *
   * @return   {void}
   */
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


/**
 * [getRouterBinder description]
 *
 * @this     FacetApiCore
 *
 * @param    {object}   apiCore   The facet api core object
 *
 * @return   {function}   The return function of getRouterBinder
 */
ConnectMiddleware.prototype.getRouterBinder = function(apiCore) {
  var _this = this;

  /**
   * The return function of getRouterBinder
   *
   * @param    {Object}     req    The request object
   * @param    {Object}     res    The response object
   * @param    {Function}   next   The next function to call in the node stack
   *
   * @return   {void}
   */
  return function routerBinder(router, verb, route) {
    var routeProcessor = _this.routeVerbHandler(apiCore);
    router.route(route)[verb](routeProcessor.bind(apiCore));
  };
};


/**
 * General handler for all route verb requests
 *
 * @this     FacetApiCore
 *
 * @param    {object}   apiCore   The facet api core object
 *
 * @return   {function}   The return function of routerVerbHandler
 */
ConnectMiddleware.prototype.routeVerbHandler = function(apiCore) {
  var _this = this;

  /**
   * The return function of routeVerbHandler
   *
   * @param    {Object}     req    The request object
   * @param    {Object}     res    The response object
   * @param    {Function}   next   The next function to call in the node stack
   *
   * @return   {void}
   */
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
 * @return   {object}   The object to be used as a container for request variables
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

/**
 * Sets the exports and module.exports to ConnectMiddleware
 *
 * @type   {object}
 */
exports = module.exports = ConnectMiddleware;

