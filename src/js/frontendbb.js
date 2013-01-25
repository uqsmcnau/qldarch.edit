var frontend = (function() {
    // Alias the Rdfbone extensions to Backbone
    var RDFGraph = Backbone.RDFGraph;
    var RDFDescription = Backbone.RDFDescription;
    var SubCollection = Backbone.SubCollection;

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

        initialize: function() {
            this.on("change", function() {
                if (!$.trim(this.get('searchstring'))) {
                    this.set(this.defaults);
                }
            }, this);
        },

        serialize: function() {
            return encodeURIComponent(this.get('searchstring'))
                + "/" + _.map(this.get('searchtypes'), encodeURIComponent).join(",");
        },

        deserialize: function(string) {
            var first = string.split("/");
            var second = first[1] ? first[1].split(",") : [ 'all' ];
            return {
                'searchstring': decodeURIComponent(first[0]),
                'searchtypes': _.map(second, decodeURIComponent),
            };
        },
    });

    var EntitySearchModel = Backbone.Model.extend({
        defaults: {
            'entity': "",
        },

        initialize: function() { },

        serialize: function() {
            return encodeURIComponent(this.get('entity'))
        },

        deserialize: function(string) {
            return {
                'entity': decodeURIComponent(string),
            };
        },
    });

    var ToplevelView = Backbone.View.extend({
        initialize: function(options) {
            _.bindAll(this);
            this.rendered = false;
            this.attached = false;
        },

        render: function() {
            this.rendered = true;
        },

        attach: function(selector) {
            if (this.rendered) {
                if (this.attached) {
                    if (!$(selector).is(this.$el.parent())) {
                        $(selector).html(this.detach().$el);
                    } // else leave alone.
                } else {
                    $(selector).html(this.$el);
                }
            } else {
                $(selector).html(this.render().$el);
            }

            this.attached = true;

            return this;
        },

        append: function(selector) {
            if (this.rendered) {
                if (this.attached) {
                    if (!$(selector).is(this.$el.parent())) {
                        $(selector).append(this.detach().$el);
                    } // else leave alone.
                } else {
                    $(selector).append(this.$el);
                }
            } else {
                $(selector).append(this.render().$el);
            }

            this.attached = true;

            return this;
        },

        detach: function() {
            if (this.attached) {
                this.$el = this.$el.detach();
            }
            this.attached = false;

            return this;
        },
    });

    var GeneralSearchView = ToplevelView.extend({
        initialize: function(options) {
            ToplevelView.prototype.initialize.call(this, options);

            this.template = _.template($("#searchdivTemplate").html());
            this.router = options.router;
            options.model.on("change:searchstring", this._update);
        },
        
        events: {
            "keyup input"   : "_keyup"
        },

        render: function() {
            ToplevelView.prototype.render.call(this);

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
        },

    });

    var DigitalContentView = ToplevelView.extend({
        initialize: function(options) {
            options || (options = {});
            ToplevelView.prototype.initialize.call(this, options);

            this.template = _.template($("#digitalContentTemplate").html());
            this.content = options.content;
            this.search = options.search;
            this.router = options.router;
            if (options.initialize) { options.initialize.call(this); }
        },

        render: function() {
            ToplevelView.prototype.render.call(this);
            this.$el.html(this.template());
            this.model.each(function(artifactType) {
                if (artifactType.id && this.content[artifactType.id]) {
                    var contentView = new ContentTypeView({
                        router: this.router,
                        model: this._subViewModel(artifactType),
                        type: artifactType,
                        router: this.router,
                        search: this.search,
                    });
                    this.$('#contentdiv').append(contentView.render().el);
                }
            }, this);
            return this;
        },

        _subViewModel: function(type) {
            return this.content[type.id];
        },
    });

    var ContentTypeView = Backbone.View.extend({
        className: 'typeview',
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#contenttypeTemplate").html());
            this.router = options.router;

            _.bindAll(this);
            if (options.initialize) { options.initialize.call(this); }

            this.type = options.type;
            this.search = options.search;
            this.itemviews = {};

            this.model.on("reset", this.render);
            this.search.on("change", this._update);

            this.$placeholder = $('<span display="none" data-uri="' + this.type.id + '"/>');
            this.rendered = false;
            this.visible = false;
            this.predicate = this._defaultPredicate;
        },
        
        events: { // Not used here, but maintained to prepare for refactoring with EntityTV.
            "keyup input"   : "_keyup"
        },

        render: function() {
            this.$el.html(this.template({
                uri: this.type.id,
                label: this.type.get(QA_LABEL)
            }));

            this.model.each(function(entityItem) {
                var itemView = new ContentItemView({
                    router: this.router,
                    model: entityItem,
                });
                this.itemviews[entityItem.id] = itemView;
                this.$('.contentlist').append(itemView.render().el);
            }, this);

            this._update();
            this._setinput();

            this.rendered = true;
            this.visible = true;

            return this;
        },

        _keyup: function() {
            this.search.set({
                'searchstring': this.$("input").val(),
                'searchtypes': [this.type.id],
            });
        },

        _update: function() {
            if (this.rendered) {
                if (this.predicate(this.model)) {
                    if (!this.visible) {
                        this.$placeholder.after(this.$el).detach();
                        this.visible = true;
                    }
                    this._cascadeUpdate();
                } else {
                    if (this.visible) {
                        this.$el.after(this.$placeholder).detach();
                        this.visible = false;
                    }
                }
            }
        },

        _cascadeUpdate: function() {
            var searchtypes = this.search.get('searchtypes');
            var searchstring = this.search.get('searchstring');
            _.each(this.itemviews, function(itemview) {
                itemview.setPredicate(itemview.partialStringPredicator(searchstring));
            }, this);
        },

        setPredicate: function(predicate) {
            this.predicate = predicate ? predicate : this._defaultPredicate;
            this._update();
        },

        _defaultPredicate: function(model) {
            var searchtypes = this.search.get('searchtypes');
            return _.contains(searchtypes, 'all') || _.contains(searchtypes, this.options.type.id);
        },

        _setinput: function() {
            //this.$("input").val(this.search.get('searchstring'));
            this._update();
        },

    });

    var ContentItemView = Backbone.View.extend({
        className: "contententry",
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#itemTemplate").html());
            this.router = options.router;

            _.bindAll(this, 'render');
            if (options.initialize) { options.initialize.call(this); }

            this.$placeholder = $('<span display="none" data-uri="' + this.model.id + '"/>');
            this.rendered = false;
            this.visible = false;
            this.predicate = this._defaultPredicate;
        },
        
        render: function() {
            this.$el.html(this.template({
                label: this.model.get(DCT_TITLE)
            }));

            this.rendered = true;
            this.visible = true;

            return this;
        },

        _update: function() {
            if (this.rendered) {
                if (this.predicate(this.model)) {
                    if (!this.visible) {
                        this.$placeholder.after(this.$el).detach();
                        this.visible = true;
                    }
                    this._cascadeUpdate();
                } else {
                    if (this.visible) {
                        this.$el.after(this.$placeholder).detach();
                        this.visible = false;
                    }
                }
            }
        },

        _cascadeUpdate: function() {},

        setPredicate: function(predicate) {
            this.predicate = predicate ? predicate : this._defaultPredicate;
            this._update();
        },

        _defaultPredicate: function(model) {
            return true;
        },

        partialStringPredicator: function(value) {
            return function() {
                var val = $.trim(value);
                if (!val) {
                    return true;
                }

                var found = false;
                _.each(val.split(/\W/), function(word) {
                    if (word !== "" && (
                        this.model.get(DCT_TITLE) &&
                        this.model.get(DCT_TITLE).toLowerCase().indexOf(word.toLowerCase()) != -1 ||
                        this.model.get(RDFS_LABEL) &&
                        this.model.get(RDFS_LABEL).toLowerCase().indexOf(word.toLowerCase()) != -1)) {
                            
                        found = true;
                    }
                }, this);

                return found;
            };
        },
    });

    var EntityContentView = ToplevelView.extend({
        initialize: function(options) {
            options || (options = {});
            ToplevelView.prototype.initialize.call(this, options);

            this.template = _.template($("#entityContentTemplate").html());
            this.content = options.content;
            this.search = options.search;
            this.router = options.router;
            if (options.initialize) { options.initialize.call(this); }
        },
        
        render: function() {
            ToplevelView.prototype.render.call(this);

            this.$el.html(this.template());
            this.model.each(function(entityType) {
                if (entityType.id) {
                    var entityView = new EntityTypeView({
                        model: this._subViewModel(entityType),
                        type: entityType,
                        router: this.router,
                        search: this.search,
                    });
                    this.$('#entitydiv').append(entityView.render().el);
                }
            }, this);

            return this;
        },

        _subViewModel: function(type) {
            return new SubCollection(this.content, {
                name: "entity subcollection",
                tracksort: false,
                predicate: function(model) {
                        return model.get(RDF_TYPE) === type.id;
                    },
                comparator: QA_LABEL,
            });
        },
    });

    var EntityTypeView = Backbone.View.extend({
        className: 'typeview',
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#entitytypeTemplate").html());
            this.router = options.router;

            _.bindAll(this);
            if (options.initialize) { options.initialize.call(this); }

            this.type = options.type;
            this.search = options.search;
            this.itemviews = {};

            this.model.on("reset", this.render);
            this.search.on("change", this._setinput);

            this.$placeholder = $('<span display="none" data-uri="' + this.type.id + '"/>');
            this.rendered = false;
            this.visible = false;
            this.predicate = this._defaultPredicate;
        },
        
        events: {
            "keyup input"   : "_keyup"
        },

        render: function() {
            this.$el.html(this.template({
                uri: this.type.id,
                label: this.type.get(QA_LABEL)
            }));

            this.model.each(function(entityItem) {
                var itemView = new EntityItemView({
                    router: this.router,
                    model: entityItem,
                });
                this.itemviews[entityItem.id] = itemView;
                this.$('.entitylist').append(itemView.render().el);
            }, this);

            this._update();
            this._setinput();

            this.rendered = true;
            this.visible = true;

            return this;
        },

        _keyup: function() {
            this.search.set({
                'searchstring': this.$("input").val(),
                'searchtypes': [this.type.id],
            });
        },

        _update: function() {
            if (this.rendered) {
                if (this.predicate(this.model)) {
                    if (!this.visible) {
                        this.$placeholder.after(this.$el).detach();
                        this.visible = true;
                    }
                    this._cascadeUpdate();
                } else {
                    if (this.visible) {
                        this.$el.after(this.$placeholder).detach();
                        this.visible = false;
                    }
                }
            }
        },

        _cascadeUpdate: function() {
            var searchtypes = this.search.get('searchtypes');
            var searchstring = this.search.get('searchstring');
            _.each(this.itemviews, function(itemview) {
                itemview.setPredicate(itemview.partialStringPredicator(searchstring));
            }, this);
        },

        setPredicate: function(predicate) {
            this.predicate = predicate ? predicate : this._defaultPredicate;
            this._update();
        },

        _defaultPredicate: function(model) {
            var searchtypes = this.search.get('searchtypes');
            return _.contains(searchtypes, 'all') || _.contains(searchtypes, this.options.type.id);
        },

        _setinput: function() {
            this.$("input").val(this.search.get('searchstring'));
            this._update();
        },

    });

    var EntityItemView = Backbone.View.extend({
        className: "entityentry",
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#itemTemplate").html());
            this.router = options.router;

            _.bindAll(this);
            if (options.initialize) { options.initialize.call(this); }

            this.$placeholder = $('<span display="none" data-uri="' + this.model.id + '"/>');
            this.rendered = false;
            this.visible = false;
            this.predicate = this._defaultPredicate;
        },
        
        events: {
            "click"   : "_select"
        },

        render: function() {
            this.$el.html(this.template({
                label: this.model.get(QA_LABEL)
            }));

            this.rendered = true;
            this.visible = true;

            return this;
        },

        _update: function() {
            if (this.rendered) {
                if (this.predicate(this.model)) {
                    if (!this.visible) {
                        this.$placeholder.after(this.$el).detach();
                        this.visible = true;
                    }
                    this._cascadeUpdate();
                } else {
                    if (this.visible) {
                        this.$el.after(this.$placeholder).detach();
                        this.visible = false;
                    }
                }
            }
        },

        _cascadeUpdate: function() {},

        setPredicate: function(predicate) {
            this.predicate = predicate ? predicate : this._defaultPredicate;
            this._update();
        },

        _defaultPredicate: function(model) {
            return true;
        },

        partialStringPredicator: function(value) {
            return function() {
                var val = $.trim(value);
                if (!val) {
                    return true;
                }

                var found = false;
                _.each(val.split(/\W/), function(word) {
                    if (word !== "" && (
                        this.model.get(QA_LABEL) &&
                        this.model.get(QA_LABEL).toLowerCase().indexOf(word.toLowerCase()) != -1 ||
                        this.model.get(RDFS_LABEL) &&
                        this.model.get(RDFS_LABEL).toLowerCase().indexOf(word.toLowerCase()) != -1)) {
                            
                        found = true;
                    }
                }, this);

                return found;
            };
        },

        _select: function() {
            this.router.navigate("entity/" + encodeURIComponent(this.model.id),
                    { trigger: true, replace: false });
        },
    });

    var ContentPaneView = ToplevelView.extend({
        className: "contentpane",
        initialize: function(options) {
            ToplevelView.prototype.initialize.call(this, options);

            this.template = _.template($("#contentpaneTemplate").html());
            this.router = options.router;
        },
        
        events: {
            "click span"   : "_selecttab"
        },

        render: function() {
            ToplevelView.prototype.render.call(this);

            this.$el.html(this.template());
            this._update();
            return this;
        },

        _selecttab: function(event) {
            console.log("Tab clicked: " + $(event.target).attr("type"));
        },

        _update: function() {
            
        },

    });

    var EntityDetailView = ToplevelView.extend({
        initialize: function(options) {
            options || (options = {});
            ToplevelView.prototype.initialize.call(this, options);

            this.template = _.template($("#entitydetailTemplate").html());
            this.itemTemplate = _.template($("#entitydetailItemTemplate").html());
            this.router = options.router;
            this.entities = options.entities;
            this.properties = options.properties;
            this.entity = undefined;

            if (options.initialize) { options.initialize.call(this); }
            this.model.on("change", this._updateEntity);
        },
        
        render: function() {
            ToplevelView.prototype.render.call(this);

            this.$el.html(this.template());
            
            this._update();

            return this;
        },

        _update: function() {
            if (this.entity) {
                this.$("h2").text("About " + this.entity.get(QA_LABEL));
                var $propertylist = this.$(".propertylist");
                $propertylist.empty();
                _.each(this.entity.predicates(), function(predicate) {
                    var property = this.properties.get(predicate);
                    console.log(property.toJSON());
                    if (property.get(QA_DISPLAY)) {
                        $propertylist.append(this.itemTemplate({
                            label: this.properties.get(predicate).get(QA_LABEL),
                            value: this.entity.get(predicate),
                        }));
                    }
                }, this);
            } else {
                this.$("h2").text("Unknown");
            }
        },

        _updateEntity: function() {
            var entityId = this.model.get('entity');
            if (entityId) {
                var newEntity = this.entities.get(entityId);
                if (newEntity) {
                    if (newEntity !== this.entity) {
                        this.entity = newEntity;
                        this._update();
                    }
                } else {
                    this.entity = undefined;
                    this._update();
                }
            } else {
                this.entity = undefined;
                this._update();
            }
        },
    });

    var QldarchRouter = Backbone.Router.extend({
        routes: {
            "": "frontpage",
            "search(/*search)": "frontpage",
            "entity(/*entity)": "viewentity",
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

        var entitySearchModel = new EntitySearchModel();

        var properties = new RDFGraph([], {
            url: function() { return JSON_ROOT + "properties" },
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

        var contentpaneView = new ContentPaneView({
            router: router,
            id: "contentpane",
        });

        var entityDetailView = new EntityDetailView({
            router: router,
            model: entitySearchModel,
            entities: entities,
            properties: properties,
        });

        searchModel.on("change", function(searchModel) {
            this.navigate("search/" + searchModel.serialize(), { trigger: false, replace: true });
        }, router);

        router.on('route:frontpage', function(search) {
            if (search) {
                console.log("deserializing frontpage");
                searchModel.set(this.deserialize(search));
            } else {
                searchModel.set(searchModel.defaults);
            }

            $("#column123,#column12,#column23").hide();
            contentpaneView.detach();
            searchView.attach("#column1");
            contentView.attach("#column2");
            entityView.attach("#column3");
            $("#column1,#column2,#column3").show();

        }, searchModel);

        router.on('route:viewentity', function(estring) {
            console.log("deserializing viewentity");
            entitySearchModel.set(entitySearchModel.deserialize(estring));

            $("#column123,#column1,#column2,#column23").hide();
            searchView.detach();
            entityView.detach();
            contentpaneView.attach("#column12");
            entityDetailView.append("#column3");
            contentView.append("#column3");
            $("#column12,#column3").show();
        }, entitySearchModel);

        Backbone.history.start();

        _.defer(function() {
            properties.fetch();
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
