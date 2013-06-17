// Backbone.ViewModel v0.1.0
//
// Copyright (C)2012 Tom Hallett
// Distributed Under MIT License
//
// Documentation and Full License Available at:
// http://github.com/tommyh/backbone-view-model

Backbone.ViewModel = (function(Backbone, _, undefined){
  'use strict';

  var Model = Backbone.Model,
    ViewModel = function(attributes, options) {
      Model.apply(this, [attributes, options]);
      this.initializeViewModel();
    };

  _.extend(ViewModel.prototype, Model.prototype, {

    initializeViewModel: function(){
      this.set(this.get("source_models"));
      this.source_models = _.union(_.values(this.get('source_models')), (this.get('source_model') || []));
      this.setComputedAttributes();
      this.bindToChangesInSourceModel();
    },

    setComputedAttributes: function(){
      _.each(this.computed_attributes, function(value, key){
        var val = value.call(this);
        this.set(key, val);
      }, this);
    },

    bindToChangesInSourceModel: function(){
      _.each(this.source_models, function(model) {
          model.on("change", this.setComputedAttributes, this);
          model.on("add", this.setComputedAttributes, this);
          model.on("remove", this.setComputedAttributes, this);
          model.on("reset", this.setComputedAttributes, this);
      }, this);
    }

  });

  ViewModel.extend = Model.extend;

  return ViewModel;
})(Backbone, _);

Backbone.ViewCollection = (function(Backbone, _, undefined) {
    'use strict';

    var Model = Backbone.Model;
    var Collection = Backbone.Collection;

    var ViewCollection = function(options) {
        Collection.apply(this, [[], options]);
        this.sources = options.sources;
        this.initializeViewCollection();
        this.trackSort = !!options.trackSort;
        this.name = (options.name || "Unnamed ViewCollection");
        this.options = options;
    };

    _.extend(ViewCollection.prototype, Collection.prototype, {
        initializeViewCollection: function() {
            this.setComputedAttributes();
            this.bindToChangesInSources();
        },

        setComputedAttributes: function() {
            this.set(this.computeModelArray());
        },

        bindToChangesInSources: function(){
            _.each(this.sources, function(collection) {
                this.listenTo(collection, "add", this.setComputedAttributes, this);
                this.listenTo(collection, "remove", this.setComputedAttributes, this);
                this.listenTo(collection, "reset", this.setComputedAttributes, this);
                this.listenTo(collection, "change", this.setComputedAttributes, this);
                this.listenTo(collection, "destroy", this.setComputedAttributes, this);
                if (this.trackSort) {
                    this.listenTo(collection, "sort", this.setComputedAttributes, this);
                }
            }, this);
        }
    });

    ViewCollection.extend = Collection.extend;

    return ViewCollection;
})(Backbone, _);
