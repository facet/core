'use strict';

var FacetCore = require('../lib').Core,
	Intercom = require('facet-intercom'),
	RouterManifest = require('../lib/router-manifest'),
	chai = require('chai'),
	sinon = require('sinon'),
	sinonChai = require('sinon-chai'),
	expect = chai.expect,
	express = require('express'),
	TestCore = require('./inc/CoreTest'),
	util = require('util'),
	coreInstance,
	sandbox;

chai.should();
chai.use(sinonChai);
chai.use(require('chai-things'));

var appOptions = {
	intercom: new Intercom(),
	middlewareType: 'connect'
};

describe('FacetCore', function() {

	describe('#constructor', function() {

		beforeEach(function(done) {
			// appOptions.intercom = new Intercom();
			sandbox = sinon.sandbox.create();
			done();
		});

		afterEach(function(done) {
			sandbox.restore();
			done();
		});

		it('calls setCommonAttributes() with options object', function() {
			sandbox.spy(FacetCore.prototype, 'setCommonAttributes');
			coreInstance = new FacetCore(appOptions);
			coreInstance.setCommonAttributes.should.have.been.calledWith(appOptions);
		});

		it('instantiates the middleware handler class', function() {
			coreInstance = new FacetCore(appOptions);
			expect(coreInstance.middleware).to.be.an('object');
		});

		it('calls registerCoreEvents() once', function() {
			sandbox.spy(FacetCore.prototype, 'registerCoreEvents');
			coreInstance = new FacetCore(appOptions);
			coreInstance.registerCoreEvents.should.have.been.called.once;
		});
	});


	describe('#facetInit', function() {

		it('returns a middleware function', function() {
			coreInstance = new FacetCore(appOptions);
			expect(coreInstance.facetInit()).to.be.an('function');
		});
	});


	describe('#setCommonAttributes', function() {

		it('sets a options key on the instance', function() {
			coreInstance = new FacetCore(appOptions);
			expect(coreInstance.options).to.deep.equal(appOptions);
		});

		it('sets intercom key on the instance', function() {
			coreInstance = new FacetCore(appOptions);
			expect(coreInstance.intercom).to.be.an.instanceof(Intercom);
		});

		it('instantiates RouterManifest', function() {
			coreInstance = new FacetCore(appOptions);
			expect(coreInstance.routerManifest).to.be.an.instanceof(RouterManifest)
		});		

		it('defaults doAccessCheck to true', function() {
			coreInstance = new FacetCore(appOptions);
			expect(coreInstance.doAccessCheck).to.be.true;
		});

		it('sets doAccessCheck based on provided options', function() {
			appOptions.doAccessCheck = false;
			coreInstance = new FacetCore(appOptions);
			expect(coreInstance.doAccessCheck).to.be.false;
		});

		it('sets apiAuthMethod', function() {
			appOptions.apiAuthMethod = 'jwt';
			coreInstance = new FacetCore(appOptions);
			expect(coreInstance.apiAuthMethod).to.equal('jwt');
		});

		it('sets apiSecret', function() {
			appOptions.apiSecret = 'abc123';
			coreInstance = new FacetCore(appOptions);
			expect(coreInstance.apiSecret).to.equal('abc123');
		});

		// TODO: is apiAuthInitialized still used anywhere?
		it('defaults apiAuthInitialized', function() {
			coreInstance = new FacetCore(appOptions);
			expect(coreInstance.apiAuthInitialized).to.equal.false;
		});

		it('defaults middlewareType to "connect"', function() {
			delete appOptions.middlewareType;
			coreInstance = new FacetCore(appOptions);
			expect(coreInstance.middlewareType).to.equal('connect');
		});

		it('initializes remaining necessary objects', function() {
			coreInstance = new FacetCore(appOptions);
			expect(coreInstance._routeEventTracker).to.be.an('object');
			expect(coreInstance.nodeStack).to.be.an('object');
			expect(coreInstance.STRIP_FIELDS).to.be.an('object');
			expect(coreInstance._respondFacetEvent).to.be.null;
		})
	});


	describe('#registerCoreEvents', function() {
		before(function() {
			appOptions.intercom = new Intercom();
			coreInstance = new FacetCore(appOptions);
		});

		it('sets listener for facet:init:nodestack', function() {
			var count = coreInstance.intercom.listenerCount('facet:init:nodestack');
			expect(count).to.equal(1);
		});

		it('sets listener for facet:init:apiauth', function() {
			var count = coreInstance.intercom.listenerCount('facet:init:apiauth');
			expect(count).to.equal(1);
		});
	});


	describe('#noop', function() {

		it('exists', function() {
			coreInstance = new FacetCore(appOptions);
			expect(coreInstance.noop).to.be.an('function');
		})
	});


	describe('#_prepareExtendedRoutes', function() {
		before(function() {
			appOptions.intercom = new Intercom();
			coreInstance = new FacetCore(appOptions);
		});

		it('adds "type" key to route objects', function() {
			var routeBase = '/base';
			var routesArr = [
				{
					route: '/some/route'
				},
				{
					route: '/another/route'
				}
			];

			var result = coreInstance._prepareExtendedRoutes(routeBase, routesArr);
			
			for(var i=0; i<result.length; i++) {
				expect(result[i].type).to.equal('extended');
			}
		});

		it('concats routeBase to route key of each object in routesArr', function() {
			var routeBase = '/base';
			var routesArr = [
				{
					route: '/some/route'
				},
				{
					route: '/another/route'
				}
			];
			var expectedRoutes = ['/base/some/route', '/base/another/route'];

			var result = coreInstance._prepareExtendedRoutes(routeBase, routesArr);
			
			for(var i=0; i<result.length; i++) {
				expect(result[i].route).to.equal(expectedRoutes[i]);
			}
		});
	});


	describe('#bindRoutes', function() {
		beforeEach(function(done) {
			sandbox = sinon.sandbox.create();
			done();
		});

		afterEach(function(done) {
			sandbox.restore();
			done();
		});

		it('throws error if routes key is not an array', function() {
			appOptions.intercom = new Intercom();
			coreInstance = new FacetCore(appOptions);

			expect(coreInstance.bindRoutes.bind(coreInstance, express.Router(), {routes: null})).to.throw(Error);
		});

		it('calls the bindRoutes() of each subfacet module defined on this composite module', function() {
			var testCore = new TestCore(appOptions);
			var subFacetBinderSpy = sandbox.spy(testCore.Items, 'bindRoutes');
			var routeObject = {
				routes: [{
					resourceReference: 'Items',
					routeBase: '/items'
				}]
			};
			var router = express.Router();
			
			testCore.bindRoutes(router, routeObject);
			
			subFacetBinderSpy.should.have.been.calledWith(router, {
				routeBase: '/items'
			});
		});

		xit('error handling for malformed extended route object', function() {
		});

		it('adds extended routes to corresponding API instance router manifest', function() {
			var testCore = new TestCore(appOptions);
			// var subFacetBinderSpy = sandbox.spy(testCore.Items.routerManifest, 'addRoutes');
			var routeObject = {
				routes: [{
					resourceReference: 'Items',
					routeBase: '/items',
					extended: [
						{
        			routeBase: '/widgets/:widgetId',
        			routes: [
        				{ verb: 'GET', route: '/items', emit: 'facet:item:find', processor: true },
        				{ verb: 'POST', route: '/items', emit: 'facet:item:create', processor: true }
        			]
      			},
      			{
      				routeBase: '/burps/:burpId',
      				routes: [
      					{ verb: 'GET', route: '/items', emit: 'facet:item:find', processor: true },
        				{ verb: 'POST', route: '/items', emit: 'facet:item:create', processor: true }
      				]
      			}
      		]
				}]
			};
			var expectedRoutes = [
				{ verb: 'GET', route: '/widgets/:widgetId/items', emit: 'facet:item:find', processor: true, type: 'extended' },
       	{ verb: 'POST', route: '/widgets/:widgetId/items', emit: 'facet:item:create', processor: true, type: 'extended' },
       	{ verb: 'GET', route: '/burps/:burpId/items', emit: 'facet:item:find', processor: true, type: 'extended' },
        { verb: 'POST', route: '/burps/:burpId/items', emit: 'facet:item:create', processor: true, type: 'extended' }
			];
			var router = express.Router();
			
			testCore.bindRoutes(router, routeObject);
			
			for(var i=0; i<expectedRoutes.length; i++) {
				testCore.Items.routerManifest.manifest.routes.should.include(expectedRoutes[i]);
			}
		});
	});
});


