var util = require('util'),
  chai = require('chai'),
  expect = chai.expect,
  should = chai.should(),
  express = require('express'),
  ConnectMiddleware = require('../lib/middleware/connect'),
  Core = require('../lib/core'),
  Intercom = require('facet-intercom');

var appOptions = {
  intercom: new Intercom
};

var testCore = new Core(appOptions);
var connectMiddleware = new ConnectMiddleware(testCore);

describe('ConnectMiddleware', function() {

  describe('#constructor()', function(done) {

    it('should setup the instance correctly', function(done){
      expect(connectMiddleware.apiCore).to.deep.equal(testCore);
      expect(connectMiddleware.apiCore).to.be.an.instanceof(Core);
      done();
    }); 

  });

  describe('#facetInitBuilder()', function(done) {

    var nextWasCalled = false;

    it('should return a function', function(done){
      expect(connectMiddleware.facetInitBuilder(testCore)).to.be.a('function');
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
      testCore.intercom.on('facet:init:nodestack', function(nodeStack){
        expect(nodeStack).to.be.a('object');
        expect(nodeStack).to.deep.equal(testNodeStack);
        done();  
      });
      connectMiddleware.facetInitBuilder(testCore)(testNodeStack.req,testNodeStack.res,testNodeStack.next);
    }); 

    it('should call next() in the returned function', function(done){
      expect(nextWasCalled).to.be.equal(true);
      done(); 
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

