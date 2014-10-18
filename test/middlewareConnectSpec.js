var util = require('util'),
  chai = require('chai'),
  expect = chai.expect,
  should = chai.should(),
  express = require('express'),
  ConnectMiddleware = require('../lib/middleware/connect'),
  ApiCore = require('../lib/api-core'),
  TestApiCore = require('./inc/test-api-core'),
  Intercom = require('facet-intercom');

var appOptions = {
  intercom: new Intercom
};

var testApiCore = new TestApiCore( appOptions );
var boundRouter = testApiCore.bindRoutes( express.Router() );
var connectMiddleware = new ConnectMiddleware( testApiCore );

describe('ConnectMiddleware', function() {

  describe('#constructor()', function(done) {

    it('should setup the instance correctly', function(done){
      expect(connectMiddleware.apiCore).to.deep.equal(testApiCore);
      expect(connectMiddleware.apiCore).to.be.an.instanceof(ApiCore);
      done();
    }); 

  });

  describe('#facetInitBuilder()', function(done) {

    var nextWasCalled = false;

    it('should return a function', function(done){
      expect(connectMiddleware.facetInitBuilder(testApiCore)).to.be.a('function');
      done();
    });

    it('should emit an event "facet:init:nodestack" with correct nodeStack object', function(done){
      var testNodeStack = {
        req: {
          test: 'test'
        },
        res: {
          test1: 'test1'
        },
        next: function(){ nextWasCalled = true }
      };
      testApiCore.intercom.on('facet:init:nodestack', function(nodeStack){
        expect(nodeStack).to.be.a('object');
        expect(nodeStack).to.deep.equal(testNodeStack);
        done();  
      });
      connectMiddleware.facetInitBuilder(testApiCore)(testNodeStack.req,testNodeStack.res,testNodeStack.next);
    }); 

    it('should call next() in the returned function', function(done){
      expect(nextWasCalled).to.be.equal(true);
      done(); 
    }); 

  });

  describe('#routeVerbGET()', function(done) {

    var nextWasCalled = false;

    it('should return a function', function(done){
      expect(connectMiddleware.routeVerbGET(testApiCore)).to.be.a('function');
      done();
    });

    it('should emit an event for the GET method as a processor', function(done){
      var testNodeStack = {
        req: {
          method: 'GET',
          route: {
            path: '/items/custom'
          }
        },
        res: {
          test1: 'test1'
        },
        next: function(){ nextWasCalled = true }
      };
      testApiCore.intercom.on('facet:item:custom', function(query){
        expect(query).to.be.a('object');
        done();  
      });
      connectMiddleware.routeVerbGET(testApiCore)(testNodeStack.req,testNodeStack.res,testNodeStack.next);
    }); 

  });

  describe('#getRequestVariables()', function(done) {
    var testNodeStack = {
      req: {
        method: 'GET',
        headers: {
          'Content-Type': 'utf8'
        },
        params: {
          key1: 'key1'
        },
        query: 'SOME EXPRESSION THAT MAY CONTAIN SYMBOLS !@#$!@#(%!U@ER)UFS)(dufs90dfu12#($U',
        body: "facet test yay!!\n facet test yay!!\n facet test yay!!\n facet test yay!!\n facet test yay!!\n facet test yay!!\n facet test yay!!\n facet test yay!!\n facet test yay!!\n facet test yay!!\n facet test yay!!\n facet test yay!!\n"
      },
      res: {
        test1: 'test1'
      },
      next: function(){}
    };

    var returnedNodeStack = connectMiddleware.getRequestVariables(testNodeStack.req,testNodeStack.res,testNodeStack.next);

    it('should return an object', function(done){
      expect(returnedNodeStack).to.be.an('object');
      done();
    });

    it('should return request method', function(done){
      expect(returnedNodeStack).to.contain.keys('method');
      expect(returnedNodeStack.method).to.be.equal(testNodeStack.req.method);
      done();
    });

    it('should return request headers', function(done){
      expect(returnedNodeStack).to.contain.keys('headers');
      expect(returnedNodeStack.headers).to.be.deep.equal(testNodeStack.req.headers);
      done();
    });

    it('should return request params', function(done){
      expect(returnedNodeStack).to.contain.keys('params');
      expect(returnedNodeStack.params).to.be.deep.equal(testNodeStack.req.params);
      done();
    });

    it('should return request query', function(done){
      expect(returnedNodeStack).to.contain.keys('query');
      expect(returnedNodeStack.query).to.equal(testNodeStack.req.query);
      done();
    });

    it('should return request body', function(done){
      expect(returnedNodeStack).to.contain.keys('body');
      expect(returnedNodeStack.body).to.equal(testNodeStack.req.body);
      done();
    });

  });

});

