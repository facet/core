var util = require('util'),
  chai = require('chai'),
  expect = chai.expect,
  should = chai.should(),
  express = require('express'),
  RouterManifest = require('../lib/router-manifest');

var routerManifest = new RouterManifest();

describe('RouterManifest', function() {

  describe('#constructor()', function(done) {
    it('should setup router manifest object', function(done){
      var manifestObject = {
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

      expect(routerManifest.manifest).to.deep.equal(manifestObject);

      done();
    }); 
  });

  describe('#setApiEventType()', function(done) {
    it('should set the correct apiEventType', function(done){
      var value = 'item';
      routerManifest.setApiEventType(value);
      expect(routerManifest.manifest.apiEventType).to.equal(value);
      done();
    }); 
  });

  describe('#setApiModelId()', function(done) {
    it('should set the correct apiModelId', function(done){
      var value = 'itemId';
      routerManifest.setApiModelId(value);
      expect(routerManifest.manifest.apiModelId).to.equal(value);
      done();
    }); 
  });

  describe('#setRouteBase()', function(done) {
    it('should set the correct routeBase', function(done){
      var value = '/item';
      routerManifest.setRouteBase(value);
      expect(routerManifest.manifest.routeBase).to.equal(value);
      done();
    }); 
  });

  describe('#extendRouteErrorMessages()', function(done) {
    it('should extend the routeErrorMessages', function(done){
      var value = {
        conditions: 'No queries or conditions were specified',
        query: 'Error querying or conditioning for test subject(s): ',
        notFound: 'No test subject was found.',
        find: 'No test subject(s) matched your criteria.',
        findOne: 'No test subject matched your criteria.',
        update: 'No updates were specified for test subject.',
        updateMatch: 'No test subjects were updated based on your criteria.',
        create: 'No data supplied for creating new test subject.',
        createMatch: 'No test subject was created based on your criteria.',
        remove: 'No data supplied for removing test subject.',
        removeMatch: 'No test subject was removed based on your criteria.'
      };
      routerManifest.extendRouteErrorMessages(value);
      expect(routerManifest.manifest.routeErrorMessages).to.deep.equal(value);
      done();
    }); 
    it('should add to the routeErrorMessages', function(done){
      var valueObj = {},
        value = 'testErrorMessageKey';
      valueObj[value] = 'No queries or conditions were specified';
      routerManifest.extendRouteErrorMessages(valueObj);
      expect(routerManifest.manifest.routeErrorMessages).to.include.keys(value);
      done();
    }); 
  });


});

