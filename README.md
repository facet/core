**This module is currently in beta and not suitable for production use.**

# core

Base object that provides common functionality and gets extended by the other facet modules


## Example

```js
"use strict";
var util = require('util'),
  ApiCore = require('facet-core').ApiCore;

var ProductAPI = function ( options ){};

/**
 * Product API inherits from Core API
 */
util.inherits(ProductAPI, ApiCore);

// query.conditions, query.fields, and query.options 
// are regular mongoose queries
var query = {
  conditions: {name: 'Cool Item'},
  fields: '',
  options: {
    lean: true
  }
}

// FacetApiCore.find() is a wrapper for mongoose's find(), same 
// with findOne(), create(), remove() and update()
ProductAPI.find(query, successCb, errorCb);
```
