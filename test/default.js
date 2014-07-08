var assert = require('assert'),
  CoreAPI = require('..'),
  Intercom = require('facet-intercom');

var appOptions = {
  intercom: new Intercom
};

var coreAPI = new CoreAPI(appOptions);

describe('default', function() {
  it('should exist', function(){
    assert(coreAPI);
  });
});
