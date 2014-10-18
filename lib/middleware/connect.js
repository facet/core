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
// ConnectMiddleware.prototype.processRoute = function (apiCore) {
//   var _this = this;

//   return function (req, res, next) {
//     console.log("--- running processRoute");

//     // var emitValue = null,
//     //   uniqueRouteKey = req.method + '::' + req.route.path,
//     //   emitEvent = apiCore._routeEventTracker[uniqueRouteKey];

//     // emitValue = _this.getRequestVariables(req, res, next);
//     // if( emitValue === false ) {
//     //   return false;
//     // }

//     // // emit the route event
//     // apiCore.intercom.emit( emitEvent, emitValue );
    
    
//     apiCore.intercom.emit('facet:init:nodestack', {}, true);
//   }
// };


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

  return function routeVerbGET(req, res, next) {
    

    var reqData = _this.getRequestVariables(req, res, next),
      uniqueRouteKey = req.method + '::' + req.route.path,
      routeObj = apiCore._routeEventTracker[uniqueRouteKey],
      crudEvent = routeObj.emit;

    // call the processing function directly via apiCore._requestToQuery()
    // if true is passed as processor, otherwise try emitting 

    if( routeObj.processor === true ) {
      apiCore.requestToQuery(reqData, crudEvent);
    }
    else {
      var processorEvent = (routeObj.processor) ? routeObj.processor : routeObj.emit;
      apiCore.intercom.emit( processorEvent, reqData, crudEvent );
    }
    



    // var emitValue = null,
    //   uniqueRouteKey = req.method + '::' + req.route.path,
    //   emitEvent = apiCore._routeEventTracker[uniqueRouteKey];

    // console.log(apiCore._routeEventTracker);

    // emitValue = _this.getRequestVariables(req, res, next);
    // if( emitValue === false ) {
    //   return false;
    // }

    // // emit the route event
    // apiCore.intercom.emit( emitEvent, emitValue );
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

  return function routeVerbPOST(req, res, next) {
    // console.log("--- running routeVerbPOST");

    var emitValue = null,
      uniqueRouteKey = req.method + '::' + req.route.path,
      emitEvent = apiCore._routeEventTracker[uniqueRouteKey];

    emitValue = _this.getRequestVariables(req, res, next);

    if( emitValue === false ) {
      return false;
    }

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

  return function routeVerbPUT(req, res, next) {

    // console.log("--- running routeVerbPUT");

    var emitValue = null,
      uniqueRouteKey = req.method + '::' + req.route.path,
      emitEvent = apiCore._routeEventTracker[uniqueRouteKey];

    emitValue = _this.getRequestVariables(req, res, next);
    if( emitValue === false ) {
      return false;
    }

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

  return function routeVerbDELETE(req, res, next) {

    // console.log("--- running routeVerbDELETE");

    var emitValue = null,
      uniqueRouteKey = req.method + '::' + req.route.path,
      emitEvent = apiCore._routeEventTracker[uniqueRouteKey];

    emitValue = _this.getRequestVariables(req, res, next);
    if( emitValue === false ) {
      return false;
    }

    // emit the route event
    apiCore.intercom.emit( emitEvent, emitValue );

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






  // OLD WAY:

  // var emitValue = null,
  //   apiModelId = this.apiCore.routerManifest.manifest.apiModelId;

  // // setup the get or put values
  // if( req.method == 'GET' || req.method == 'PUT' ){
  //   emitValue = {
  //     conditions: {},
  //     fields: '',
  //     options: {}
  //   };

  //   if( req.hasOwnProperty("params") && req.params.hasOwnProperty(apiModelId) ){
  //     emitValue.conditions['_id'] = req.params[apiModelId];
  //   }

  //   try {
  //     // process all the query params
  //     if( req.hasOwnProperty('query') ){
  //       // if the query param contains the q attribute
  //       if( req.query.hasOwnProperty('q') && req.query.q ){
  //         emitValue.conditions = JSON.parse(req.query.q);
  //       }
  //       // if the query param contains the f attribute
  //       if( req.query.hasOwnProperty('f') && req.query.f ){
  //         emitValue.fields = req.query.f;
  //       }
  //       // if the query param contains the o attribute
  //       if( req.query.hasOwnProperty('o') && req.query.o ){
  //         emitValue.options = JSON.parse(req.query.o);
  //       }
  //     }  
  //   }
  //   catch(e) {
  //     this.apiCore.intercom.emit('facet:response:error', 400, 'Bad query formatting. Check your JSON or the encoded q or o parameters for errors.');
  //     return false;
  //   }
    

  //   // process all the body params
  //   if( req.hasOwnProperty('body') && Object.keys(req.body).length !== 0 ){
  //     // TODO: Not sure why we need to delete conditions if body is present?
  //     // .. How is the item Id supposed to be passed through without the conditions?
      
  //     // delete the conditions 
  //     // delete emitValue.conditions;
      
  //     // delete the options 
  //     delete emitValue.options;
  //     // if the body contains the fields, set those
  //     if( req.body.hasOwnProperty('fields') ){
  //       emitValue['fields'] = req.body.fields;
  //     }
  //     // if the body contains the updates, set those
  //     if( req.body.hasOwnProperty('updates') ){
  //       emitValue['updates'] = req.body.updates;
  //     }
  //   }

  // }
  // // set up the post values
  // else if( req.method == 'POST' ) {
  //   emitValue = req.body;
  // }
  // else if( req.method = 'DELETE' ) {
  //   if( req.params.hasOwnProperty(apiModelId) && req.params[apiModelId] ){
  //     emitValue = {
  //       _id: req.params[apiModelId]
  //     };
  //   }
  // }

  // return emitValue;
};

exports = module.exports = ConnectMiddleware;

