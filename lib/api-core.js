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

  this.registerApiCoreEvents();

  // load the appropriate middleware generating class
  // this.middleware = new require('./middleware/'+this.middlewareType)(this);
  var middlewareClass = require('./middleware/'+this.middlewareType);
  this.middleware = new middlewareClass(this);
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
 * Registers core level events
 * 
 * @return  {void}
 */
FacetApiCore.prototype.registerApiCoreEvents = function ( ) {
  var _this = this;
  
  // set the nodeStack (contains req, res, next keys)
  this.intercom.on('facet:init:nodestack', function initNodeStack(nodeStack, force) {
    if( _.isEmpty(_this.nodeStack) || force ) {
      _this.nodeStack = nodeStack;
    }
  });
};


/**
 * [makeCheckAccessCb description]
 *
 * @param    {Object}   queryBuilder    [description]
 * @param    {Object}   returnPromise   [description]
 * @param    {Function}   successCb     [description]
 * @param    {Function}   errorCb       [description]
 *
 * @return   {Function}   
 * [description]
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

  // TODO: clean fields (ex. container_id, +password, +api_key, +<sensitive_fields>)
  var fields = query.fields;
  // TODO: scope the conditions even if not api user? or perhaps not??
  var conditions = query.conditions;
  // scope the query to the current apiUser's container_id (if present)
  conditions = this.scopeConditions(query.conditions);

  var queryBuilder = this.Model.find(conditions, fields, query.options);

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
 * @return   {Object}
 */
FacetApiCore.prototype.findOne = function(query, successCb, errorCb) {
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

  var conditions = this.scopeConditions(query.conditions);
  var queryBuilder = this.Model.findOne(conditions, query.fields, query.options);
  
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
  // if(initialApiAuth === true || this.doAccessCheck === false || !this.apiAuthInitialized) {
  if( this.apiAuthInitialized && this.doAccessCheck ) {
    var returnPromise = new this.options.db.Promise();
    var attemptedEvent = 'facet:' + this.routerManifest.manifest.apiEventType + ':findone';
    this.intercom.emit('facet:intercom:check:access', 
      attemptedEvent, 
      this.makeCheckAccessCb(queryBuilder, returnPromise, successCb, errorCb));
    return returnPromise;
  }
  else {
    this.checkingApiUser = false;
    var promise = queryBuilder.exec();
    var result = _this.respond( 'facet:response:' + this.routerManifest.manifest.apiEventType + ':data', promise, successCb, errorCb );
    if( typeof result !== 'undefined' ) {
      return result;
    }
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

  var conditions = this.scopeConditions(query.conditions);

  // do not allow container_id to be udpated through API requests
  if( !_.isUndefined(query.updates.container_id) && !_.isUndefined(this._req.apiUser) ) {
    delete query.updates.container_id;
  }
  var queryBuilder = this.Model.update(conditions, query.updates, query.options);

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

  // add in the api user's container_id if present
  if( !_.isUndefined(this._req.apiUser.container_id) ) {
    data['container_id'] = this._req.apiUser.container_id;
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
  
  // TODO: scope the conditions even if not api user? or perhaps not??
  // scope the query to the current apiUser's container_id (if present)
  conditions = this.scopeConditions(conditions);

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
      // ignore the newly created $and key
      if( item === '$and' ) 
        continue;

      if( conditions.hasOwnProperty(item) ) {
        var condObj = {};
        condObj[item] = conditions[item];
        conditions['$and'].push(condObj);
        delete conditions[item];
      }
    }
  }

  if( this.nodeStack && this.nodeStack.req && this.nodeStack.req.apiUser && !_.isUndefined(this.nodeStack.req.apiUser.container_id) ) {
    conditions['$and'].push({container_id: this.nodeStack.req.apiUser.container_id});
  }

  // if no conditions were passed and no apiUser exists, delete the empty $and key
  if( _.isEmpty(conditions['$and']) ) {
    delete conditions['$and'];
  }

  return conditions;
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
  // this.router.use(this.preAPIRoute.bind(this));
  this.router.use(this.middleware.preAPIRoute.bind(this));

  // iterate over the routes, and bind them
  for (var i = 0, j = routes.length; i < j; i++) {

    // object containing keys for verb (ie 'post'), 
    // route (ie '/auth', does not include route base),
    // and emit (ie 'facet:auth:login:account') as 
    // setup in routerManifest for classes extending FacetApiCore
    var routeSetting = routes[i];

    // the current request verb, ie 'post'
    var verb = routeSetting.verb.toLowerCase();

    // formatted verb name to use as function name
    // for CRUD functions, ie 'routeVerbPOST'
    // corresponds to a prototype function on this class
    var routeVerb = 'routeVerb' + routeSetting.verb;
    
    // the actual CRUD function for the requested method
    var routeVerbFunction = this.middleware.processRoute(this);
    
    // the currently requested route, not including route
    // base, ie '/account'
    var route = routeSetting.route;
    
    // the full route path, including route base
    // ie: '/auth/account'
    var actualRoute = routeBase + route;
    
    // key for looking up CRUD event to emit for this request
    // ie: 'POST::/auth/account'
    var uniqueRouteKey = routeSetting.verb + '::' + actualRoute;;

    // add the event to emit to the route tracker for retrieval during requests
    this._routeEventTracker[uniqueRouteKey] = routeSetting.emit;

    // get the router verb function
    if( this.middleware[routeVerb] ){
      // console.log('middleware[routerVerb] was found... ');
      routeVerbFunction = this.middleware[routeVerb](this);
    }

    // add the verbs to the router
    // this.router.route(actualRoute)[verb](routeVerbFunction.bind(this));
    this.router.route(actualRoute)[verb](routeVerbFunction);

  }; // end for (var i = routes.length - 1; i >= 0; i--) {

}; // end of function


// export the main function
exports = module.exports = FacetApiCore;
