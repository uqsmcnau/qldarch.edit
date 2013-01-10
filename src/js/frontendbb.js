var frontend = (function() {
    // Custom extensions to underscore.
    _.mixin({
        // If x is a scalar wraps in a single-element array.
        // Leaves array objects untouched.
        lifta: function(x) { return _.flatten([x], 1) },

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
        initialize: function(args) {
            this.template = _.template($("#searchdivTemplate").html())
        },
        
        events: {
            "keyup input"   : "update"
        },

        render: function() {
            this.$el.html(this.template({}));
            return this.el;
        },

        update: function() {
            this.model.set({
                'searchstring': this.$("input").val()
            });
        }
    });

    var RDFDescription = Backbone.Model.extend({
    });

    var RDFGraph = Backbone.Collection.extend({
        url: function() { return JSON_ROOT + "displayedEntities" },
        model: RdfDescription,
        parse: function(resp) {
            return _.values(resp);
        }
    });

    var DisplayedEntities = Backbone.Collection.extend({
        url: function() { return JSON_ROOT + "displayedEntities" },
        model: Entity,
        parse: function(resp) {
            return _.values(resp);
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
            console.log("Reset callback called");
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

    var ArtifactTypes = Backbone.SubCollection.extend({
        tracksort: false,
        predicate: function(model) {
                return model.get(RDFS_SUBCLASS_OF) === QA_DIGITAL_THING;
            },

        comparator: "http://qldarch.net/ns/rdf/2012-06/terms#displayPrecedence",
    });

    var ProperTypes = Backbone.SubCollection.extend({
        tracksort: false,
        predicate: function(model) { return model[RDFS_SUBCLASS_OF] !== QA_DIGITAL_THING; },
        comparator: "http://qldarch.net/ns/rdf/2012-06/terms#displayPrecedence",
    });

    var Photograph = Backbone.Model.extend({ });

    var Photographs = Backbone.Collection.extend({
        model: Photograph,

        initialize: function() {
            var that = this;
            $.getJSON(JSON_ROOT + "photographSummary", function(d) {
                that.add(
                    _.chain(d)
                        .map(function(v) { v[RDF_TYPE] = QA_INTERVIEW_TYPE; return v; })
                        .sortBy(DCT_TITLE)
                        .map(function(v) { return new Photograph(v); }));
            });
        },

        sync: function(method, collection, options) {
            ({
                create: function() {
                },
                read: function() {
                },
                update: function() {
                },
                delete: function() {
                },
            })[method]();
        }
    });

    var ContentListView = Backbone.View.extend({
    });

    function frontendOnReady() {
        var gsModel = new GeneralSearchModel();
        var gsView = new GeneralSearchView({
            el: $("#searchdiv"),
            model: gsModel
        });

        gsModel.on("change:searchstring", function() { console.log(this.get("searchstring")); }, gsModel);
        $("#searchdiv").html(gsView.render().el);

        var phModel = new Photographs();
        phModel.on("change", function() { console.log(this); });

        var displayedEntities = new DisplayedEntities();
        var artifacts = new ArtifactTypes(displayedEntities);
        var proper = new ProperTypes(displayedEntities);

        displayedEntities.on("reset", function(collection) {
            console.log("reset:displayedEntities");
            collection.each(function(entity) { console.log(entity.toJSON()); });
        });

        artifacts.on("add", function(entity) {
            console.log("add:artifacts");
            console.log(entity.toJSON());
        });

        proper.on("reset", function(collection) {
            console.log("reset:proper");
            collection.each(function(entity) { console.log(entity.toJSON()); });
        });

        displayedEntities.fetch({ update: true });
    }

    return {
        frontendOnReady: frontendOnReady
    };
})();
