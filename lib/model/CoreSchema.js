var _ = require('underscore'),
  util = require('util'),
  murmurhash = require('murmurhash');

function CoreSchema(options){

  var Schema = options.db.Schema,
    ObjectId = options.db.Types.ObjectId;

  var CoreSchema = function() {
    options.db.Schema.apply(this, arguments);

    this.add({
      'container_id': { type: Schema.Types.ObjectId, ref: 'ContainerSchema' },
      'app_id': { type: Schema.Types.ObjectId, ref: 'ApplicationSchema' },
      'hash': { type: Number, required: 'The hash is required.' }
    });

    this.pre('validate', function(next) {
      this.id = ObjectId();
      this.hash = murmurhash.v3(this.id.toString());
      next();
    });

  };

  util.inherits(CoreSchema, options.db.Schema);

  // console.log(util.inspect(CoreSchema, { showHidden: true, depth: 1, colors: true }));

  return CoreSchema;
};


module.exports = exports = CoreSchema;
