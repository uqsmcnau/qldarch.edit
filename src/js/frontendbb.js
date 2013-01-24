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

    var SearchModel = Backbone.Model.extend({
        defaults: {
            'searchstring': "",
            'searchtypes': ['all']
        },

        serialize: function() {
            return encodeURIComponent(this.get('searchstring'))
                + "/" + _.map(this.get('searchtypes'), encodeURIComponent).join(",");
        },

        deserialize: function(string) {
            var first = string.split("/");
            var second = first[1].split(",");
            return {
                'searchstring': decodeURIComponent(first[0]),
                'searchtypes': _.map(second, decodeURIComponent),
            };
        },
    });

    var GeneralSearchView = Backbone.View.extend({
        initialize: function(options) {
            this.template = _.template($("#searchdivTemplate").html());
            this.router = options.router;
            _.bindAll(this, '_keyup', '_update');
            options.model.on("change:searchstring", this._update);
        },
        
        events: {
            "keyup input"   : "_keyup"
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            this._update();
            return this;
        },

        _keyup: function() {
            this.model.set({
                'searchstring': this.$("input").val(),
                'searchtypes': ['all'],
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

        predicate: function() { return true; },

        setPredicate: function(predicate) {
            this.predicate = predicate;
            _doReset(this.baseCollection, {});
        }
    });

    SubCollection.extend = Collection.extend;

    Backbone.SubCollection = SubCollection;

    var DigitalContentView = Backbone.View.extend({
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#digitalContentTemplate").html());
            this.content = options.content;
            this.search = options.search;
            this.router = options.router;
            _.bindAll(this, 'render');
            if (options.initialize) { options.initialize.call(this); }
        },

        render: function() {
            this.$el.html(this.template());
            this.model.each(function(artifactType) {
                if (artifactType.get('uri') && this.content[artifactType.get('uri')]) {
                    var contentView = new ContentTypeView({
                        router: this.router,
                        model: this.content[artifactType.get('uri')],
                        type: artifactType,
                        search: this.search
                    });
                    this.$('#contentdiv').append(contentView.render().el);
                }
            }, this);
            return this;
        },
    });

    var ContentTypeView = Backbone.View.extend({
        className: 'typeview',
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#contenttypeTemplate").html());
            this.search = options.search;
            _.bindAll(this, 'render', 'onupdate');
            if (options.initialize) { options.initialize.call(this); }
            this.model.on("reset", this.onupdate);
        },
        
        render: function() {
            var searchtypes = this.search.get('searchtypes');
            if (!_.contains(searchtypes, 'all') &&
                !_.contains(searchtypes, this.options.type.get('uri'))) {
                    this.$el.hide();
            } else {
                this.$el.html(this.template({
                    uri: this.options.type.get('uri'),
                    label: this.options.type.get(QA_LABEL)
                }));

                this.model.each(function(contentItem) {
                    var itemView = new ContentItemView({
                        router: this.router,
                        model: contentItem,
                        search: this.search
                    });
                    this.$('.contentlist').append(itemView.render().el);
                }, this);
            }

            return this;
        },

        onupdate: function() {
            this.render();
        },
    });

    var ContentItemView = Backbone.View.extend({
        className: "contententry",
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#itemTemplate").html());
            this.search = options.search;
            this.router = options.router;
            _.bindAll(this, 'render');
            if (options.initialize) { options.initialize.call(this); }
        },
        
        render: function() {
            this.$el.html(this.template({
                label: this.model.get(DCT_TITLE)
            }));

            return this;
        },
    });

    var EntityContentView = Backbone.View.extend({
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#entityContentTemplate").html());
            this.content = options.content;
            this.search = options.search;
            this.router = options.router;
            _.bindAll(this, 'render');
            if (options.initialize) { options.initialize.call(this); }
        },
        
        render: function() {
            this.$el.html(this.template());
            this.model.each(function(entityType) {
                if (entityType.get('uri')) {
                    var entityView = new EntityTypeView({
                        model: new SubCollection(this.content, {
                            name: "entity subcollection",
                            tracksort: false,
                            predicate: function(model) {
                                    return model.get(RDF_TYPE) === entityType.get('uri');
                                },
                            comparator: QA_LABEL,
                        }),
                        type: entityType,
                        router: this.router,
                        search: this.search,
                    });
                    this.$('#entitydiv').append(entityView.render().el);
                }
            }, this);

            return this;
        },
    });

    var EntityTypeView = Backbone.View.extend({
        className: 'typeview',
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#entitytypeTemplate").html());
            this.type = options.type;
            this.router = options.router;
            this.search = options.search;
            this.itemviews = {};

            _.bindAll(this, 'render', '_update', '_keyup', '_setinput', '_updater');

            if (options.initialize) { options.initialize.call(this); }
            this.model.on("reset", this._updater);
            this.search.on("change:searchstring", this._setinput);

            console.log("Showing");
            console.log(this.model);
            console.log(this.type);

            this.rendered = false;
            this.visible = false;
        },
        
        events: {
            "keyup input"   : "_keyup"
        },

        render: function() {
            this.$el.html(this.template({
                uri: this.type.get('uri'),
                label: this.type.get(QA_LABEL)
            }));

            this.model.each(function(entityItem) {
                var itemView = new EntityItemView({
                    router: this.router,
                    model: entityItem,
                });
                this.itemviews[entityItem.get('uri')] = itemView;
                this.$('.entitylist').append(itemView.render().el);
            }, this);

            this._update();
            this._setinput();

            return this;
        },

        _keyup: function() {
            this.search.set({
                'searchstring': this.$("input").val(),
                'searchtypes': [this.type.get('uri')],
            });
        },

        _updater: function() {
            this.render();
        }, 

        _update: function() {
            var searchtypes = this.search.get('searchtypes');
            var searchstring = this.search.get('searchstring');
            if (_.contains(searchtypes, 'all') ||
                _.contains(searchtypes, this.options.type.get('uri'))) {

                this.$el.show();
                _.each(this.itemviews, function(itemview) {
                    itemview.visibility(function(itemmodel) {
                        return partialstringmatch(itemmodel, searchstring);
                    });
                }, this);
            } else {
                this.$el.hide();
            }
        },

        _setinput: function() {
            this.$("input").val(this.search.get('searchstring'));
            this._update();
        }
    });

    function partialstringmatch(resource, value) {
        var val = $.trim(value);
        if (!val) {
            return true;
        }

        var found = false;
        val.split(/\W/).forEach(function(word) {
            if (word != "" && (
                    resource.get(QA_LABEL) && resource.get(QA_LABEL).toLowerCase().indexOf(word.toLowerCase()) != -1 ||
                    resource.get(RDFS_LABEL) && resource.get(RDFS_LABEL).toLowerCase().indexOf(word.toLowerCase()) != -1)) {
                    
                found = true;
            }
        });

        return found;
    }

    var EntityItemView = Backbone.View.extend({
        className: "entityentry",
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#itemTemplate").html());
            this.router = options.router;
            _.bindAll(this, 'render');
            if (options.initialize) { options.initialize.call(this); }
            this.$placeholder = $('<span display="none" data-uri="' + this.model.get('uri') + '"/>');
            this.rendered = false;
            this.visible = false;
        },
        
        render: function() {
            this.$el.html(this.template({
                label: this.model.get(QA_LABEL)
            }));

            this.rendered = true;
            this.visible = true;

            return this;
        },

        visibility: function(predicate) {
            if (this.rendered) {
                if (predicate(this.model)) {
                    if (!this.visible) {
                        this.$placeholder.after(this.$el).detach();
                        this.visible = true;
                    }
                } else {
                    if (this.visible) {
                        this.$el.after(this.$placeholder).detach();
                        this.visible = false;
                    }
                }
            }
        },
    });

    var QldarchRouter = Backbone.Router.extend({
        routes: {
            "": "frontpage",
            "search(/*search)": "frontpage",
        }
    });

    function frontendOnReady() {
        var router = new QldarchRouter();

        var searchModel = new SearchModel();
        var searchView = new GeneralSearchView({
            id: "mainsearch",
            model: searchModel,
            router: router
        });

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
            comparator: QA_LABEL,
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

        searchModel.on("change", function(model) {
            console.log("\tCHANGE:SEARCHMODEL: " + JSON.stringify(model.toJSON()));
        });

        photographs.on("reset", function(collection) {
            console.log("\tRESET:PHOTOGRAPHS: " + collection.length);
        });

        entities.on("reset", function(collection) {
            console.log("\tRESET:ENTITIES: " + collection.length);
        });

        var contentView = new DigitalContentView({
            router: router,
            id: "maincontent",
            model: artifacts,
            content: {
                "http://qldarch.net/ns/rdf/2012-06/terms#Interview": interviews,
                "http://qldarch.net/ns/rdf/2012-06/terms#Photograph": photographs,
                "http://qldarch.net/ns/rdf/2012-06/terms#LineDrawing": linedrawings
            },
            search: searchModel,
            initialize: function() {
                artifacts.on("reset", this.render, this);
            }
        });

        var entityView = new EntityContentView({
            router: router,
            id: "mainentities",
            model: proper,
            content: entities,
            search: searchModel,
            initialize: function() {
                proper.on("reset", this.render, this);
            }
        });

        searchModel.on("change", function(searchModel) {
            this.navigate("search/" + searchModel.serialize(), { trigger: false, replace: true });
        }, router);

        router.on('route:frontpage', function(search) {
            if (search) {
                searchModel.set(this.deserialize(search));
            } else {
                searchModel.set(searchModel.defaults);
            }

            $("#column123,#column12,#column23").hide();
            $("#column1").html(searchView.render().el);
            $("#column2").html(contentView.render().el);
            $("#column3").html(entityView.render().el);
            $("#column1,#column2,#column3").show();
        }, searchModel);

        Backbone.history.start();

        _.defer(function() {
            displayedEntities.fetch();
            entities.fetch();
            photographs.fetch();
            interviews.fetch();
            linedrawings.fetch();
        });
    }

    return {
        frontendOnReady: frontendOnReady,
    };
})();
