**This module is currently in alpha and not suitable for production use.**

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
```
