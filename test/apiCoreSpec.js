var util = require('util'),
  chai = require('chai'),
  expect = chai.expect,
  should = chai.should(),
  express = require('express'),
  TestApiCore = require('./inc/test-api-core'),
  Intercom = require('facet-intercom');

var appOptions = {
  intercom: new Intercom
};

// var apiCore = new ApiCore( appOptions );
var testApiCore = new TestApiCore( appOptions );
var boundRouter = testApiCore.bindRoutes( express.Router() );

describe('ApiCore', function() {

  describe('#setupRouterManifest()', function(done) {
    it('should setup router manifest', function(done){
      var routes = [
        {
          verb: 'GET',
          route: '/custom',
          emit: 'facet:item:custom',
          processor: true
        },
        {
          verb: 'GET',
          route: '/:itemId',
          emit: 'facet:item:findone',
          processor: true
        },
        {
          verb: 'GET',
          route: '',
          emit: 'facet:item:find',
          processor: true
        },
        {
          verb: 'POST',
          route: '',
          emit: 'facet:item:create',
          processor: true
        },
        {
          verb: 'PUT',
          route: '/:itemId',
          emit: 'facet:item:update',
          processor: true
        },
        {
          verb: 'DELETE',
          route: '/:itemId',
          emit: 'facet:item:remove',
          processor: true
        },
      ];

      expect(testApiCore.routerManifest.manifest.apiEventType).to.equal('item');
      expect(testApiCore.routerManifest.manifest.routeBase).to.equal('/items');
      expect(testApiCore.routerManifest.manifest.routes).to.deep.equal(routes);

      done();
    }); 
  });
  

  // make sure that listners have been registered
  describe('#registerEvents()', function(done) {
    it('should have a function named `registerEvents`', function(done){
      expect(testApiCore.registerEvents).to.a('function');
      done();
    });

    it('should register facet:item:<action> events', function(done){
      expect(testApiCore.intercom.listenerCount('facet:item:findone')).to.equal(1);
      expect(testApiCore.intercom.listenerCount('facet:item:find')).to.equal(1);
      expect(testApiCore.intercom.listenerCount('facet:item:create')).to.equal(1);
      expect(testApiCore.intercom.listenerCount('facet:item:update')).to.equal(1);
      expect(testApiCore.intercom.listenerCount('facet:item:remove')).to.equal(1);

      done();
    });
  });
  
  describe('#makeCheckAccessCb', function(done) {

    it('should have a function named `makeCheckAccessCb`', function(done){
      expect(testApiCore.makeCheckAccessCb).to.a('function');
      done();
    });
    
    it('should return a function', function(done){
      expect(testApiCore.makeCheckAccessCb()).to.a('function');
      done();
    });

    // it('should allow access if allow is a boolean triple equaled to true', function(done){
    //   testApiCore.
    //   expect(testApiCore.makeCheckAccessCb(true));
    //   done();
    // });
  });


});

