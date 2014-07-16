"use strict";

var util = require('util'),
  _ = require('underscore');

/**
 * Router Manifest constructor
 *
 * @return {Object}                   The Router Manifest Object
 */
var RouterManifest = function(){

  this.manifest = {
    apiEventType: '',
    apiModelId: '', // this is the id for this module 
    routeBase: '',  // this can be overwritten
    routes: [
    ],
    routeErrorMessages: {
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
    }
  };

  // return this object
  return this;
};


/**
 * Set the Api Event Type
 *
 * @param   {String}   apiEventType   The api event string for building the events
 *
 * @return  {Object}                  The Router Manifest Object
 */ 
RouterManifest.prototype.setApiEventType = function(apiEventType){
  this.manifest.apiEventType = apiEventType;

  // return this object
  return this;
};


/**
 * Set the Api Model Id
 *
 * @param   {String}   apiModelId   The api model id for the model
 *
 * @return  {Object}                The Router Manifest Object
 */
RouterManifest.prototype.setApiModelId = function(apiModelId){
  this.manifest.apiModelId = apiModelId;

  // return this object
  return this;
};


/**
 * Set the route base 
 *
 * @param   {String}   routeBase   The route base for the route binding
 *
 * @return  {Object}               The Router Manifest Object
 */
RouterManifest.prototype.setRouteBase = function(routeBase){
  this.manifest.routeBase = routeBase;

  // return this object
  return this;
};


/**
 * Set the route base 
 *
 * @param   {Array}   routes       The route array of objects for the route binding
 *
 * @return  {Object}               The Router Manifest Object
 */
RouterManifest.prototype.setRoutes = function(routes){
  this.manifest.routes = routes;

  // return this object
  return this;
};


/**
 * Extend the route error messages
 *
 * @param    {Object}   routeErrorMessages   The route error message object
 *
 * @return   {Object}                        The Router Manifest Object
 */
RouterManifest.prototype.extendRouteErrorMessages = function(routeErrorMessages){
  var newRouteErrorMessages = {};
  
  // extend the current route error messages
  _.extend(newRouteErrorMessages, this.manifest.routeErrorMessages);

  // if route error messages is passed in, extend the new route error messages
  if( typeof routeErrorMessages !== 'undefined' ){
    _.extend(newRouteErrorMessages, routeErrorMessages);
  }

  // set the new route error messages
  this.manifest.routeErrorMessages = newRouteErrorMessages;

  // return this object
  return this;
};


// export the main function
exports = module.exports = RouterManifest;
