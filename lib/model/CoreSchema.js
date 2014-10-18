var _ = require('underscore'),
  util = require('util'),
  murmurhash = require('murmurhash');

function CoreSchema(options){

  var Schema = options.db.Schema,
    ObjectId = options.db.Types.ObjectId;

  var CoreSchema = function() {
    options.db.Schema.apply(this, arguments);

    this.add({
      'tenant_id': { type: Schema.Types.ObjectId, ref: 'ContainerSchema' },
      'app_id': { type: Schema.Types.ObjectId, ref: 'ApplicationSchema' },
      'shard_key': { type: String, required: 'The shard_key is required.' }
    });

    // TODO: should this be based on environment or direct appOptions setting?
    if( options.environment === 'production' ) {
      // make sure mongoose does not call ensureIndex
      // at startup in proudction environments
      this.add({
        autoIndex: false
      });
    }

    this.pre('validate', function(next) {
      this._id = new ObjectId();
      
      // create shard key
      var hash = murmurhash.v3(this._id.toHexString());
      if( this.app_id ) {
        this.shard_key = hash + this.app_id.toHexString();  
      }
      else {
        this.shard_key = hash;
      }

      next();
    });

    this.pre('save', function(next) {
      var now = new Date().toISOString();
      this.created_at = now;
      this.updated_at = now;

      next();
    });
  };

  util.inherits(CoreSchema, options.db.Schema);

  // console.log(util.inspect(CoreSchema, { showHidden: true, depth: 1, colors: true }));

  return CoreSchema;
};


module.exports = exports = CoreSchema;
