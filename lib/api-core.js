"use strict";

var util = require('util'),
  RouterManifest = require('./router-manifest'),
  FacetCore = require('./core'),
  _ = require('underscore'),
  Promise = require('promise');


/**
 * Facet API Core constructor
 * 
 * @param   {Object}   options   Options object - must contain 'db' (mongoose instance)
 *                               and 'intercom' (EventEmitter instance) keys.
 *
 * @return  {void} 
 */
var FacetApiCore = function( options ) {

  // set the options
  this.setCommonAttributes( options );

  // set the router for automation
  this.setupRouterManifest();
};


/**
 * Facet API Core inherits from Facet Core
 */
util.inherits(FacetApiCore, FacetCore);


/**
 * Sets the common attributes for this instance
 *
 * @param   {Object}   options
 */
FacetApiCore.prototype.setCommonAttributes = function ( options ) {

  //EventEmitter.call(this);
  this.router = null;
  this.options = options;
  this.intercom = options.intercom;
  this.routerManifest = new RouterManifest();

  // setting a flag to enable api access checking
  this.doAccessCheck = options.doAccessCheck || true;
  
  // the type of api auth to use, currently 'basic' and 'jwt' are supported
  this.apiAuthMethod = options.apiAuthMethod || 'basic';
  
  // api secret key used for encoding access tokens
  this.apiSecret = options.apiSecret || '';

  // was the api auth middleware used yet?
  this.apiAuthInitialized = false;

  this._routeEventTracker = {};
  this._req = null;
  this._res = null;
  this._next = null;
};


/**
 * Sets up the router manifest for route automation
 *
 * @return   {void}
 */
FacetApiCore.prototype.setupRouterManifest = function () {
  // setup the router manifest
};


/**
 * Registers API event listeners
 * 
 * @return  {void}
 */
FacetApiCore.prototype.registerEvents = function ( ) {
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
FacetApiCore.prototype.bindRoutes = function( router, routeOptions ) {
  // set the router to bind
  this.router = router;

  // register application routes
  // this.intercom.bindApplicationRoutes(routeBase, {
  //   '/': 'facet:product:find'
  // });

  // set the route base
  this.routerManifest.setRouteBase(routeOptions.route);

  // bind the router manifest
  this.bindRouterManifest();

  // return the bound router
  return this.router;

};


/**
 * [makeCheckAccessCb description]
 *
 * @param    {[type]}   queryBuilder    [description]
 * @param    {[type]}   returnPromise   [description]
 * @param    {[type]}   successCb       [description]
 * @param    {[type]}   errorCb         [description]
 *
 * @return   {[type]}                   [description]
 */
FacetApiCore.prototype.makeCheckAccessCb = function (queryBuilder, returnPromise, successCb, errorCb) {
  var _this = this;

  var checkAccessCb = function checkAccessCb(allow){
    // console.log('allow in checkAccessCb: ', allow);

    if(allow === true) {
      var promise = queryBuilder.exec();
      var result = _this.respond('facet:response:' + _this.routerManifest.manifest.apiEventType + ':data', promise, successCb, errorCb);

      if( result !== undefined ) {
        result.then(function(data) {
          returnPromise.fulfill(data);
        });
      }
    }
    else {
      var promise = new _this.options.db.Promise();
      promise.reject('Insufficient privileges to perform this action.');

      var result = _this.respond('facet:response:error', promise, successCb, errorCb);

      // console.log('result in checkAccessCb: ', result);
      
      if( result !== undefined ) {
        result.then(null, function(err) {
          returnPromise.reject(err);
        });  
      }
    }
  };

  return checkAccessCb;
};



/**
 * Find Item documents with requested fields based on query and options
 *
 * @param    {Object}     query       contains fields for conditions, fields, and options
 * @param    {Function}   successCb   custom function for handling success call backs
 * @param    {Function}   errorCb     custom function for handling error call backs
 *
 * @return   {void}
 */
FacetApiCore.prototype.find = function( query, successCb, errorCb ){
  var _this = this;

  if( typeof query === undefined || query === null ) {
    query = {
      conditions: {}
    };
  }

  if( typeof query.fields === undefined || query.fields === null ) {
    query.fields = '';
  }

  if( typeof query.options === undefined || query.options === null ) {
    query.options = {};
  }

  // query.options.lean = false;

  // scope the query to the current apiUser's container_id
  if( !_.isUndefined(this._req.apiUser) ) {
    if( _.isEmpty(this._req.apiUser.container_id) ) {
      this.intercom.emit('facet:response:error', 400, this.routerManifest.routeErrorMessages.container);
      return Promise.reject(this.routerManifest.routeErrorMessages.container);
    }

    var conditions = this.scopeConditions(query.conditions);
  }

  var queryBuilder = this.Model.find(conditions, query.fields, query.options);
  

  if( this.apiAuthInitialized && this.doAccessCheck ) {
    var returnPromise = new this.options.db.Promise();
    this.intercom.emit('facet:intercom:check:access', 
      'facet:' + this.routerManifest.manifest.apiEventType + ':find', 
      this.makeCheckAccessCb(queryBuilder, returnPromise, successCb, errorCb));
    return returnPromise;
  }
  else {
    var promise = queryBuilder.exec();
    var result = _this.respond( 'facet:response:' + this.routerManifest.manifest.apiEventType + ':data', promise, successCb, errorCb );
    if( typeof result !== 'undefined' ) {
      return result;
    }
  }
};



/**
 * Find one Item document with requested fields based on query and options
 *
 * @param    {Object}     query       contains fields for conditions, fields, and options
 * @param    {Function}   successCb   custom function for handling success call backs
 * @param    {Function}   errorCb     custom function for handling error call backs
 *
 * @return   {void}
 */
FacetApiCore.prototype.findOne = function(query, successCb, errorCb) {
  console.log('in find one: ', query)

  var _this = this;
  var initialApiAuth = query.initialApiAuth || false;
  delete query.initialApiAuth;

  if( query === undefined || query === null || !query.hasOwnProperty('conditions') ) {
    this.intercom.emit('facet:response:error', 400, this.routerManifest.manifest.routeErrorMessages.conditions);
    return Promise.reject(this.routerManifest.manifest.routeErrorMessages.conditions);
  }

  if( query.fields === undefined || query.fields === null ) {
    query.fields = '';
  }

  if( query.options === undefined || query.options === null ) {
    query.options = {};
  }

  if( _.isEmpty(query.options.lean) ) {
    query.options.lean = false;
  }

  // console.log('query: ', query);
  // console.log('wtf? ', successCb);

  var queryBuilder = this.Model.findOne(query.conditions, query.fields, query.options);
  
  // add in eager loading of sub docs
  if( !_.isEmpty(query.populate) ) {
    if( _.isArray(query.populate) ) {
      for (var i = query.populate.length - 1; i >= 0; i--) {
        queryBuilder.populate(query.populate[i]);
      };
    }
    else {
      queryBuilder.populate(query.populate);
    }
  }

  // do not access check the initial api access check
  if(initialApiAuth === true || this.doAccessCheck === false || !this.apiAuthInitialized) {
    this.checkingApiUser = false;
    var promise = queryBuilder.exec();
    var result = _this.respond( 'facet:response:' + this.routerManifest.manifest.apiEventType + ':data', promise, successCb, errorCb );
    if( typeof result !== 'undefined' ) {
      return result;
    }
  }
  else {
    var returnPromise = new this.options.db.Promise();
    var attemptedEvent = 'facet:' + this.routerManifest.manifest.apiEventType + ':findone';
    this.intercom.emit('facet:intercom:check:access', 
      attemptedEvent, 
      this.makeCheckAccessCb(queryBuilder, returnPromise, successCb, errorCb));
    return returnPromise;
  }

};


/**
 * Updates Item documents with requested fields based on query and options
 *
 * @param    {Object}     query       contains fields for conditions, fields, and options
 * @param    {Function}   successCb   custom function for handling success call backs
 * @param    {Function}   errorCb     custom function for handling error call backs
 *
 * @return   {void}
 */
FacetApiCore.prototype.update = function(query, successCb, errorCb) {
  var _this = this;
  if( typeof query === undefined || query === null || !query.hasOwnProperty('conditions') ) {
    this.intercom.emit('facet:response:error', 400, this.routerManifest.manifest.routeErrorMessages.conditions);
    return Promise.reject(this.routerManifest.manifest.routeErrorMessages.conditions);
  }

  if( !query.hasOwnProperty('updates') ) {
    this.intercom.emit('facet:response:error', 400, this.routerManifest.manifest.routeErrorMessages.update);
    return Promise.reject(this.routerManifest.manifest.routeErrorMessages.update);
  }

  if( typeof query.options === undefined || query.options === null ) {
    query.options = {};
  }

  var queryBuilder = this.Model.update(query.conditions, query.updates, query.options);

  if( this.apiAuthInitialized && this.doAccessCheck ) {
    var returnPromise = new this.options.db.Promise();
    this.intercom.emit('facet:intercom:check:access', 
      'facet:' + this.routerManifest.manifest.apiEventType + ':update', 
      this.makeCheckAccessCb(queryBuilder, returnPromise, successCb, errorCb));
    return returnPromise;
  }
  else {
    var promise = queryBuilder.exec();
    var result = _this.respond( 'facet:response:' + this.routerManifest.manifest.apiEventType + ':data', promise, successCb, errorCb );
    if( typeof result !== 'undefined' ) {
      return result;
    }
  }

};


/**
 * Creates one or more Items
 *
 * @param    {Object|Array}   data        either object w/ Item properties
 *                                        or array containing such objects
 * @param    {Function}       successCb   custom function for handling success call backs
 * @param    {Function}       errorCb     custom function for handling error call backs
 *
 * @return   {void}
 */
FacetApiCore.prototype.create = function(data, successCb, errorCb) {
  var _this = this;
  if( !data || _.isEmpty(data) ) {
    this.intercom.emit('facet:response:error', 400, this.routerManifest.manifest.routeErrorMessages.create);
    return Promise.reject(this.routerManifest.manifest.routeErrorMessages.create);
  }

  var promise = this.Model.create(data);

  if( this.apiAuthInitialized && this.doAccessCheck ) {
    var returnPromise = new this.options.db.Promise();
    this.intercom.emit('facet:intercom:check:access', 
      'facet:' + this.routerManifest.manifest.apiEventType + ':create', 
      this.makeCheckAccessCb(promise, returnPromise, successCb, errorCb));
    return returnPromise;
  }
  else {
    var result = this.respond( 'facet:response:' + this.routerManifest.manifest.apiEventType + ':data', promise, successCb, errorCb );
    if( typeof result !== 'undefined' ) {
      return result;
    }
  }

};


/**
 * Removes Item documents with requested fields based on query and options
 *
 * @param    {Object}     query       contains fields for conditions, fields, and options
 * @param    {Function}   successCb   custom function for handling success call backs
 * @param    {Function}   errorCb     custom function for handling error call backs
 *
 * @return   {void}
 */
FacetApiCore.prototype.remove = function(conditions, successCb, errorCb) {
  var _this = this;
  if( typeof conditions === undefined || conditions === null ) {
    this.intercom.emit('facet:response:error', 400, this.routerManifest.manifest.routeErrorMessages.remove);
    return Promise.reject(this.routerManifest.manifest.routeErrorMessages.remove);
  }
  
  var queryBuilder = this.Model.remove(conditions);
  
  if( this.apiAuthInitialized && this.doAccessCheck ) {
    var returnPromise = new this.options.db.Promise();
    this.intercom.emit('facet:intercom:check:access', 
      'facet:' + this.routerManifest.manifest.apiEventType + ':create', 
      this.makeCheckAccessCb(queryBuilder, returnPromise, successCb, errorCb));
    return returnPromise;
  }
  else {
    var promise = queryBuilder.exec();
    var result = _this.respond( 'facet:response:' + this.routerManifest.manifest.apiEventType + ':data', promise, successCb, errorCb );
    if( typeof result !== 'undefined' ) {
      return result;
    }
  }

};



/**
 * Apply a condition for container_id to the mongoose query
 *
 * @param    {Object}     conditions    The object of query conditions
 *
 * @return   {Object}
 */
FacetApiCore.prototype.scopeConditions = function(conditions) {
  if( _.isUndefined(conditions) || !_.isObject(conditions) ) {
    conditions = {};
  }

  if( _.isUndefined(conditions['$and']) ) {
    // move any existing condition(s) to a new $and key
    conditions['$and'] = [];
    for( var item in conditions ) {
      if( item === '$and' ) {
        continue;
      }

      if( conditions.hasOwnProperty(item) ) {
        var condObj = {};
        condObj[item] = conditions[item];
        conditions['$and'].push(condObj);
        delete conditions[item];
      }
    }
  }

  var or = [
    {container_id: this._req.apiUser.container_id},
    {container_id: { $exists: false }}
  ];
  conditions['$and'].push(or);

  return conditions;
};



/**
 * Call this before any route executes
 *
 * @param    {Object}     req    The request object
 * @param    {Object}     res    The response object
 * @param    {Function}   next   The next function in the node stack to call
 *
 * @return   {void}
 */
FacetApiCore.prototype.preAPIRoute = function(req, res, next) {
  this._req = req;
  this._res = res;
  this._next = next;

  next();
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
FacetApiCore.prototype.getRequestVariables = function(req, res, next) {
  // console.log('req in getRequestVariables: ', req.body, req.params, req.query);

  var emitValue = null,
    apiModelId = this.routerManifest.manifest.apiModelId;

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

  return emitValue;
};


/**
 * Process route function that sets the items of the node stack
 *
 * @param    {Object}     req    The request object
 * @param    {Object}     res    The response object
 * @param    {Function}   next   The next function to call in the node stack
 *
 * @return   {void} 
 */
FacetApiCore.prototype.processRoute = function (req, res, next) {

  var emitValue = null,
    uniqueRouteKey = req.method + '::' + req.route.path,
    emitEvent = this._routeEventTracker[uniqueRouteKey];

  emitValue = this.getRequestVariables(req, res, next);

  // emit the route event
  this.intercom.emit( emitEvent, emitValue );

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
FacetApiCore.prototype.routeVerbGET = function (req, res, next) {

  var emitValue = null,
    uniqueRouteKey = req.method + '::' + req.route.path,
    emitEvent = this._routeEventTracker[uniqueRouteKey];

  emitValue = this.getRequestVariables(req, res, next);

  // emit the route event
  this.intercom.emit( emitEvent, emitValue );

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
FacetApiCore.prototype.routeVerbPOST = function (req, res, next) {
  var emitValue = null,
    uniqueRouteKey = req.method + '::' + req.route.path,
    emitEvent = this._routeEventTracker[uniqueRouteKey];

  emitValue = this.getRequestVariables(req, res, next);

  // emit the route event
  this.intercom.emit( emitEvent, emitValue );

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
FacetApiCore.prototype.routeVerbPUT = function (req, res, next) {

  var emitValue = null,
    uniqueRouteKey = req.method + '::' + req.route.path,
    emitEvent = this._routeEventTracker[uniqueRouteKey];

  emitValue = this.getRequestVariables(req, res, next);

  // emit the route event
  this.intercom.emit( emitEvent, emitValue );

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
FacetApiCore.prototype.routeVerbDELETE = function (req, res, next) {

  var emitValue = null,
    uniqueRouteKey = req.method + '::' + req.route.path,
    emitEvent = this._routeEventTracker[uniqueRouteKey];

  emitValue = this.getRequestVariables(req, res, next);

  // emit the route event
  this.intercom.emit( emitEvent, emitValue );

};


/** 
 * Binds the router manifest to the provided router instance.
 *
 * @return  {void}
 */
FacetApiCore.prototype.bindRouterManifest = function() {

  var routeBase = this.routerManifest.manifest.routeBase;
  var routes = this.routerManifest.manifest.routes;

  // TODO: Decide on what to do if the router cant be found 
  // if( typeof this.router === 'undefined' || this.router === null ){
  //   throw new Error('The router must be defined.');
  //   return false;
  // }

  // bind the preAPIRoute
  this.router.use(this.preAPIRoute.bind(this));

  // iterate over the routes, and bind them
  for (var i = 0, j = routes.length; i < j; i++) {
    var routeSetting = routes[i],
      verb = routeSetting.verb.toLowerCase(),
      routeVerb = 'routeVerb' + routeSetting.verb,
      routeVerbFunction = this.processRoute,
      route = routeSetting.route,
      actualRoute = routeBase + route,
      uniqueRouteKey = routeSetting.verb + '::' + actualRoute; 

    // add the event to emit to the route tracker for retrieval during requests
    this._routeEventTracker[uniqueRouteKey] = routeSetting.emit;

    // get the router verb function
    if( this[routeVerb] ){
      routeVerbFunction = this[routeVerb];
    }

    // add the verbs to the router
    this.router.route(actualRoute)[verb](routeVerbFunction.bind(this));

  }; // end for (var i = routes.length - 1; i >= 0; i--) {

}; // end of function


// export the main function
exports = module.exports = FacetApiCore;
