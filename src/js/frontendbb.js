var frontend = (function() {
    // Custom extensions to underscore.
    _.mixin({
        // If x is a scalar wraps in a single-element array.
        // Leaves array objects untouched.
        lifta: function(x) { return x === undefined ? [] : _.flatten([x], true); },

        // Defers evaulation of a function until forced by _.force.
        // To match the behaviour of _.result, it leaves non-functions untouched.
        lazy: function(f) {
            if (_.isFunction(f)) {
                return function() { return f.apply({}, _.rest(arguments)); }
            } else {
                return f;
            }
        },

        force: function(f) { return _.result({}, f); },
    });

    var JSON_ROOT = "/ws/rest/";
    var QA_DISPLAY = "http://qldarch.net/ns/rdf/2012-06/terms#display";
    var QA_LABEL = "http://qldarch.net/ns/rdf/2012-06/terms#label";
    var QA_EDITABLE = "http://qldarch.net/ns/rdf/2012-06/terms#editable";
    var QA_SYSTEM_LOCATION = "http://qldarch.net/ns/rdf/2012-06/terms#systemLocation";
    var QA_DISPLAY_PRECIDENCE = "http://qldarch.net/ns/rdf/2012-06/terms#displayPrecedence";

    var OWL_DATATYPE_PROPERTY = "http://www.w3.org/2002/07/owl#DatatypeProperty";
    var RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    var RDFS_SUBCLASS_OF = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
    var RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";

    var QA_INTERVIEW_TYPE = "http://qldarch.net/ns/rdf/2012-06/terms#Interview";
    var QA_PHOTOGRAPH_TYPE = "http://qldarch.net/ns/rdf/2012-06/terms#Photograph";
    var QA_LINEDRAWING_TYPE = "http://qldarch.net/ns/rdf/2012-06/terms#LineDrawing";
    var QA_DIGITAL_THING = "http://qldarch.net/ns/rdf/2012-06/terms#DigitalThing";

    var DCT_TITLE = "http://purl.org/dc/terms/title";

    var successDelay = 2000;

    var properties = { };
    var types = { };
    var contentByRdfType = { };
    var contentByURI = { };
    var entities = { };
    var resourcesByRdfType = { };

    var GeneralSearchModel = Backbone.Model.extend({
        defaults: {
            'searchstring' : ""
        }
    });

    var GeneralSearchView = Backbone.View.extend({
        initialize: function(options) {
            this.template = _.template($("#searchdivTemplate").html())
            _.bindAll(this, '_keyup', '_update');
            options.model.on("change:searchstring", this._update);
        },
        
        events: {
            "keyup input"   : "_keyup"
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        _keyup: function() {
            this.model.set({
                'searchstring': this.$("input").val()
            });
        },

        _update: function() {
            this.$("input").val(this.model.get("searchstring"));
        }
    });

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
        }
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
        _doReset : function(collection, options) {
            this.reset(collection.filter(this.predicate), options);
        },

        _doAdd : function(model, collection, options) {
            // TODO: Handle the 'at' option, this will counting the number of models in
            //  the base collection that don't match the predicate that are also to the
            //  left of 'at', and adjusting the 'at' option passed thru to compensate.
            //  Of course, this will only be necessary if tracksort=true is used.
            if (this.predicate(model)) {
                this.add(model, options);
            }
        },

        _doRemove : function(model, collection, options) {
            if (this.predicate(model)) {
                this.remove(model, _.omit(options, 'index'));
            }
        },

        _doSort : function(collection, options) {
            if (_.result(this.tracksort)) {
                this.comparator = this.baseCollection.comparator;
                this.sort(options);
            }
        },

        bindToBaseCollection : function() {
            this.baseCollection.on("add", this._doAdd, this);
            this.baseCollection.on("remove", this._doRemove, this);
            this.baseCollection.on("reset", this._doReset, this);
            this.baseCollection.on("sort", this._doSort, this);
        },

        predicate: function() { return true; }
    });

    SubCollection.extend = Collection.extend;

    Backbone.SubCollection = SubCollection;

    var DigitalContentView = Backbone.View.extend({
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#digitalContentTemplate").html());
            this.content = options.content;
            _.bindAll(this, 'render');
            if (options.initialize) { options.initialize.call(this); }
        },
        
        render: function() {
            this.$el.html(this.template());
            this.model.each(function(artifactType) {
                if (artifactType.get('uri') && this.content[artifactType.get('uri')]) {
                    var contentView = new ContentTypeView({
                        model: this.content[artifactType.uri],
                        type: artifactType
                    });
                    this.$('#contentdiv').append(contentView.render().el);
                }
            }, this);
            return this;
        },
    });

    var ContentTypeView = Backbone.View.extend({
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#contenttypeTemplate").html());
            _.bindAll(this, 'render');
            if (options.initialize) { options.initialize.call(this); }
        },
        
        render: function() {
            this.$el.html(this.template({
                uri: this.options.type.get('uri'),
                label: this.options.type.get(QA_LABEL)
            }));
            /*
            this.model.each(function(model) {
                this.$el.append(this.template({
                    uri: model.get('uri'),
                    label: model.get(QA_LABEL)
                }));
            }, this);
            */
            return this;
        },
    });

    function frontendOnReady() {
        var searchModel = new GeneralSearchModel();
        var searchView = new GeneralSearchView({
            id: "mainsearch",
            model: searchModel
        });

        searchModel.on("change:searchstring", function() { console.log(this.get("searchstring")); }, searchModel);
        searchView.render();

        var displayedEntities = new RDFGraph([], {
            url: function() { return JSON_ROOT + "displayedEntities" },
        });

        var photographs = new RDFGraph([], {
            url: function() { return JSON_ROOT + "photographSummary" },
            comparator: DCT_TITLE,
        });

        var linedrawings = new RDFGraph([], {
            url: function() { return JSON_ROOT + "lineDrawingSummary" },
            comparator: DCT_TITLE,
        });

        var interviews = new RDFGraph([], {
            url: function() { return JSON_ROOT + "interviewSummary" },
            comparator: DCT_TITLE,
        });

        var entities = new RDFGraph([], {
            url: function() { return JSON_ROOT + "entities" },
            comparator: DCT_TITLE,
        });

        var artifacts = new SubCollection(displayedEntities, {
            name: "artifacts",
            tracksort: false,
            predicate: function(model) {
                    return model.get(RDFS_SUBCLASS_OF) === QA_DIGITAL_THING;
                },

            comparator: QA_DISPLAY_PRECIDENCE,
        });

        var proper = new SubCollection(displayedEntities, {
            name: "proper",
            tracksort: false,
            predicate: function(model) {
                    return model.get(RDFS_SUBCLASS_OF) !== QA_DIGITAL_THING;
                },

            comparator: QA_DISPLAY_PRECIDENCE,
        });

        photographs.on("reset", function(collection) {
            console.log("reset:photographs: " + collection.length);
        });

        var contentView = new DigitalContentView({
            id: "maincontent",
            model: artifacts,
            content: {
                "http://qldarch.net/ns/rdf/2012-06/terms#Interview": interviews,
                "http://qldarch.net/ns/rdf/2012-06/terms#Photograph": photographs,
                "http://qldarch.net/ns/rdf/2012-06/terms#LineDrawing": linedrawings
            },
            initialize: function() {
                artifacts.on("reset", this.render, this);
                artifacts.on("reset", function() { console.log(this.toJSON()); }, artifacts);
            }
        });

        displayedEntities.fetch();
        photographs.fetch();
        interviews.fetch();
        linedrawings.fetch();

        $("#column1").html(searchView.render().el);
        $("#column2").html(contentView.render().el);
    }

    return {
        frontendOnReady: frontendOnReady
    };
})();
