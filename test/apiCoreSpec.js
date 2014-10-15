var util = require('util'),
  chai = require('chai'),
  expect = chai.expect,
  should = chai.should(),
  ApiCore = require('..').ApiCore,
  TestApiCore = require('./inc/test-api-core')
  Intercom = require('facet-intercom');

var appOptions = {
  intercom: new Intercom
};

// var apiCore = new ApiCore(appOptions);
var testApiCore = new TestApiCore(appOptions);

describe('ApiCore', function() {

  describe('#setupRouterManifest()', function(done) {
    it('should setup router manifest', function(done){
      var routes = [
        {
          verb: 'GET',
          route: '/:itemId',
          emit: 'facet:item:findone'
        },
        {
          verb: 'GET',
          route: '',
          emit: 'facet:item:find'
        },
        {
          verb: 'POST',
          route: '',
          emit: 'facet:item:create'
        },
        {
          verb: 'PUT',
          route: '/:itemId',
          emit: 'facet:item:update'
        },
        {
          verb: 'DELETE',
          route: '/:itemId',
          emit: 'facet:item:remove'
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
      expect(testApiCore.intercom.listenerCount('facet:item:api:basic')).to.equal(1);
      expect(testApiCore.intercom.listenerCount('facet:item:api:jwt')).to.equal(1);
      expect(testApiCore.intercom.listenerCount('facet:item:login:account')).to.equal(1);
      expect(testApiCore.intercom.listenerCount('facet:item:login:jwt')).to.equal(1);

      done();
    });
  });


});

