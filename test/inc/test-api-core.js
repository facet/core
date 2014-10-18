"use strict";

var util = require('util'),
  ApiCore = require('../..').ApiCore;

var TestApiCore = function(options){
  // call the parent constructor
  TestApiCore.super_.call(this, options);
};

util.inherits(TestApiCore, ApiCore);

TestApiCore.prototype.setupRouterManifest = function () {
  // setup the router manifest
  this.routerManifest
    .setApiEventType('item')
    .setApiModelId('itemId')
    .setRouteBase('/items')
    .addRoutes([
      { verb: 'GET',    route: '/custom',  emit: 'facet:item:custom' },  // GET a single item by id
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
};

TestApiCore.prototype.registerEvents = function ( ) {
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
};

// export the main function
exports = module.exports = TestApiCore;
