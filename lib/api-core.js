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
var FacetApiCore = function ( options ) {
  FacetApiCore.super_.call(this, options);
};


/**
 * Facet API Core inherits from Facet Core
 */
util.inherits(FacetApiCore, FacetCore);



/**
 * Example of a router manifest for route automation.
 * This function would be defined in classes that inheric FacetApiCore.
 *
 * @return   {void}
 */
// FacetApiCore.prototype.setupRouterManifest = function () {
  // For Example:
  /* * /
  // setup the router manifest
  this.routerManifest
    .setApiEventType('item')
    .setApiModelId('itemId')
    .setRouteBase('/items')
    .setRoutes([
      { verb: 'GET',    route: '/:itemId', emit: 'facet:item:findone' },  // GET a single item by id
      { verb: 'GET',    route: '',         emit: 'facet:item:find'    },  // GET an array of item objects 
      { verb: 'POST',   route: '',         emit: 'facet:item:create'  },  // POST new item
      { verb: 'PUT',    route: '/:itemId', emit: 'facet:item:update'  },  // PUT single/multiple items
      { verb: 'DELETE', route: '/:itemId', emit: 'facet:item:remove'  },  // DELETE a single item resource
    ])
    .extendRouteErrorMessages({
      container: 'The API user does not have a valid container id.',
      conditions: 'No query conditions were specified',
      query: 'Error querying for item(s): ',
      notFound: 'No item was found.',
      find: 'No item(s) matched your criteria.',
      findOne: 'No item matched your criteria.',
      update: 'No updates were specified.',
      updateMatch: 'No items were updated based on your criteria.',
      create: 'No data supplied for creating new item.',
      createMatch: 'No item was created based on your criteria.',
      remove: 'No data supplied for removing item.',
      removeMatch: 'No item was removed based on your criteria.'
    });
  /* */
// };


/**
 * Registers API event listeners
 * 
 * @return  {void}
 */
// FacetApiCore.prototype.registerEvents = function ( ) {
  // For example:
  /* * /
  var _this = this;

  this.intercom.on('facet:item:data', function handleitemData( data, nodeStack ) {
    data.then( function( itemData ) {
      if( null === itemData ){
        _this.intercom.emit('facet:response:error', 404, 'item was not found.');
      }
      else {
        _this.intercom.emit('facet:response:item:data', itemData);
      }
    },
    function( err ) {
      _this.intercom.emit('facet:response:error', 404, 'Error querying for item(s): ' + err.message);
    }).end();
  });
  this.intercom.on( 'facet:item:find',     this.find.bind(this)    );
  this.intercom.on( 'facet:item:findone',  this.findOne.bind(this) );
  this.intercom.on( 'facet:item:create',   this.create.bind(this)  );
  this.intercom.on( 'facet:item:update',   this.update.bind(this)  );
  this.intercom.on( 'facet:item:remove',   this.remove.bind(this)  );
  /* */
// };



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

      var error = {
        status: 401,
        message: 'Insufficient privileges to perform this action.',
        name: 'AccessError'
      };
      promise.reject(error);

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
    var fields = '';
  }
  else {
    // clean fields (ex. tenant_id, +password, +api_key, +<sensitive_fields>)
    var fields = this.cleanFields(query.fields, 'GET');
  }

  if( typeof query.options === undefined || query.options === null ) {
    query.options = {};
  }

  // console.log("in api core find: ", conditions, fields, query.options);

  var conditions = this.scopeConditions(query.conditions);

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
  else {
    // clean fields (ex. tenant_id, +password, +api_key, +<sensitive_fields>)
    query.fields = this.cleanFields(query.fields, 'GET');
  }

  if( query.options === undefined || query.options === null ) {
    query.options = {};
  }

  if( _.isEmpty(query.options.lean) ) {
    query.options.lean = false;
  }

  var conditions = this.scopeConditions(query.conditions);
  var queryBuilder = this.Model.findOne(conditions, query.fields, query.options);
  

  // console.log("in api core findOne: ", conditions, query.fields, query.options);


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
  conditions = this.cleanFields(conditions, 'PUT');

  // do not allow tenant_id to be udpated through API requests
  if( !_.isUndefined(query.updates.tenant_id) && !_.isUndefined(this._req.apiUser) ) {
    delete query.updates.tenant_id;
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

  // add in the api user's tenant_id if present
  if( this.nodeStack.req && this.nodeStack.req.apiUser && !_.isUndefined(this.nodeStack.req.apiUser.tenant_id) ) {
    data['tenant_id'] = this.nodeStack.req.apiUser.tenant_id;
  }

  data = this.cleanFields(data, 'POST');
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

  // console.log('conditionsin remove: ', conditions);

  var _this = this;
  if( typeof conditions === undefined || conditions === null ) {
    this.intercom.emit('facet:response:error', 400, this.routerManifest.manifest.routeErrorMessages.remove);
    return Promise.reject(this.routerManifest.manifest.routeErrorMessages.remove);
  }
  
  // TODO: scope the conditions even if not api user? or perhaps not??
  // scope the query to the current apiUser's tenant_id (if present)
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
 * Removes restricted fields from fields paramter.
 * Restricted fields are defined in each API class constructor by the
 * this.STRIP_FIELDS object
 *
 * @param    {string|Object}  method    GET/POST/PUT/DELETE
 * @param    {string}         fields    The requested fields list
 *
 * @return   {string|Object}
 */
FacetApiCore.prototype.cleanFields = function(fields, method) {
  if( !method ) {
    throw new Error('a method (GET/POST/PUT/DELETE) is required when calling FacetApiCore::cleanFields()');
  }
  method = method.toUpperCase();

  if( method === 'GET') {
    // check if comma was used as delimiter
    if( fields ) {
      if( /\s*,\s*/.test(fields) ) {
        fields = fields.split(/\s*,\s*/g);
      }
      // otherise assume a space is used as delimiter
      else {
        fields = fields.split(/\s+/g);
      }

      if( this.STRIP_FIELDS && _.isArray(this.STRIP_FIELDS[method]) ) {
        this.STRIP_FIELDS[method].forEach(function(field) {
          // console.log(field, fields.indexOf(field))
          var idx = fields.indexOf(field);
          var plusIdx = fields.indexOf('+'+field);
          if( idx !== -1 ) {
            delete fields[idx];
          }
          else if( plusIdx !== -1 ) {
            delete fields[plusIdx];
          }
        });  
      }

      return fields.join(' ');  
    }
  }
  else if( method === 'PUT' || method === 'POST' ) {
    this.STRIP_FIELDS[method].forEach(function(field) {
      if( fields.hasOwnProperty(field) ){
        delete fields[field];
      }
    });

    return fields;
  }
  
  return '';
};


/**
 * Apply a condition for tenant_id to the mongoose query
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

  if( this.nodeStack && this.nodeStack.req && this.nodeStack.req.apiUser && !_.isUndefined(this.nodeStack.req.apiUser.tenant_id) ) {
    conditions['$and'].push({tenant_id: this.nodeStack.req.apiUser.tenant_id});
  }

  // if no conditions were passed and no apiUser exists, delete the empty $and key
  if( _.isEmpty(conditions['$and']) ) {
    delete conditions['$and'];
  }

  return conditions;
};





/** 
 * TODO: I think this function needs to be moved to the 
 * middleware class as it has router specific binding calls
 * ie: this.router.route(actualRoute)[verb](routeVerbFunction);
 * or: this.router.use
 *
 * 
 * Binds the router manifest to the provided router instance.
 *
 * @return  {void}
 */
FacetApiCore.prototype.bindRouterManifest = function() {

  var routeBase = this.routerManifest.manifest.routeBase;
  var resourceReference = this.routerManifest.manifest.resourceReference;
  var routes = this.routerManifest.manifest.routes;

  // console.log("binding the following routes with route base: ", routeBase);
  // console.log(routes);
  // console.log("");

  // TODO: Decide on what to do if the router cant be found 
  if( typeof this.router === 'undefined' || this.router === null ){
    throw new Error('No router has been defined for route binding.');
    return false;
  }

  // console.log("routes in FacetApiCore::bindRouterManifest: ", routes);

  // iterate over the routes, and bind them
  for (var i = 0, j = routes.length; i < j; i++) {

    // object containing keys for verb (ie 'post'), 
    // route (ie '/auth', does not include route base),
    // and emit (ie 'facet:auth:login:account') as 
    // setup in routerManifest for classes extending FacetApiCore
    var routeSetting = routes[i];

    // console.log("binding route: ");
    // console.log(routeSetting);
    // console.log("");

    // the current request verb, ie 'post'
    var verb = routeSetting.verb.toLowerCase();

    // formatted verb name to use as function name
    // for CRUD functions, ie 'routeVerbPOST'
    // corresponds to a prototype function on this class
    var routeVerb = 'routeVerb' + routeSetting.verb;
    
    // the actual CRUD function for the requested method
    // var routeVerbFunction = this.middleware.processRoute(this);
    var routeVerbFunction = undefined;
    
    // the currently requested route, not including route
    // base, ie '/account'
    var route = routeSetting.route;
    
    // the full route path, including route base (if this is non-extended)
    // ie: '/auth/account'
    var actualRoute = (routeSetting.type && routeSetting.type === 'extended') ? route : routeBase + route;
    
    // key for looking up CRUD event to emit for this request
    // ie: 'POST::/auth/account'
    var uniqueRouteKey = routeSetting.verb + '::' + actualRoute;

    // add the event to emit to the route tracker for retrieval during requests
    this._routeEventTracker[uniqueRouteKey] = routeSetting.emit;

    // get the router verb function
    if( this.middleware[routeVerb] ){
      routeVerbFunction = this.middleware[routeVerb](this);
    }

    // console.log(actualRoute, verb, routeVerbFunction);

    // add the verbs to the router
    // this.router.route(actualRoute)[verb](routeVerbFunction.bind(this));
    this.router.route(actualRoute)[verb](routeVerbFunction);

  }; // end for (var i = 0, j = routes.length; i < j; i++)

}; // end of function


// export the main function
exports = module.exports = FacetApiCore;
