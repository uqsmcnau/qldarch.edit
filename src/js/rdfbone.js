(function(Backbone, $, _, undefined) {
    var Model = Backbone.Model;
    var RDFDescription = Backbone.Model.extend({
        idAttribute: "uri",

        subject: function() { return this.uri; },

        predicates: function() {
            return _.chain(this.toJSON())
                .keys()
                .reject(function(k) { return k === 'uri'; })
                .value();
        },

        objects: function() {
            return _.chain(this.toJSON()).values().flatten().value();
        },

        get: function(name) {
            return Model.prototype.get.call(this, name);
        },

        geta: function(name) {
            var result = Model.prototype.get.call(this, name);
            return _.isArray(result) ? result : ( _.isUndefined(result) ? [] : [ result ]);
        },

        geta_: function(name) {
            return _(this.geta(name));
        },

        get1: function(name, logmultiple, logtrace) {
            var result = this.geta(name);
            if (logmultiple && result.length > 1) {
                console.log("Multiple values found for " + this.id + " predicate(" + name + "): ['"
                        + result.join("', '") + "']");
                if (logtrace) console.trace();
            }
            return result[0];
        },

    });

    // This should probably be a sub-class rather than sub-type of Collection.
    var RDFGraph = Backbone.Collection.extend({
        model: RDFDescription,

        parse: _.values,

        initialize: function(models, options) {
            options || (options = {});
            if (options.url) this.url = options.url
        }
    });

    var Collection = Backbone.Collection;
    var SubCollection = function(baseCollection, options) {
        options || (options = {})
        this.name = options.name;
        if (options.predicate) this.predicate = options.predicate;
        this.baseCollection = baseCollection ? baseCollection : new Collection([], options);

        Collection.apply(this, [this.baseCollection.filter(this.predicate), options]);

        if (options.tracksort) this.tracksort = options.tracksort;
        if (_.result(this.tracksort)) {
            this.comparator = this.baseCollection.comparator;
            this.sort({silent: true}); // This should be a noop given the in-order filter above.
        }
        this.bindToBaseCollection();
    }

    _.extend(SubCollection.prototype, Collection.prototype, {
        _doReset : function _doReset(collection, options) {
            this.reset(collection.filter(this.predicate), options);
        },

        _doAdd : function _doAdd(model, collection, options) {
            // TODO: Handle the 'at' option, this will counting the number of models in
            //  the base collection that don't match the predicate that are also to the
            //  left of 'at', and adjusting the 'at' option passed thru to compensate.
            //  Of course, this will only be necessary if tracksort=true is used.
            if (this.predicate(model)) {
                this.add(model, options);
            }
        },

        _doRemove : function _doRemove(model, collection, options) {
            if (this.predicate(model)) {
                this.remove(model, _.omit(options, 'index'));
            }
        },

        _doSort : function _doSort(collection, options) {
            if (_.result(this.tracksort)) {
                this.comparator = this.baseCollection.comparator;
                this.sort(options);
            }
        },

        bindToBaseCollection : function bindToBaseCollection() {
            this.baseCollection.on("add", this._doAdd, this);
            this.baseCollection.on("remove", this._doRemove, this);
            this.baseCollection.on("reset", this._doReset, this);
            this.baseCollection.on("sort", this._doSort, this);
        },

        predicate: function () { return true; },

        setPredicate: function setPredicate(predicate) {
            this.predicate = predicate;
            this._doReset(this.baseCollection, {});
        }
    });

    SubCollection.extend = Collection.extend;

    /*
     * WARNING: This is not working yet.
     * */
    var UnionCollection = function(baseCollections, options) {
        options || (options = {})
        if (options.predicate) this.predicate = options.predicate;
        this.baseCollections = baseCollections;

        Collection.apply(this, [[], options]);
        this._doReset();
        this.bindToBaseCollections();
    }

    _.extend(UnionCollection.prototype, Collection.prototype, {
        _doReset : function(collection, options) {
            this.reset(_.flatten(_.pluck(this.baseCollections, 'models')), options);
        },

        _doAdd : function(model, collection, options) {
            this.add(model, options);
        },

        _doRemove : function(model, collection, options) {
            if (!_.any(this.baseCollections, function(collection) {
                return collection.get(model);
            }, this)) {
                this.remove(model, _.omit(options, 'index'));
            }
        },

        bindToBaseCollections : function() {
            _.each(this.baseCollections, function(collection) {
                collection.on("add", this._doAdd, this);
                collection.on("remove", this._doRemove, this);
                collection.on("reset", this._doReset, this);
            }, this);
        },
    });

    UnionCollection.extend = UnionCollection.extend;

    var CachedRDFGraph = function(initialModels, options) {
        RDFGraph.apply(this, [initialModels, options]);
        if (options.constructURL) this.constructURL = options.constructURL;
    }

    _.extend(CachedRDFGraph.prototype, RDFGraph.prototype, {
        getp: function(resourceURIs, callback, context) {
            var uris = _.flatten(resourceURIs);
            var models = _.reduce(uris, function(memo, uri) {
                var model = this.get(uri);
                if (!_.isUndefined(model)) {
                    memo.cached.push(model);
                } else {
                    memo.uncached.push(uri);
                }
                return memo;
            }, { cached: [], uncached: [] }, this);

            if (models.uncached.length == 0) {
                callback.call(context, models.cached);
            } else {
                var url = this.constructURL(models.uncached);
                var that = this;
                $.get(url)
                    .done(function resourceCallbackSuccess(data) {
                        _.each(_.values(data), function resourceCallback(resource) {
                            var rdf = new RDFDescription(resource);
                            this.add(rdf);
                            models.cached.push(rdf);
                        }, that);
                        callback.call(context, models.cached);
                    })
                    .fail(function resourceCallbackError(jqXHR) {
                        console.log("ERROR fetching models: " + jqXHR.responseText);
                        callback.call(context, models.cached);
                    });
            }
        },

        constructURL: function(id) {
            console.log("ERROR: no constructURL(id) not defined");
            return id;
        },

        fetch: function() {
            console.log("ERROR: fetch not supported on CachedRDFGraph");
            return;
        },
    });

    CachedRDFGraph.extend = _.extend;

    Backbone.RDFGraph = RDFGraph;
    Backbone.RDFDescription = RDFDescription;
    Backbone.SubCollection = SubCollection;
    Backbone.UnionCollection = UnionCollection;
    Backbone.CachedRDFGraph = CachedRDFGraph;
})(Backbone, $, _);
