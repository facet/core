<p align="center"><img src="https://raw.github.com/facet/facet.github.io/master/images/facet-logo-horizontal.png" /></p>

# Facet Core

Base object that provides common functionality and gets extended by the other facet modules. Core offers access to the following functionality:

* Abstration of middleware specific code for framework agnostic use
* Handling of request/response lifecycle
* Built in CRUD functionality via find, findOne, create, update, delete functions for any resource you create
* Management of event bus (aka [Intercom](https://github.com/facet/intercom)) used for decoupled module communication


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
