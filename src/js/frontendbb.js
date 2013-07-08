var frontend = (function() {
    'use strict';

    // Alias the Rdfbone extensions to Backbone
    var RDFGraph = Backbone.RDFGraph;
    var CachedRDFGraph = Backbone.CachedRDFGraph;
    var RDFDescription = Backbone.RDFDescription;
    var SubCollection = Backbone.SubCollection;
    var UnionCollection = Backbone.UnionCollection;

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

        flatmap: function(l, f, t) {
            return _.chain(l).flatten().map(f, t).reject(_.isUndefined).value();
        },

        yes: function(v) {
            return true;
        },

        no: function(v) {
            return false;
        },
    });

    function selectFileByMimeType(files, mimetype) {
        return _.find(files, function(file) {
            return mimetype === file.get1(QA_BASIC_MIME_TYPE, true, true);
        });
    }

    var JSON_ROOT = "/ws/rest/";
    var QA_DISPLAY = "http://qldarch.net/ns/rdf/2012-06/terms#display";
    var QA_LABEL = "http://qldarch.net/ns/rdf/2012-06/terms#label";
    var QA_EDITABLE = "http://qldarch.net/ns/rdf/2012-06/terms#editable";
    var QA_SYSTEM_LOCATION = "http://qldarch.net/ns/rdf/2012-06/terms#systemLocation";
    var QA_EXTERNAL_LOCATION = "http://qldarch.net/ns/rdf/2012-06/terms#externalLocation";
    var QA_HAS_TRANSCRIPT = "http://qldarch.net/ns/rdf/2012-06/terms#hasTranscript";
    var QA_TRANSCRIPT_LOCATION = "http://qldarch.net/ns/rdf/2012-06/terms#transcriptLocation";
    var QA_DISPLAY_PRECEDENCE = "http://qldarch.net/ns/rdf/2012-06/terms#displayPrecedence";
    var QA_PREFERRED_IMAGE = "http://qldarch.net/ns/rdf/2012-06/terms#preferredImage";
    var QA_SUMMARY = "http://qldarch.net/ns/rdf/2012-06/terms#summary";
    var QA_RELATED_TO = "http://qldarch.net/ns/rdf/2012-06/terms#relatedTo";
    var QA_HAS_FILE = "http://qldarch.net/ns/rdf/2012-06/terms#hasFile";
    var QA_BASIC_MIME_TYPE = "http://qldarch.net/ns/rdf/2012-06/terms#basicMimeType";
    var QA_DEFINITE_MAP_ICON = "http://qldarch.net/ns/rdf/2012-06/terms#definiteMapIcon";
    var QA_INDEFINITE_MAP_ICON = "http://qldarch.net/ns/rdf/2012-06/terms#indefiniteMapIcon";


    var OWL_DATATYPE_PROPERTY = "http://www.w3.org/2002/07/owl#DatatypeProperty";
    var OWL_OBJECT_PROPERTY = "http://www.w3.org/2002/07/owl#ObjectProperty";
    var RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    var RDFS_SUBCLASS_OF = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
    var RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";

    var QA_INTERVIEW_TYPE = "http://qldarch.net/ns/rdf/2012-06/terms#Interview";
    var QA_TRANSCRIPT_TYPE = "http://qldarch.net/ns/rdf/2012-06/terms#Transcript";
    var QA_ARTICLE_TYPE = "http://qldarch.net/ns/rdf/2012-06/terms#Article";
    var QA_PHOTOGRAPH_TYPE = "http://qldarch.net/ns/rdf/2012-06/terms#Photograph";
    var QA_LINEDRAWING_TYPE = "http://qldarch.net/ns/rdf/2012-06/terms#LineDrawing";
    var QA_DIGITAL_THING = "http://qldarch.net/ns/rdf/2012-06/terms#DigitalThing";

    var QA_BUILDING_TYPOLOGY = "http://qldarch.net/ns/rdf/2012-06/terms#BuildingTypology";
    var QA_BUILDING_TYPOLOGY_P = "http://qldarch.net/ns/rdf/2012-06/terms#buildingTypology";

    var DCT_TITLE = "http://purl.org/dc/terms/title";
    var DCT_FORMAT = "http://purl.org/dc/terms/format";

    var GEO_LAT = "http://www.w3.org/2003/01/geo/wgs84_pos#lat";
    var GEO_LONG = "http://www.w3.org/2003/01/geo/wgs84_pos#long";

    var MAX_PRECEDENCE = 1000000;
    var successDelay = 2000;
    var logmultiple = true;

    var properties = { };
    var types = { };
    var contentByRdfType = { };
    var contentByURI = { };
    var entities = { };
    var resourcesByRdfType = { };

    var SearchModel = Backbone.Model.extend({
        defaults: {
            'searchstring': "",
            'searchtypes': ['fulltext']
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
            var second = first[1] ? first[1].split(",") : [ 'fulltext' ];
            return {
                'searchstring': decodeURIComponent(first[0]),
                'searchtypes': _.map(second, decodeURIComponent),
            };
        },
    });

    var EntitySearchModel = Backbone.Model.extend({
        defaults: {
            'entityids': [],
        },

        initialize: function() { },

        serialize: function() {
            return _.map(this.get('entityids'), encodeURIComponent).join(",");
        },

        deserialize: function(string) {
            var encodedids = string.split(",");
            return {
                'entityids': _.map(encodedids, decodeURIComponent),
            };
        },
    });

    var ContentSearchModel = Backbone.Model.extend({
        defaults: {
            'selection': "",
            'type': "",
        },

        initialize: function() { },

        serialize: function() {
            return encodeURIComponent(encodeURIComponent(this.get('selection')) 
                + "/" + encodeURIComponent(this.get('type')));
        },

        deserialize: function(string) {
            var components = string.split("/");
            if (components.length != 2) {
                return this.defaults;
            } else {
                return {
                    'selection': decodeURIComponent(components[0]),
                    'type': decodeURIComponent(components[1]),
                };
            }
        },
    });

    var MapSearchModel = Backbone.Model.extend({
        defaults: {
            'lat': "",
            'long': "",
            'zoom': "",
            'selection': "",
        },

        initialize: function(options) { },

        serialize: function() {
            return encodeURIComponent(encodeURIComponent(this.get('lat')) 
                + "/" + encodeURIComponent(this.get('long'))
                + "/" + encodeURIComponent(this.get('zoom'))
                + "/" + encodeURIComponent(this.get('selection')));
        },

        deserialize: function(string) {
            string = string || "";
            var components = string.split("/");
            if (components.length != 4) {
                return this.defaults;
            } else {
                var r = {
                    'lat': decodeURIComponent(components[0]),
                    'long': decodeURIComponent(components[1]),
                    'zoom': decodeURIComponent(components[2]),
                    'selection': decodeURIComponent(components[3]),
                };
                return r;
            }
        },
    });

    var DisplayedImages = Backbone.Collection.extend({
        initialize: function initialize(options) {
            _.bindAll(this);
        },

        displayed: function displayed(imageid) {
            var image = this.get(imageid);
            if (image) {
                var count = image.get("count");
                image.set("count", count + 1);
            } else {
                this.add(new Backbone.Model({
                    id: imageid,
                    count: 1,
                }));
            }
        },

        undisplayed: function undisplayed(imageid) {
            var image = this.get(imageid);
            if (image) {
                var count = image.get("count");
                if (count === 1) {
                    this.remove(image);
                } else {
                    image.set("count", count - 1);
                }
            } else {
                console.log("Undisplayed image that wasn't registered as displayed");
            }
        },

        isDisplayed: function isDisplayed(imageid) {
            var image = this.get(imageid);
            if (image) {
                var count = image.get("count");
                return count > 0;
            } else {
                return false;
            }
        },
    });

    var PredicatedImagesMap = Backbone.Model.extend({});

    var ToplevelView = Backbone.View.extend({
        template: "",
        initialize: function(options) {
            _.bindAll(this);
            this.template = _.template($(_.result(this, "template")).html());
            this.router = _.checkarg(options.router).throwNoArg("options.router");
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
            this._update();

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
            this._update();

            return this;
        },

        detach: function() {
            if (this.attached) {
                this._beforeDetach();
                this.$el = this.$el.detach();
            }
            this.attached = false;

            return this;
        },

        _update: function() { },
        _beforeDetach: function() {},
    });

    var GeneralSearchView = ToplevelView.extend({
        template: "#searchdivTemplate",

        initialize: function(options) {
            ToplevelView.prototype.initialize.call(this, options);
            this.proper = options.proper;
            this.suppressUpdate = false;

            this.optionTemplate = _.template($("#searchtypeoptionTemplate").html());

            this.model.on("change:searchstring", this._update);
            this.proper.on("reset", this.render);
        },
        
        events: {
            "keyup input"   : "_keyup",
            "change select" : "_select",
        },

        render: function() {
            ToplevelView.prototype.render.call(this);

            this.$el.html(this.template(this.model.toJSON()));
            this.proper.each(function(entity) {
                this.$("select").append(this.optionTemplate({
                    label: entity.get1(QA_LABEL),
                    value: entity.id,
                }));
            }, this);

            this._update();
            return this;
        },

        _keyup: function(event) {
            if (event.keyCode == 13) {
                this.model.trigger('performsearch');
            } else {
                this.suppressUpdate = true;
                this.model.set({
                    'searchstring': this.$("input").val(),
                    'searchtypes': [this.$("select").val()],
                });
            }
            this.router.navigate("search/" + this.model.serialize(), { trigger: false, replace: true });
        },

        _select: function(event) {
            this.model.set({
                'searchtypes': [this.$("select").val()],
            });
        },

        _update: function() {
            if (!this.suppressUpdate) {
                this.$("input").val(this.model.get("searchstring"));
                this.$("select").val(this.model.get("searchtypes")[0]);
            }
            this.suppressUpdate = false;
        },
    });

    var MapSearchButtonView = ToplevelView.extend({
        className: "mapsearchbutton",
        template: "#mapsearchbuttonTemplate",

        initialize: function(options) {
            ToplevelView.prototype.initialize.call(this, options);
        },
        
        events: {
            "click"   : "_click"
        },
        
        render: function() {
            ToplevelView.prototype.render.call(this);

            this.$el.html(this.template());
            
            return this;
        },

        _update: function() { },
        
        _click: function _click() {
            this.router.navigate("mapsearch", { trigger: true, replace: false });
        },
    });

    var ContentItemView = Backbone.Marionette.ItemView.extend({
        className: "contententry",
        template: "#listitemviewTemplate",

        serializeData: function() {
            return {
                label: this._labeltext(this.model.get1(DCT_TITLE, logmultiple), 40),
            };
        },

        initialize: function(options) {
            _.bindAll(this);

            options = _.checkarg(options).withDefault({})

            this.router = _.checkarg(options.router).throwNoArg("options.router");
            this.selection = _.checkarg(options.selection).throwNoArg("options.selection");
            this.type = _.checkarg(options.type).throwNoArg("options.type");
            this.typeview = _.checkarg(options.typeview).throwNoArg("options.typeview");
            this.displayedImages = _.checkarg(options.displayedImages)
                .throwNoArg("options.displayedImages");

            this.listenTo(this.selection, "change", this._updateSelected);
            this.listenTo(this.displayedImages, "add", this._updateDisplayed);
            this.listenTo(this.displayedImages, "remove", this._updateDisplayed);
            this.listenTo(this.displayedImages, "reset", this._updateDisplayed);
        },
        
        events: {
            "click"   : "_select"
        },

        onRender: function() {
            this._updateSelected();
            this._updateDisplayed();
        },

        _updateSelected: function _updateSelected() {
            if (this.selection.get("selection") === this.model.id) {
                this.$el.addClass("selected");
                var container = this.$el.parents(".contentlist");
                if (!isScrolledIntoView(container, this.$el)) {
                    container.scrollTo(this.$el);
                }
            } else {
                this.$el.removeClass("selected");
            }
        },

        _updateDisplayed: function _updateDisplayed() {
            if (this.displayedImages.isDisplayed(this.model.id)) {
                this.$el.addClass("displayed");
                if (this.$el.siblings(".selected").length == 0) {
                    var container = this.$el.parents(".contentlist");
                    if (!isScrolledIntoView(container, this.$el)) {
                        container.scrollTo(this.$el);
                    }
                }
            } else {
                this.$el.removeClass("displayed");
            }
        },

        _labeltext: function(label, maxlength) {
            if (_.isUndefined(label)) {
                return "Label unavailable";
            }
            var half = (maxlength / 2) - 2;
            if (label.length < maxlength) return label;
            var rawcut = Math.floor(label.length/2);
            var lower = Math.min(half, rawcut);
            var upper = Math.max(Math.floor(label.length/2), label.length - half);
            var front = label.substr(0, lower).replace(/\W*$/,'');
            var back = label.substr(upper).replace(/^\W*/, '');
            // \u22EF is the midline-ellipsis; \u2026 is the baseline-ellipsis.
            var result = front + '\u2026' + back;
            return result;
        },

        _select: function() {
            var newSelection = (this.selection.get('selection') !== this.model.id) ?
                this.model.id : undefined;

            this.selection.set({
                'selection': newSelection,
                'type': newSelection ? this.type.id : undefined,
            });
            
            if (newSelection) {
                if (this.router.contentViews[this.type.id] &&
                        (this.router.currentRoute.route !==
                             this.router.contentViews[this.type.id])) {
                    this.router.navigate(this.router.contentViews[this.type.id] + "/" +
                            this.selection.serialize(),
                            { trigger: true, replace: this.typeview.forgetroute });
                }
            } else {
                this.router.navigate("", { trigger: true, replace: false });
            }
        },
    });

    var isScrolledIntoView = function isScrolledIntoView(container, target) {
        if (!$(container).offset() || !$(target).offset()) {
            // Abort this and assume it is in view.
            return true;
        }
        var ctop = $(container).offset().top;
        var cbot = ctop + $(container).height();

        var etop = $(target).offset().top;
        var ebot = etop + $(target).height();

        var isInView = ((ebot <= cbot) && (etop >= ctop));

        return isInView;
    };

    var PredicatedImages = Backbone.ViewCollection.extend({
        computeModelArray: function() {
            var entityids = this.sources.entitySearch.get('entityids');
            var predicate = _.yes;

            if (entityids && entityids.length > 0) {
                predicate = function relatedToOneOfPredicate(artifact) {
                    if (_.any(artifact.geta(QA_RELATED_TO), function(related) {
                        return _.contains(entityids, related);
                    }, this)) {
                        return true;
                    } else {
                        return false;
                    }
                };
            } else {
                var searchstring = this.sources.search.get('searchstring');
                predicate = function partialStringPredicate(artifact) {
                    var val = $.trim(searchstring);

                    return !val || _.any(val.split(/\W/), function(word) {
                        return word !== "" &&
                            _.chain(artifact.attributes).keys().any(function(key) {
                                var lcword = word.toLowerCase();
                                return _.any(artifact.geta(key), function(label) {
                                    return label.toLowerCase().indexOf(lcword) != -1;
                                }, this);
                            }, this).value();
                    }, this);
                };
            }

            return this.sources.artifacts.filter(function(artifact) {
                var typeid = this.sources.type.id;
                if (typeid === QA_INTERVIEW_TYPE) {
                    return predicate(artifact);
                } else if (!artifact.get1(QA_HAS_FILE, false, false)) {
                    return false;
                } else if (_.contains([QA_LINEDRAWING_TYPE, QA_PHOTOGRAPH_TYPE], typeid) &&
                        !(artifact.get1(DCT_FORMAT) === "image/jpeg")) {
                    return false;
                } else {
                    return predicate(artifact);
                }
            }, this);
        },
    });

    var ContentListView = Backbone.Marionette.CompositeView.extend({
        className: 'typeview',
        template: "#contenttypeTemplate",
        itemViewContainer: ".contentlist",

        itemView: ContentItemView,
        itemViewOptions: function() {
            return {
                typeview: this,
                router: this.router,
                selection: this.selection,
                type: this.model.get('type'),
                displayedImages : this.displayedImages,
            };
        },

        initialize: function(options) {
            this.router = _.checkarg(options.router).throwNoArg("options.router");
            this.search = _.checkarg(options.search).throwNoArg("options.search");
            this.selection = _.checkarg(options.selection).throwNoArg("options.selection");
            this.entitySearch = _.checkarg(options.entitySearch)
                .throwNoArg("options.entitySearch");
            this.predicatedImages = _.checkarg(options.predicatedImages)
                .throwNoArg("options.predicatedImages");
            this.displayedImages = _.checkarg(options.displayedImages)
                .throwNoArg("options.displayedImages");

            this.collection = new PredicatedImages({
                name: "ContentListViewCollection::" + this.model.get('type').id,
                tracksort: false,
                sources: {
                    artifacts: this.model.get('artifacts'),
                    search: this.search,
                    entitySearch: this.entitySearch,
                    type: this.model.get('type'),
                },
            });
            this.predicatedImages.set(this.model.get('type').id, this.collection);

            this.forgetroute = true;
            this.listenTo(this.router, 'route:viewimage',
                    function () { this.forgetroute = true });
            this.listenTo(this.router, 'route:viewentity',
                    function () { this.forgetroute = false });
            this.listenTo(this.router, 'route:frontpage',
                    function () { this.forgetroute = false });
            this.listenTo(this.router, 'route:mapsearch',
                    function () { this.forgetroute = false });
        },

        onClose : function() {
            this.predicatedImages.set(this.model.get('type').id, undefined);
        },

        ViewModel: Backbone.ViewModel.extend({
            computed_attributes: {
                type: function() {
                    return this.get('type');
                },
                uri: function() {
                    return this.get('type').id;
                },
                label: function() {
                    return this.get('type').get1(QA_LABEL, logmultiple);
                },
            },
        }),

    });

    var DigitalContentView = Backbone.Marionette.CompositeView.extend({
        template: "#contentTemplate",
        itemViewContainer: ".contentdiv",

        itemView: ContentListView,
        itemViewOptions: function() {
            return {
                router: this.router,
                search: this.search,
                selection: this.selection,
                entitySearch: this.entitySearch,
                entities: this.entities,
                predicatedImages: this.predicatedImages,
                displayedImages: this.displayedImages,
            };
        },

        serializeData: function() {
            return {
                title: "Digital Content",
            };
        },

        initialize: function(options) {
            options = _.checkarg(options).withDefault({});
            // FIXME: content here is an array, not a collection.
            this.router = _.checkarg(options.router).throwNoArg("options.router");
            this.content = _.checkarg(options.content).throwNoArg("options.content");
            this.artifacts = _.checkarg(options.artifacts).throwNoArg("options.artifacts");
            this.search = _.checkarg(options.search).throwNoArg("options.search");
            this.selection = _.checkarg(options.selection).throwNoArg("options.selection");
            this.entitySearch = _.checkarg(options.entitySearch)
                .throwNoArg("options.entitySearch");
            this.entities = _.checkarg(options.entities).throwNoArg("options.entities");
            this.predicatedImages = _.checkarg(options.predicatedImages)
                .throwNoArg("options.predicatedImages");
            this.displayedImages = _.checkarg(options.displayedImages)
                .throwNoArg("options.displayedImages");

            this.collection = new (Backbone.ViewCollection.extend({
                computeModelArray: function() {
                    var r = this.sources.artifacts.chain().
                        filter(function(type) {
                            return type.id && this.sources[type.id];
                        }, this).
                        map(function(type) {
                            return new ContentListView.prototype.ViewModel({
                                artifacts: this.sources[type.id],
                                source_models: {
                                    type: type,
                                },
                            });
                        }, this).
                        value();
                    return r;
                },
            }))({
                name: "DigitalContent ViewCollection",
                sources: _.extend({
                    artifacts: this.artifacts,
                }, this.content),
            });
        },
    });

    var EntityContentView = ToplevelView.extend({
        template: "#contentTemplate",

        initialize: function(options) {
            options || (options = {});
            ToplevelView.prototype.initialize.call(this, options);

            this.entities = options.entities;
            this.search = options.search;
            this.content = options.content;
            if (options.initialize) { options.initialize.call(this); }
        },
        
        render: function() {
            ToplevelView.prototype.render.call(this);

            this.$el.html(this.template({ title: "People and Things" }));
            this.model.each(function(entityType) {
                if (entityType.id) {
                    var entityView = new EntityTypeView({
                        model: this._subViewModel(entityType),
                        type: entityType,
                        router: this.router,
                        search: this.search,
                        content: this.content,
                    });
                    this.$('.contentdiv').append(entityView.render().el);
                }
            }, this);

            return this;
        },

        _subViewModel: function(type) {
            return new SubCollection(this.entities, {
                name: "entity subcollection",
                tracksort: false,
                predicate: function(model) {
                        return _(model.geta(RDF_TYPE)).contains(type.id);
                    },
                comparator: QA_LABEL,
            });
        },
    });

    var EntityTypeView = Backbone.View.extend({
        className: 'typeview',
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#contenttypeTemplate").html());
            this.router = options.router;

            _.bindAll(this);
            if (options.initialize) { options.initialize.call(this); }

            this.type = options.type;
            this.search = options.search;
            this.content = options.content;
            this.itemviews = {};

            this.model.on("reset", this.render);
            this.search.on("change", this._setinput);

            this.$placeholder = $('<span display="none" data-uri="' + this.type.id + '"/>');
            this.rendered = false;
            this.visible = false;
            this.predicate = this._defaultPredicate;
        },
        
        render: function() {
            this.$el.html(this.template({
                uri: this.type.id,
                label: this.type.get1(QA_LABEL, true)
            }));

            this.model.each(function(entityItem) {
                var itemView = new EntityItemView({
                    router: this.router,
                    model: entityItem,
                    content: this.content,
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
            return _.contains(searchtypes, 'all') ||
                _.contains(searchtypes, 'fulltext') ||
                _.contains(searchtypes, this.options.type.id);
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
            this.router = options.router;

            this.content = options.content;

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
            this.$el.text(this.model.get1(QA_LABEL, true));

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
            return _.bind(function() {
                var val = $.trim(value);

                return !val ||
                    _.any(val.split(/\W/), function(word) {
                        return word !== "" &&
                            _.chain(this.model.attributes).keys().any(function(key) {
                                var lcword = word.toLowerCase();
                                return _.any(this.model.geta(key), function(label) {
                                    return label.toLowerCase().indexOf(lcword) != -1;
                                }, this);
                            }, this).value();
                    }, this) ||
                    _.any(this.model.geta(QA_RELATED_TO), function(related) {
                        var relatedEntity = this.content.get(related);
                        return relatedEntity &&
                            _.any(val.split(/\W/), function(word) {
                                return word !== "" &&
                                    _.chain(this.attributes).keys().any(function(key) {
                                        var lcword = word.toLowerCase();
                                        return _.any(this.geta(key), function(label) {
                                            return label.toLowerCase().indexOf(lcword) != -1;
                                        }, this);
                                    }, this).value();
                            },  relatedEntity);
                    }, this);
            }, this);
        },

        _select: function() {
            this.router.navigate("entity/" + encodeURIComponent(this.model.id),
                    { trigger: true, replace: false });
        },
    });

    var EntitySummaryView = Backbone.View.extend({
        className: "entitysummary",

        initialize: function(options) {
            options || (options = {});

            _.bindAll(this);
            this.summaryTemplate = _.template($("#entitysummaryTemplate").html());
            this.infoTemplate = _.template($("#infopanelTemplate").html());

            this.entities = options.entities;
            this.photographs = options.photographs;
            this.files = options.files;

            this.entity = undefined;

            this._updateContentDescription();
            this.model.on("change", this._update);
        },

        render: function() {
            this._update();

            return this;
        },

        _update: function() {
            this._updateContentDescription();
            if (this.entity && this.contentDescription) {
                this.files.getp(this.contentDescription.geta(QA_HAS_FILE),
                        function(files) {
                            var file = selectFileByMimeType(files, "image/jpeg");
                            if (file) {
                                this.$el.html(this.summaryTemplate({
                                    uri: this.contentDescription.id,
                                    systemlocation: file.get1(QA_SYSTEM_LOCATION, true, true),
                                    label: this.contentDescription.get1(DCT_TITLE),
                                    name: this.entity.get1(QA_LABEL),
                                    description: this.entity.get1(QA_SUMMARY),
                                }));
                            }
                        }, this);
            } else if (this.entity && this.entity.get1(QA_SUMMARY)) {
                this.$el.html(this.summaryTemplate({
                    uri: "",
                    systemlocation: "",
                    label: "",
                    name: this.entity.get1(QA_LABEL),
                    description: this.entity.get1(QA_SUMMARY),
                }));
                this.$(".summary .summaryImage").hide();
            } else {
                this.$el.html(this.infoTemplate({
                    message: "Individual summary not available",
                }));
            }
        },

        _displayAnArticle: function(files) {
            var file = selectFileByMimeType(files, "application/pdf");
            if (file) {
                this._displayPdf(file);
                return true;
            } else {
                return false;
            }
        },
        // FIXME: This is slightly ridiculous. I should introduce the ViewModel concept of
        // derivied for views and then this can be a direct model application.
        _updateContentDescription: function() {
            this.contentDescription = undefined;
            var entityids = this.model.get('entityids');
            if (entityids && entityids.length == 1) {
                this.entity = this.entities.get(entityids[0]);
                if (this.entity) {
                    var preferredImageURI = this.entity.get1(QA_PREFERRED_IMAGE);
                    if (preferredImageURI) {
                        this.contentDescription = this.photographs.get(preferredImageURI);
                    } else {
                        var relatedImagesURIs = this.entity.geta(QA_RELATED_TO);
                        var relatedImages = _.flatmap(relatedImagesURIs, function(uri) {
                            return this.photographs.get(uri);
                        }, this);
                    }
                }
            }
        },
    });

    var RelatedImagesView = Backbone.View.extend({
        className: "relatedcontent",

        initialize: function(options) {
            _.bindAll(this);

            options = _.checkarg(options).withDefault({})

            this.frameTemplate = _.template($("#relatedcontentTemplate").html());

            this.images = _.checkarg(options.images).throwNoArg("options.images");
            this.type = _.checkarg(options.type).withDefault({ id: "none" });
            this.files = _.checkarg(options.files).throwNoArg("options.files");
            this.number = _.checkarg(options.number).throwNoArg("options.number");
            this.displayedImages = _.checkarg(options.displayedImages)
                .throwNoArg("options.displayedImages");
            this.images.on("reset", this._update, this);
            this.imageViews = [];
        },

        render: function() {
            this._update();

            return this;
        },

        _update: function() {
            this.$el.html(this.frameTemplate({
                uri: this.type.id,
                label: this.type.get1(QA_LABEL),
            }));


            for (var i = 0; i < this.number; i++) {
                var imageView = new RotatingImageView({
                    files: this.files,
                    type: this.type,
                    images: this.images,
                    initialIndex: i,
                    totalViewers: this.number,
                    initialDelay: (2000 * i),
                    displayedImages: this.displayedImages,
                });
                this.imageViews.push(imageView);
                $(".contentbox").prepend(imageView.render().el);
            }
        },

        _beforeDetach: function() {
            _.each(this.imageViews, function(view) {
                view._beforeDetach();
            });
        },
    });

    var RotatingImageView = Backbone.View.extend({
        className: "rotatingImage",

        initialize: function(options) {
            _.bindAll(this);

            options = _.checkarg(options).withDefault({})

            this.template = _.template($("#rotatingimageTemplate").html());
            this.imageTemplate = _.template($("#imageTemplate").html());

            this.images = _.checkarg(options.images).throwNoArg("options.images");
            this.index = _.checkarg(options.initialIndex).throwNoArg("options.initialIndex");
            this.initialIndex = _.checkarg(options.initialIndex)
                .throwNoArg("options.initialIndex");
            this.totalViewers = _.checkarg(options.totalViewers)
                .throwNoArg("options.totalViewers");
            this.initialDelay = _.checkarg(options.initialDelay)
                .throwNoArg("options.initialDelay");
            this.type = _.checkarg(options.type).throwNoArg("options.type");
            this.files = _.checkarg(options.files).throwNoArg("options.files");
            this.displayedImages = _.checkarg(options.displayedImages)
                .throwNoArg("options.displayedImages");

            this.active = false;
        },

        render: function() {
            if (!this.active) {
                this._update();
            }

            return this;
        },

        _update: function() {
            if (!this.active) {
                this.active = true;
                this._fadeInImage(this.initialDelay);
            }
        },

        _fadeOutImage: function() {
            if (this.active) {
                var that = this;
                this.$("img").fadeOut("slow", function() {
                    that.displayedImages.undisplayed($(this).data("uri"));
                    $(this).remove();
                    if (that.active) {
                        that._fadeInImage(0);
                    }
                });
            }
        },

        _fadeInImage: function(delay) {
            if (this.active) {
                this.index = (this.index + 3 < this.images.length) ?
                    this.index + 3 :
                    this.index % 3;

                var image = this.images.at(this.index);
                if (image) {
                    this.files.getp(image.geta(QA_HAS_FILE),
                            function(files) {
                                var file = selectFileByMimeType(files, "image/jpeg");
                                if (file) {
                                    this.$el.html(this.imageTemplate({
                                        uri: image.id,
                                        systemlocation: file.get1(QA_SYSTEM_LOCATION, true, true),
                                        label: image.get1(DCT_TITLE),
                                    }));

                                    var that = this;
                                    _.delay(function fadeInImage() {
                                        that.$("img").fadeIn("slow", function() {
                                            _.delay(that._fadeOutImage, 6000);
                                        });
                                    }, delay);
                                } else {
                                    console.log("No image/jpeg found for " + image.id + " " +
                                        this.initialIndex + " " + this.type.id);
                                }
                            }, this);
                    this.displayedImages.displayed(image.id);
                } else {
                    console.log("No image found in collection: " + this.index);
                    console.log(this.images);
                }
            }
        },

        _beforeDetach: function() {
            var that = this;
            this.active = false;
            $("img").each(function () {
                that.displayedImages.undisplayed($(this).data("uri"));
            });
            this.undelegateEvents();
            this.remove();
        },
    });

    var ContentPaneView = ToplevelView.extend({
        className: "contentpane",
        template: "#contentpaneTemplate",

        initialize: function(options) {
            options = _.checkarg(options).withDefault({})

            ToplevelView.prototype.initialize.call(this, options);

            this.infoTemplate = _.template($("#infopanelTemplate").html());

            this.entities = _.checkarg(options.entities).throwNoArg("options.entities");
            this.photographs = _.checkarg(options.photographs).throwNoArg("options.photographs");
            this.linedrawings = _.checkarg(options.linedrawings)
                .throwNoArg("options.linedrawings");
            this.artifacts = _.checkarg(options.artifacts)
                .throwNoArg("options.artifacts");
            this.files = _.checkarg(options.files).throwNoArg("options.files");
            this.displayedImages = _.checkarg(options.displayedImages)
                .throwNoArg("options.displayedImages");

            this.state = undefined;
            this.entity = undefined;

            this._updateContentDescription();

            this.model.on("change", this._updateContentDescription);
        },

        events: {
            "click span"   : "_selecttab"
        },

        render: function() {
            ToplevelView.prototype.render.call(this);

            this.$el.html(this.template());

            this.summaryView = new EntitySummaryView({
                    router: this.router,
                    model: this.model,
                    entities: this.entities,
                    photographs: this.photographs,
                    files: this.files,
                });
            this.$('.summary').html(this.summaryView.render().el);

            this.$(".button:first").click(); // Calls this._update();

            return this;
        },

        _selecttab: function(event) {
            this.state = $(event.target).attr("type");

            this._update();
        },

        _update: function() {
            if (this.state === "Content") {
                var that = this;
                this.relatedPhotographView = new RelatedImagesView({
                    images: new SubCollection(this.photographs, {
                        name: "related_photographs",
                        tracksort: true,
                        type: QA_PHOTOGRAPH_TYPE,
                        predicate: function(model) {
                                return that.entity &&
                                    _(that.entity.geta(QA_RELATED_TO)).contains(model.id);
                            },
                        }),
                    type: this.artifacts.get(QA_PHOTOGRAPH_TYPE),
                    files: this.files,
                    number: 3,
                    displayedImages: this.displayedImages,
                });
                this.relatedLineDrawingView = new RelatedImagesView({
                    images: new SubCollection(this.linedrawings, {
                        name: "related_linedrawings",
                        tracksort: true,
                        type: QA_LINEDRAWING_TYPE,
                        predicate: function(model) {
                                return that.entity &&
                                    _(that.entity.geta(QA_RELATED_TO)).contains(model.id);
                            },
                        }),
                    type: this.artifacts.get(QA_LINEDRAWING_TYPE),
                    files: this.files,
                    number: 3,
                    displayedImages: this.displayedImages,
                });
                this.$(".content").empty();
                this.$(".content").append(this.relatedPhotographView.render().$el);
                this.$(".content").append(this.relatedLineDrawingView.render().$el);
            } else {
                this.$(".content").html(this.infoTemplate({
                    message: this.state + " Tab disabled pending deploying relatedTo inferencing",
                }));
            }
        },

        _beforeDetach: function() {
            if (this.relatedPhotographView) {
                this.relatedPhotographView._beforeDetach();
            }
            if (this.relatedLineDrawingView) {
                this.relatedLineDrawingView._beforeDetach();
            }
        },

        // FIXME: This is slightly ridiculous. I should introduce the ViewModel concept of
        // derivied for views and then this can be a direct model application.
        _updateContentDescription: function() {
            this.contentDescription = undefined;
            var entityids = this.model.get('entityids');
            if (entityids && entityids.length == 1) {
                this.entity = this.entities.get(entityids[0]);
                if (this.entity) {
                    var preferredImageURI = this.entity.get1(QA_PREFERRED_IMAGE);
                    if (preferredImageURI) {
                        this.contentDescription = this.photographs.get(preferredImageURI);
                    }
                }
            }
        },
    });

    var EntityPropertyViewCollection = Backbone.ViewCollection.extend({
        computeModelArray: function() {
            var selectedEntity = this.sources['selectedEntity'];
            var properties = this.sources['properties'];
            var entities = this.sources['entities'];

            if (!selectedEntity || !properties || !entities) {
                return [];
            }
            var selected = selectedEntity.get('entity');
            if (!selected) {
                return [];
            }

            var metadata = _.map(selected.predicates(), function(predicate) {
                var predDefn = properties.get(predicate);
                if (!predDefn) {
                    console.log("Property not found in ontology: " + predicate);
                    return undefined;
                } else if (predDefn.get1(QA_DISPLAY, true, true)) {
                    var value = selected.get1(predicate, logmultiple);
                    var precedence = predDefn.get1(QA_DISPLAY_PRECEDENCE);
                    precedence = precedence ? precedence : MAX_PRECEDENCE;

                    if (predDefn.geta_(RDF_TYPE).contains(OWL_OBJECT_PROPERTY)) {
                        if (entities.get(value) && entities.get(value).get1(QA_LABEL)) {
                            return {
                                label: predDefn.get1(QA_LABEL, logmultiple),
                                value: entities.get(value).get1(QA_LABEL, logmultiple),
                                precedence: precedence,
                                uri: predicate,
                            };
                        } else {
                            console.log("ObjectProperty(" + property + ") failed resolve");
                            console.log(entities.get(value));
                            return undefined;
                        }
                    } else {
                        return {
                            label: predDefn.get1(QA_LABEL, logmultiple),
                            value: value,
                            precedence: precedence,
                            uri: predicate,
                        };
                    }
                } else {
                    return undefined;
                }
            }, this);

            var models = _.chain(metadata).compact().sortBy('precedence').map(function(entry) {
                return new Backbone.Model(entry, { idAttribute: "uri" });
            }, this).value();

            return models;
        },
    });

    var EntityDetailItemView = Backbone.Marionette.ItemView.extend({
        template: "#entitydetailItemTemplate",
    });
        
    var EntityDetailView = Backbone.Marionette.CompositeView.extend({
        className: 'entitydetail',
        template: "#entitydetailTemplate",
        itemViewContainer: ".propertylist",

        itemView: EntityDetailItemView,

        modelEvents: {
            "change": "render",
        },

        initialize: function(options) {
            this.entities = _.checkarg(options.entities).throwNoArg("options.entities");
            this.properties = _.checkarg(options.properties).throwNoArg("options.properties");
            this.entitySearch = _.checkarg(options.entitySearch)
                .throwNoArg("options.entitySearch");

            // Both the title and the list are dependent on the currently selected entity.
            // To avoid duplication this selection logic is computed in an intermediary
            // ViewModel.
            this.selectedEntity = new (Backbone.ViewModel.extend({
                computed_attributes: {
                    entity: function() {
                        var entityids = this.get('selectedEntities').get('entityids');
                        return (entityids && entityids.length == 1)
                            ? this.get('entities').get(entityids[0])
                            : undefined;
                    }
                },
            }))({
                source_models: {
                    entities: this.entities,
                    selectedEntities: this.entitySearch,
                },
            });

            // At some point I will need to generalise the concept of a derived model that
            // consists of plucking a set of rdf predicates from an rdf description.
            // For now do it explicitly.
            // Note: We need 1) the rdf description; 2) the predicate 3) the default value
            // in the case the rdf description doesn't exist; 4) the default value should
            // the predicate not be contained in the description.
            this.model = new (Backbone.ViewModel.extend({
                computed_attributes: {
                    title: function() {
                        var entity = this.get('source_model').get('entity');
                        var title = entity ? entity.get1(QA_LABEL) : "No selected location";
                        return title ? title : "No known title";
                    }
                },
            }))({
                source_model: this.selectedEntity,
            });

            // This collection contains a prededence ordered list of models containing
            // label->value pairs.
            this.collection = new EntityPropertyViewCollection({
                sources: {
                    selectedEntity: this.selectedEntity,
                    properties: this.properties,
                    entities: this.entities,
                },
            });

        },
    });

    var ImageContentView = ToplevelView.extend({
        className: "imagepane",
        template: "#imagecontentTemplate",

        initialize: function(options) {
            options || (options = {});
            ToplevelView.prototype.initialize.call(this, options);

            this.imageTemplate = _.template($("#imageTemplate").html());
            this.infoTemplate = _.template($("#infopanelTemplate").html());
            this.detailItemTemplate = _.template($("#entitydetailItemTemplate").html());
            this.content = options.content;
            this.contentDescription = undefined;
            this.properties = options.properties;
            this.entities = options.entities;
            this.files = options.files;

            this.model.on("change", this._updateContentDescription);
            _.each(_.values(this.content), function(collection) {
                collection.on("reset", this._updateContentDescription, this)
            }, this);
        },

        events: {
            "click .imagedisplay"   : "_togglemetadata",
        },

        render: function() {
            ToplevelView.prototype.render.call(this);

            this.$el.html(this.template());
            this._update();
            return this;
        },

        _update: function() {
            if (this.attached) {
                if (this.contentDescription && this.contentDescription.geta(QA_HAS_FILE)) {
                    this.files.getp(this.contentDescription.geta(QA_HAS_FILE),
                        this._displayImages, this);
                } else {
                    this.$(".columntitle").text("Unknown Image");
                    this.$(".imagedisplay div.info").remove();
                    this.$(".imagedisplay").prepend(this.infoTemplate({
                        message: "Content not found (" + this.model.get('selection') + ")",
                    }));
                }
            }
        },

        _displayImages: function(files) {
            var file = selectFileByMimeType(files, "image/jpeg");
            if (file) {
                this._displayImage(file);
                return true;
            } else {
                return false;
            }
        },

        _displayImage: function(file) {
            if (this.$(".imagedisplay img").length != 0 &&
                    this.contentDescription.id === this.$(".imagedisplay img").data("uri")) {
                return;
            }

            document.title = "QldArch: " + this.contentDescription.get1(DCT_TITLE, logmultiple);

            this.$(".imagedisplay").append(this.imageTemplate({
                label: this.contentDescription.get1(DCT_TITLE),
                systemlocation: file.get1(QA_SYSTEM_LOCATION, true, true),
                uri: this.contentDescription.id,
            }));

            var that = this;
            this.$(".imagedisplay div.info").remove();
            this.$(".imagedisplay").children("img:first")
                .fadeOut("slow", function() {
                    that.$(".columntitle").text(that.contentDescription.get1(DCT_TITLE));
                    that.$(".imagedisplay").children("img:last")
                        .fadeIn("slow", function() {
                            $(this).siblings("img").remove();
                    });
            });
            this.$(".propertylist").empty();

            var metadata = _(this.contentDescription.predicates()).map(function(property) {
                var propMeta = this.properties.get(property);
                if (!propMeta) {
                    console.log("Property not found in ontology: " + property);
                } else if (propMeta.get1(QA_DISPLAY, true, true)) {
                    var value = this.contentDescription.get1(property, logmultiple);
                    var precedence = propMeta.get1(QA_DISPLAY_PRECEDENCE);
                    precedence = precedence ? precedence : MAX_PRECEDENCE;

                    if (propMeta.geta_(RDF_TYPE).contains(OWL_OBJECT_PROPERTY)) {
                        if (this.entities.get(value) &&
                                this.entities.get(value).get1(QA_LABEL)) {
                            return {
                                label: propMeta.get1(QA_LABEL, logmultiple),
                                value: this.entities.get(value).get1(QA_LABEL, logmultiple),
                                precedence: precedence,
                            };
                        } else {
                            console.log("ObjectProperty(" + property + ") failed resolve");
                            console.log(this.entities.get(value));
                        }
                    } else {
                        return {
                            label: propMeta.get1(QA_LABEL, logmultiple),
                            value: value,
                            precedence: precedence,
                        };
                    }
                }
            }, this);

            _.chain(metadata).filter(_.identity).sortBy('precedence').each(function(entry) {
                this.$(".propertylist").append(this.detailItemTemplate(entry));
            }, this);

            var link = '/omeka/archive/files/' + file.get(QA_SYSTEM_LOCATION);

            this.$(".propertylist").append(this.detailItemTemplate({
                label: this.properties.get(QA_SYSTEM_LOCATION).get1(QA_LABEL, logmultiple),
                value: '<a target="_blank" href="' + link + '">' + link + '</a>',
            }));
        },

        // FIXME: This is slightly ridiculous. I should introduce the ViewModel concept of
        // derivied for views and then this can be a direct model application.
        _updateContentDescription: function() {
            var contentId = this.model.get('selection');
            var type = this.model.get('type');
            if (contentId && type && _.contains(_(this.content).keys(), type)) {
                var newContent = this.content[type].get(contentId);
                if (newContent) {
                    if (newContent !== this.contentDescription) {
                        this.contentDescription = newContent;
                        this._update();
                    }
                } else {
                    this.contentDescription = undefined;
                    this._update();
                }
            } else {
                this.contentDescription = undefined;
                this._update();
            }
        },

        _togglemetadata: function() {
            $(".imagemetadata").fadeToggle();
        },
    });

    var TranscriptView = ToplevelView.extend({
        className: "interviewpane",
        template: "#interviewTemplate",

        initialize: function(options) {
            options || (options = {});
            ToplevelView.prototype.initialize.call(this, options);

            this.transcriptTemplate = _.template($("#transcriptTemplate").html());
            this.infoTemplate = _.template($("#infopanelTemplate").html());
            this.spinnerTemplate = _.template($("#spinnerTemplate").html());
            this.transcriptResultTemplate = _.template($("#transcriptresultTemplate").html());
            this.content = options.content;
            this.fulltext = options.fulltext;
            this.transcripts = options.transcripts;
            this.contentDescription = undefined;
            this.transcript = undefined;

            this.model.on("change", this._updateContentDescription);
            _.each(_.values(this.content), function(collection) {
                collection.on("reset", this._updateContentDescription, this)
            }, this);
        },

        events: {
            "keyup input.searchbox"   : "searchTranscript",
            "click .returnbutton" : "toFrontpage"
        },

        render: function() {
            ToplevelView.prototype.render.call(this);

            this.$el.html(this.template());
            this._update();
            return this;
        },

        _update: function() {
            if (this.attached) {
                if (this.contentDescription) {
                    if (this.$(".audiodiv").length != 0 &&
                            this.contentDescription.id === this.$(".audiodiv").data("uri")) {
                        return;
                    }

                    document.title = this.contentDescription.get1(DCT_TITLE, logmultiple);

                    var audiocontrolid = _.uniqueId("audiocontrol");
                    this.$(".interviewplayer div.info").remove();
                    this.$(".columntitle").text(this.contentDescription.get1(DCT_TITLE));
                    this.$(".interviewplayer").html(this.transcriptTemplate({
                        uri: this.contentDescription.id,
                        audiocontrolid: audiocontrolid,
                        audiosrc: this.contentDescription.get1(QA_EXTERNAL_LOCATION, true, true),
                    }));
                    this.$(".transcript").html(this.spinnerTemplate());
// FIXME: This won't work until I have .json files submitted to Omeka.
//                    var transcriptId = this.contentDescription.get1(QA_HAS_TRANSCRIPT, true, true);
//                    var transcript = this.transcripts.get(transcriptId);
//                    var transcriptURL = '/omeka/archive/files/' +
//                        transcript.get(QA_SYSTEM_LOCATION);
                    var transcriptURL = this.contentDescription.get(QA_TRANSCRIPT_LOCATION, true, true);
                    if (transcriptURL) {
                        var that = this;
                        $.getJSON(transcriptURL).success(function(transcript) {
                            that.transcript = transcript;
                            that.linkAndPlayInterview(transcript, audiocontrolid);
                        }).error(function() {
                            that.$(".transcript").html(that.infoTemplate({
                                message: "Error fetching transcript (" + transcriptURL + ")",
                            }));
                        });
                    } else {
                        this.$(".transcript").html(this.infoTemplate({
                            message: "No known transcript for this interview",
                        }));
                    }
                } else {
                    this.$(".columntitle").text("Unknown Interview");
                    this.$(".interviewplayer").html(this.infoTemplate({
                        message: "Interview not found (" + this.model.get('selection') + ")",
                    }));
                }
            }
        },

        // FIXME: This is slightly ridiculous. I should introduce the ViewModel concept of
        // derivied for views and then this can be a direct model application.
        _updateContentDescription: function() {
            var type = this.model.get('type');
            var contentId = this.model.get('selection');
            var searchresult = (type === QA_TRANSCRIPT_TYPE) ?
                this.fulltext.get(contentId) : undefined;
            var interviewId = searchresult ? searchresult.get('interview') : contentId;
            this.offset = searchresult ? searchresult.id.match(/[^#]*#(.*)/)[1] : undefined;

            if (interviewId && type && this.content[type]) {
                var newContent = this.content[type].get(interviewId);
                if (newContent) {
                    if (newContent !== this.contentDescription) {
                        this.contentDescription = newContent;
                        this._update();
                    }
                } else {
                    this.contentDescription = undefined;
                    this._update();
                }
            } else {
                this.contentDescription = undefined;
                this._update();
            }
        },

        linkAndPlayInterview: function(transcript, audiocontrolid) {
            var transcriptdiv = this.$(".transcript");
            transcriptdiv.empty();

            function subtitleUpdater(jqElement, offset, show) {
                var toppos = jqElement.position().top - offset;
                return function(options) {
                    if (show) {
                        jqElement.animate({"opacity": "1.0"});
                        transcriptdiv.animate({"scrollTop": toppos - 50}, function() {
                            jqElement.animate({"opacity": "1.0"});
                        });
                    } else {
                        transcriptdiv.stop();
                        jqElement.animate({"opacity": "0.5"});
                    }
                };
            }

            // FIXME: This needs to be extracted into a template.
            var popcorn = Popcorn("#" + audiocontrolid);
            for (var i = 0; i < transcript.exchanges.length; i++) {
                var curr = transcript.exchanges[i];
                var next = transcript.exchanges[i+1];

                var start = Math.max(0.5, Popcorn.util.toSeconds(curr.time)) - 0.5;
                var end = next ? Popcorn.util.toSeconds(next.time) - 0.5 : popcorn.duration();

                var speakerdiv = $('<div class="speaker" />').text(curr.speaker);
                var speechdiv = $('<div class="speech" />').text(curr.transcript);

                var subtitlediv = $('<div class="subtitle" data-time="' + curr.time + '" style="display:block;opacity:0.5"/>');
                subtitlediv.data("start", start).data("end", end);
                subtitlediv.append(speakerdiv).append(speechdiv);
                subtitlediv.click(function() {
                    popcorn.currentTime($(this).data("start"));
                });

                transcriptdiv.append(subtitlediv);

                popcorn.code({
                    start: start,
                    end: end,
                    onStart: subtitleUpdater(subtitlediv, transcriptdiv.position().top, true),
                    onEnd: subtitleUpdater(subtitlediv, transcriptdiv.position().top, false)
                });
            }

            popcorn.play();

            if (this.offset) {
                var start = Math.max(0.5, Popcorn.util.toSeconds(this.offset)) - 0.5;
                _.delay(function() { popcorn.currentTime(start); }, 2000);
            }
        },

        searchTranscript: function(event) {
            var val = this.$("input").val();
            var results = [];
            if (!this.transcript) {
                this.$(".resultlist").html(this.infoTemplate({
                    message: "No transcript loaded",
                }));
            } else {
                if (event.keyCode == 13 || val.length > 3) {
                    this.transcript.exchanges.forEach(function(exchange) {
                        if (exchange.transcript.indexOf(val) != -1) {
                            results.push(exchange);
                        }
                    });
                }
                this.$(".resultlist").empty();
                _.each(results, function(result) {
                    var obj = $(this.transcriptResultTemplate({
                        speaker: result.speaker,
                        time: result.time,
                        transcript: _.escape(result.transcript),
                    }).replace(/^\s*/, ''));
                    obj.appendTo(this.$(".resultlist")).click(function() {
                            $('.subtitle[data-time="' + result.time + '"]').click();
                        });
                }, this);
            }
        },

        toFrontpage: function() {
            this.router.navigate("", { trigger: true, replace: false });
        },
    });

    var PdfContentView = ToplevelView.extend({
        className: "imagepane",
        template: "#imagecontentTemplate",

        initialize: function(options) {
            options || (options = {});
            ToplevelView.prototype.initialize.call(this, options);

            this.pdfTemplate = _.template($("#pdfTemplate").html());
            this.infoTemplate = _.template($("#infopanelTemplate").html());
            this.detailItemTemplate = _.template($("#entitydetailItemTemplate").html());
            this.content = options.content;
            this.contentDescription = undefined;
            this.properties = options.properties;
            this.entities = options.entities;
            this.files = options.files;

            this.model.on("change", this._updateContentDescription);
            _.each(_.values(this.content), function(collection) {
                collection.on("reset", this._updateContentDescription, this)
            }, this);
        },

        events: {
            "click .imagedisplay"   : "_togglemetadata",
        },

        render: function() {
            ToplevelView.prototype.render.call(this);

            this.$el.html(this.template());
            this._update();
            return this;
        },

        _update: function() {
            if (this.attached) {
                if (this.contentDescription && this.contentDescription.get1(QA_HAS_FILE)) {
                    this.files.getp(this.contentDescription.geta(QA_HAS_FILE),
                            this._displayAnArticle, this);
                } else {
                    this.$(".columntitle").text("Pdf not found");
                    this.$(".imagedisplay div.info").remove();
                    this.$(".imagedisplay canvas").remove();
                    this.$(".imagedisplay").prepend(this.infoTemplate({
                        message: "Content not found (" + this.model.get('selection') + ")",
                    }));
                }
            }
        },

        _displayAnArticle: function(files) {
            var file = selectFileByMimeType(files, "application/pdf");
            if (file) {
                this._displayPdf(file);
                return true;
            } else {
                return false;
            }
        },

        _displayPdf: function(file) {
            document.title = "QldArch: " + this.contentDescription.get1(DCT_TITLE, logmultiple);

            this.$(".columntitle").text(this.contentDescription.get1(DCT_TITLE));
            this.$(".imagedisplay").append(this.pdfTemplate({
                uri: this.contentDescription.id,
            }));
            this.$(".imagedisplay div.info").remove();

            PDFJS.disableWorker = true;
            var url = "/omeka/archive/files/" + file.get1(QA_SYSTEM_LOCATION, true, true);
            var that = this;
            PDFJS.getDocument(url).then(function displayFirstPage(pdf) {
                pdf.getPage(1).then(function displayPage(page) {
                    var scale = 1.0;
                    var viewport = page.getViewport(scale);

                    // Prepare canvaas using PDF page dimensions.
                    var canvas = that.$("canvas").get(0);
                    var context = canvas.getContext("2d");
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    page.render({
                        canvasContext: context, 
                        viewport: viewport,
                    });
                });
            });

            this.$(".propertylist").empty();
            var metadata = _(this.contentDescription.predicates()).map(function(property) {
                var propMeta = this.properties.get(property);
                if (!propMeta) {
                    console.log("Property not found in ontology: " + property);
                } else if (propMeta.get1(QA_DISPLAY, true, true)) {
                    var value = this.contentDescription.get1(property, logmultiple);
                    var precedence = propMeta.get1(QA_DISPLAY_PRECEDENCE);
                    precedence = precedence ? precedence : MAX_PRECEDENCE;

                    if (propMeta.geta_(RDF_TYPE).contains(OWL_OBJECT_PROPERTY)) {
                        if (this.entities.get(value) &&
                                this.entities.get(value).get1(QA_LABEL)) {
                            return {
                                label: propMeta.get1(QA_LABEL, logmultiple),
                                value: this.entities.get(value).get1(QA_LABEL, logmultiple),
                                precedence: precedence,
                            };
                        } else {
                            console.log("ObjectProperty(" + property + ") failed resolve");
                            console.log(this.entities.get(value));
                        }
                    } else {
                        return {
                            label: propMeta.get1(QA_LABEL, logmultiple),
                            value: value,
                            precedence: precedence,
                        };
                    }
                }
            }, this);

            _.chain(metadata).filter(_.identity).sortBy('precedence').each(function(entry) {
                this.$(".propertylist").append(this.detailItemTemplate(entry));
            }, this);

            var link = '/omeka/archive/files/' + file.get(QA_SYSTEM_LOCATION);

            this.$(".propertylist").append(this.detailItemTemplate({
                label: this.properties.get(QA_SYSTEM_LOCATION).get1(QA_LABEL, logmultiple),
                value: '<a target="_blank" href="' + link + '">' + link + '</a>',
            }));
        },

        // FIXME: This is slightly ridiculous. I should introduce the ViewModel concept of
        // derivied for views and then this can be a direct model application.
        _updateContentDescription: function() {
            var contentId = this.model.get('selection');
            var type = this.model.get('type');
            if (contentId && type && _.contains(_(this.content).keys(), type)) {
                var newContent = this.content[type].get(contentId);
                if (newContent) {
                    if (newContent !== this.contentDescription) {
                        this.contentDescription = newContent;
                        this._update();
                    }
                } else {
                    this.contentDescription = undefined;
                    this._update();
                }
            } else {
                this.contentDescription = undefined;
                this._update();
            }
        },

        _togglemetadata: function() {
            $(".imagemetadata").fadeToggle();
        },
    });

    var FulltextResult = Backbone.Model.extend({
        initialize: function() { },
    });

    var FulltextSearchCollection = function(options) {
        options || (options = {});
        Backbone.Collection.call(this, [], options);
    }
    _.extend(FulltextSearchCollection.prototype, Backbone.Collection.prototype, {
        model: FulltextResult,

        parse: function(results) {
            return results.response.docs;
        },

        initialize: function(models, options) {
            _.bindAll(this);
            _.checkarg(options).throwNoArg("options");
            this.defaultField = _.checkarg(options.defaultField)
                .throwNoArg("options.defaultField");
            this.solrURL = _.checkarg(options.solrURL).throwNoArg("options.solrURL");
            this.debounce = _.checkarg(options.debounce).withDefault(3000);
            this.search = _.checkarg(options.search).throwNoArg("options.search");
            this.maxresults = _.checkarg(options.maxresults).withDefault(100);

            this.search.on("change", _.debounce(this._refresh, this.debounce));
            this.search.on("performsearch", _.debounce(this._refresh, this.debounce, true));
            this._refresh();
        },

        _refresh: function() {
            var searchtypes = this.search.get('searchtypes');
            var searchstring = this.search.get('searchstring');
            if (!_.contains(searchtypes, 'fulltext') || !searchstring) {
                return;
            }
            var newURL = this.buildURL(searchstring);
            if (this.url !== newURL) {
                this.url = newURL;
                this.fetch({ reset: true });
            }
        },

        buildURL: function(searchstring) {
            var query = encodeURIComponent(searchstring.indexOf(":") >= 0 ?
                searchstring :
                _(searchstring.split(/\s+/))
                    .map(function(s) { return this.defaultField + ":" + s; }, this)
                    .join(" "));
                
            return this.solrURL +
                "?q=" +
                query +
                "&wt=json&rows=" + this.maxresults;
        },
    });

    FulltextSearchCollection.extend = Backbone.Collection.extend;

    var FulltextResultsView = ToplevelView.extend({
        template: "#contentTemplate",

        initialize: function(options) {
            _.checkarg(options).throwNoArg("options");
            ToplevelView.prototype.initialize.call(this, options);

            this.selection = _.checkarg(options.selection).throwNoArg("options.selection");
            this.fulltextInterviews =
                _.checkarg(options.fulltextInterviews).throwNoArg("options.fulltextInterviews");
            this.fulltextArticles =
                _.checkarg(options.fulltextArticles).throwNoArg("options.fulltextArticles");
            this.interviews = _.checkarg(options.interviews).throwNoArg("options.interviews");
            this.articles = _.checkarg(options.articles).throwNoArg("options.articles");

            this.model.on("change:searchtypes", this._update);

            if (options.initialize) { options.initialize.call(this); }
        },

        render: function() {
            ToplevelView.prototype.render.call(this);
            this.$el.html(this.template({ title: "Fulltext Search Results" }));

            if (_.isUndefined(this.interviewView)) {
                this.interviewView = new FulltextTypeView({
                    router: this.router,
                    model: this.fulltextInterviews,
                    selection: this.selection,
                    objects: this.interviews,
                    title: "Transcripts",
                    type: QA_INTERVIEW_TYPE, // FIXME: This should probably be TRANSCRIPT_TYPE
                    idField: "interview",
                    itemtype: QA_TRANSCRIPT_TYPE,
                    itemField: "transcript",
                });
            }
            if (_.isUndefined(this.articleView)) {
                this.articleView = new FulltextTypeView({
                    router: this.router,
                    model: this.fulltextArticles,
                    selection: this.selection,
                    objects: this.articles,
                    title: "Articles",
                    type: QA_ARTICLE_TYPE, 
                    idField: "id",
                    itemtype: QA_ARTICLE_TYPE, // FIXME: This indicates something is wrong.
                    itemField: "article",
                });
            }


            this.$('.contentdiv').append(this.interviewView.render().el);
            this.$('.contentdiv').append(this.articleView.render().el);

            return this;
        },

        _update: function() {
            if (this.interviewView) this.interviewView._update();
            if (this.articleView) this.articleView._update();
            if (_.contains(this.model.get('searchtypes'), 'fulltext') &&
                    this.model.get('searchstring')) {
                this.$el.show();
            } else {
                this.$el.hide();
            }
        },
    });

    var FulltextTypeView = Backbone.View.extend({
        className: 'typeview',
        initialize: function(options) {
            _.bindAll(this);

            _.checkarg(options.initalize).withDefault(_.identity).call(this);

            this.template = _.checkarg(_.template($("#contenttypeTemplate").html()))
                .withValidator(_.isFunction).throwError("#contenttypeTemplate missing");
            this.router = _.checkarg(options.router).throwNoArg("options.router");
            this.selection = _.checkarg(options.selection).throwNoArg("options.selection");
            this.objects = _.checkarg(options.objects).throwNoArg("options.objects");
            this.title = _.checkarg(options.title).throwNoArg("options.title");
            this.type = _.checkarg(options.type).throwNoArg("options.type");
            this.idField = _.checkarg(options.idField).throwNoArg("options.idField");
            this.titleProp = _.checkarg(options.titleProp).withDefault(DCT_TITLE);
            this.itemtype = _.checkarg(options.type).throwNoArg("options.itemtype");
            this.itemField = _.checkarg(options.itemField).throwNoArg("options.itemField");

            this.model.on("reset", this.render);

            this.$placeholder = $('<span display="none" data-uri="' + this.type + '"/>');
            this.rendered = false;
            this.visible = false;
        },
        
        render: function() {
            this.$el.html(this.template({
                uri: this.type,
                label: this.title,
            }));

            this.model.each(function(result) {
                var itemView = new FulltextItemView({
                    router: this.router,
                    model: result,
                    selection: this.selection,
                    type: this.itemtype,
                    objects: this.objects,
                    idField: this.idField,
                    titleProp: this.titleProp,
                    itemField: this.itemField,
                });
                this.$('.contentlist').append(itemView.render().el);
            }, this);

            var height = this.$(".contenttype").height();
            if (height > 100) {
                this.$(".contenttype").height(height*1.5);
                var clheight = this.$(".contentlist").height();
                this.$(".contentlist").height(clheight + height*0.5);
            }

            this._update();

            this.rendered = true;
            this.visible = true;

            return this;
        },

        _update: function() {
            if (this.rendered) {
                if (!this.visible) {
                    this.$placeholder.after(this.$el).detach();
                    this.visible = true;
                }
            }
        },
    });

    var FulltextItemView = Backbone.View.extend({
        className: "contententry",

        initialize: function(options) {
            options || (options = {});
            _.bindAll(this);

            _.checkarg(options.initalize).withDefault(_.identity).call(this);

            this.template = _.checkarg(_.template($("#fulltextEntry").html()))
                .withValidator(_.isFunction).throwError("#fulltextEntry missing");
            this.router = _.checkarg(options.router).throwNoArg("options.router");
            this.selection = _.checkarg(options.selection).throwNoArg("options.selection");
            this.type = _.checkarg(options.type).throwNoArg("options.type");
            this.objects = _.checkarg(options.objects).throwNoArg("options.objects");
            this.idField = _.checkarg(options.idField).throwNoArg("options.idField");
            this.titleProp = _.checkarg(options.titleProp).throwNoArg("options.titleProp");
            this.itemField = _.checkarg(options.itemField).throwNoArg("options.itemField");

            this.$placeholder = $('<span display="none" data-uri="' + this.model.id + '"/>');
            this.rendered = false;
            this.visible = false;
            this.offset = 0;
        },
        
        events: {
            "click"   : "_select"
        },

        render: function() {
            var objectId = this.model.get(this.idField);
            if (objectId) {
                var title = this.objects.get(objectId).get1(this.titleProp);
                title = title ? title : "Interview not found";
                this.$el.html(this.template({
                    title: title,
                    exerpt: this._labeltext(this.model.get(this.itemField), 110),
                }));

                this.rendered = true;
                this.visible = true;
            } else {
                console.log("Non-interview found in results");
                console.log(this.model);
            }

            return this;
        },

        _update: function() {
            if (this.rendered) {
                if (this.predicate(this.model)) {
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

        _labeltext: function(label, maxlength) {
            if (_.isUndefined(label)) {
                return "Label unavailable";
            }
            var half = (maxlength / 2) - 2;
            if (label.length < maxlength) return label;
            var rawcut = Math.floor(label.length/2);
            var lower = Math.min(half, rawcut);
            var upper = Math.max(Math.floor(label.length/2), label.length - half);
            var front = label.substr(0, lower).replace(/\W*$/,'');
            var back = label.substr(upper).replace(/^\W*/, '');
            // \u22EF is the midline-ellipsis; \u2026 is the baseline-ellipsis.
            var result = front + '\u2026' + back;
            return result;
        },

        _select: function() {
            var newSelection = (this.selection.get('selection') !== this.model.id) ?
                this.model.id : undefined;

            this.offset = this.$el.parents(".contentlist").scrollTop();

            this.selection.set({
                'selection': newSelection,
                'type': newSelection ? this.type : undefined,
            });
            
            if (newSelection) {
                var indicatedRoute = this.router.contentViews[this.type];
                if (indicatedRoute && (indicatedRoute !== this.router.currentRoute.route)) {
                    this.router.navigate(indicatedRoute + "/" +
                            this.selection.serialize(), { trigger: true, replace: false });
                }
            } else {
                this.router.navigate("", { trigger: true, replace: false });
            }
        },
    });

    var MapUIView = Backbone.Marionette.ItemView.extend({
        classname: "mapui",
        template: "#mapuiTemplate",

        initialize: function(options) {
            _.bindAll(this);
            this.map = _.checkarg(window.map).throwNoArg("window.map");

            this.router = _.checkarg(options.router).throwNoArg("options.router");
            this.geoentities = _.checkarg(options.geoentities)
                .throwNoArg("options.geoentities");
            this.entitiesOnMap = _.checkarg(options.entitiesOnMap)
                .throwNoArg("options.entitiesOnMap");
            this.entitySearch = _.checkarg(options.entitySearch)
                .throwNoArg("options.entitySearch");
            this.entities = _.checkarg(options.entities).throwNoArg("options.entities");

            this.divid = _.uniqueId("mapsearch");

            this.icons = {
                hash: {},
            };
            this.iconDefaults = this._setupIconDefaults();
            this._setupIcons();

            this.listenTo(this.entitySearch, "change", this._updateSelected);
            this.listenTo(this.entities, "add", this._updateIcons);
            this.listenTo(this.entities, "remove", this._updateIcons);
            this.listenTo(this.entities, "reset", this._updateIcons);
        },
        
        serializeData: function() {
            return {
                id: this.divid,
            }
        },

        // Note: Currently using a patched marionette.
        // If this stops working wrap the contents in a _.defer.
        onDomRefresh: function() {
            this.map.init(this.divid, this.icons);

            this.replaceMarkers(this.geoentities);
            this.geoentities.on("reset", this.replaceMarkers, this);
            this.geoentities.on("add", this.replaceMarkers, this);
            this.geoentities.on("remove", this.replaceMarkers, this);
            this.map.events.addListener("selected", this._featureClicked);
            this.map.events.addListener("vectorschanged", this._updateSelected);
            this.map.getMap().events.register("moveend", this, this._updateSelected);

            this.entitiesOnMap.setPredicate(this.isOnScreenPredicator());
            this.selectedFeatureId = undefined;

            this.reorientMap();
        },

        reorientMap: function() {
            var lat = this.model.get('lat');
            var long = this.model.get('long');
            var zoom = this.model.get('zoom');
            var selection = this.model.get('selection');

            if (lat && long && zoom) {
                this.map.setCenter(long, lat, zoom);
            }
            if (selection) {
                // Note: This doesn't decluster, to achieve this we need to replace entitySearch
                // with mapSearchModel.
                this.entitySearch.set({ entityids: [selection] });
            }
        },

        onClose: function() {
            this.entitiesOnMap.setPredicate(_.no);
            this.map.getMap().events.unregister("moveend", this, this._updateSelected);
            this.map.events.removeListener("selected", this._featureClicked);
            this.map.events.removeListener("vectorschanged", this._updateSelected);
            this.map.getMap().destroy();
        },

        // Don't try to keep in sync. Let this view export an entitiesOnMap collection.
        // Resolve from that if and when required.

        _featureClicked: function _featureClicked(evt) {
            var feature = evt.feature;
            var entityids = this.entitySearch.get("entityids");

            if (_.has(feature, "cluster")) {
                var locationids = _.map(feature.cluster, function(feature) {
                    return feature.attributes.id;
                });
                this.entitySearch.set({
                    entityids: locationids,
                });
            } else if ((entityids.length == 1) &&
                    (entityids[0] === feature.attributes.id)) {
                this.entitySearch.set({ entityids: [] });
            } else {
                this.entitySearch.set({ entityids: [feature.attributes.id] });
            }
        },

        _updateSelected: function _updateSelected(model, options) {
            var entityids = this.entitySearch.get("entityids");
            var selection;

            var markers = _.chain(entityids).map(function(id) {
                return this.map.getFeatureOrCluster(id);
            }, this).uniq().value();
            
            if (entityids.length == 0) {
                this.map.selectMapFeature(undefined);
                selection = "";
            } else if (entityids.length == 1) {
                if (!markers[0]) {
                    // This can occur when the page renders before data has loaded, in this case
                    // we abort this update and reprocess it when the data arrives. The callbacks
                    // for this are already registered as we update on changes to it anyway.
                    return; 
                }
                if (options && options.decluster && _.isBoolean(options.decluster) &&
                        _.has(markers[0], "cluster")) {
                    this.map.zoomToCluster(markers[0]);
                    this.map.centerMarker(entityids[0]);
                }
                this.map.selectFeature(entityids[0]);
                selection = entityids[0];
            } else {
                this.map.zoomToFeatures(markers);
                this.map.selectMapFeature(undefined);
                selection = "";
            }
            this._refreshEntitiesOnMap();
            this.model.set({
                lat: this.map.getCenterLat(),
                long: this.map.getCenterLon(),
                zoom: this.map.getZoom(),
                selection: selection,
            });
            // FIXME: This is a clear sign I shouldn't be using entitySearch in the mapSearch.
            //   It now has its own model, so it should be using that instead.
            this.entitySearch.set({ entityids: selection ? [ selection ] : [] });
            this.router.navigate("mapsearch/" + this.model.serialize(), { trigger: false, replace: true });
        },

        isOnScreenPredicator: function isOnScreenPredicator() {
            var map = this.map;

            return function isOnScreenPredicate(loc) {
                var features = map.featuresOnScreen();
                var idlists = [];
                _.each(features, function(feature) {
                    if (_.has(feature, "cluster")) {
                        idlists.push(
                            _.map(feature.cluster, function(feature) {
                                return feature.attributes.id;
                            }));
                    } else {
                        idlists.push(feature.attributes.id);
                    }
                });
                var onscreenids = _.flatten(idlists);

                return _.contains(onscreenids, loc.id);
            };
        },
        
        _refreshEntitiesOnMap: function() {
            this.entitiesOnMap.setPredicate(this.entitiesOnMap.predicate);
        },

        replaceMarkers: function replaceMarkers() {
            var coordinates = this.geoentities.map(function calccoord(entity) {
                var label = entity.get1(QA_LABEL, false);
                var type = entity.get1(QA_BUILDING_TYPOLOGY_P, true);
                return {
                    lon: entity.get(GEO_LONG),
                    lat: entity.get(GEO_LAT),
                    id: entity.id,
                    label: label,
                    type: type,
                };
            });

            window.map.replaceMarkers(coordinates);
        },

        _setupIcons: function() {
            this.icons.hash = this.entities.reduce(function(memo, entity) {
                if (_(entity.geta(RDF_TYPE)).contains(QA_BUILDING_TYPOLOGY)) {
                    var entry = {};
                    entry[QA_DEFINITE_MAP_ICON] = entity.get1(QA_DEFINITE_MAP_ICON);
                    entry[QA_INDEFINITE_MAP_ICON] = entity.get1(QA_INDEFINITE_MAP_ICON);
                    memo[entity.id] = entry;
                }
                return memo;
            }, {}, this);

            _.extend(this.icons.hash, this.iconDefaults);
        },

        _updateIcons: function() {
            this._setupIcons();
            this.replaceMarkers();
        },

        _setupIconDefaults: function() {
            var defaults = {};
            defaults[this.map.CLUSTER] = {};
            defaults[this.map.CLUSTER][QA_DEFINITE_MAP_ICON] =
                'img/mapicons/blank_white_19x27.png';
            defaults[this.map.CLUSTER][QA_INDEFINITE_MAP_ICON] =
                'img/mapicons/blank_black_19x27.png';
            defaults[this.map.DEFAULT] = {};
            defaults[this.map.DEFAULT][QA_DEFINITE_MAP_ICON] =
                'img/mapicons/blank_white_19x27.png';
            defaults[this.map.DEFAULT][QA_INDEFINITE_MAP_ICON] =
                'img/mapicons/blank_black_19x27.png';

            return defaults;
        },
    });

    var MapSearchView = Backbone.Marionette.Layout.extend({
        className: "mapsearch",
        template: "#mapsearchTemplate",

        regions: {
            map: ".mapcontainer",
            entitylist: ".mapentitylist",
            entitydesc: ".mapentitydesc",
            imgpreview: ".multiimagepreview",
        },

        initialize: function(options) {
            _.bindAll(this, "_imageSelectionLoop", "_setImageList");

            _.checkarg(options).throwNoArg("options");

            this.router = _.checkarg(options.router).throwNoArg("options.router");
            this.entities = _.checkarg(options.entities).throwNoArg("options.entities");
            this.files = _.checkarg(options.files).throwNoArg("options.files");
            this.properties = _.checkarg(options.properties).throwNoArg("options.properties");
            this.entitySearch = _.checkarg(options.entitySearch)
                .throwNoArg("options.entitySearch");
            this.predicatedImages = _.checkarg(options.predicatedImages)
                .throwNoArg("options.predicatedImages");
            this.displayedImages = _.checkarg(options.displayedImages)
                .throwNoArg("options.displayedImages");

            this.geoentities = new SubCollection(this.entities, {
                name: "geo-entities",
                tracksort: true,
                predicate: this.isGeoLocated,
            });

            this.entitiesOnMap = new SubCollection(this.geoentities, {
                name: "entitiesOnMap",
                tracksort: true,
                predicate: _.no,
            });

            this.entitiesInList = new (SubCollection.extend({
                initialize: function(models, options) {
                    _.bindAll(this, "predicate");

                    this.entitySearch = options.entitySearch;
                    this.entitiesOnMap = options.entitiesOnMap;

                    this.listenTo(options.entitySearch, "change", this._reload);
                    this.listenTo(options.entitiesOnMap, "add", this._reload);
                    this.listenTo(options.entitiesOnMap, "remove", this._reload);
                    this.listenTo(options.entitiesOnMap, "reset", this._reload);
                },
                _reload: function() {
                    this.setPredicate(this.predicate);
                },
            }))(this.geoentities, {
                name: "entitiesInList",
                tracsort: true,
                entitySearch: this.entitySearch,
                entitiesOnMap: this.entitiesOnMap,
                predicate: function(entity) {
                    var entityids = this.entitySearch.get("entityids");
                    if (entityids.length == 0) {
                        return !_.isUndefined(this.entitiesOnMap.get(entity.id));
                    } else {
                        return _.contains(entityids, entity.id);
                    }
                },
            })

            this.displayedImage = new Backbone.Model({
                image: undefined,
            });

            this.listenTo(this.displayedImage, "change", function(model) {
                var oldImage = model.previous("image");
                var newImage = model.get("image");
                if (oldImage) this.displayedImages.undisplayed(oldImage.id);
                if (newImage) this.displayedImages.displayed(newImage.id);
            });

            this.listenTo(this.predicatedImages, "change", this._setImageList);
            this._setImageList();

            this.imageSelection = new ImageSelection({});

            this._imageSelectionLoop(3000);
        },

        onClose: function() {
            this.displayedImage.set('image', undefined);
        },

        onRender: function onRender() {
            this.map.show(new MapUIView({
                router: this.router,
                geoentities: this.geoentities,
                entitiesOnMap: this.entitiesOnMap,
                entitySearch: this.entitySearch,
                entities: this.entities,
                model: this.model,
            }));

            this.entitylist.show(new MapEntityListView({
                model: new Backbone.Model({
                    uri: "",
                    label: "Locations of Interest",
                }),
                collection: this.entitiesInList,
                entitySearch: this.entitySearch,
            }))

            this.entitydesc.show(new EntityDetailView({
                entities: this.entities,
                properties: this.properties,
                entitySearch: this.entitySearch,
            }));

            this.imgpreview.show(new NotifyingImageView({
                files: this.files,
                imageSelection: this.imageSelection,
                displayedImage: this.displayedImage,
            }));
        },

        isGeoLocated: function isGeoLocated(entity) {
            return entity.has(GEO_LAT) && entity.has(GEO_LONG);
        },

        _setImageList : function _setImageList() {
            var list = this.predicatedImages.get(QA_PHOTOGRAPH_TYPE);
            this.imageList = list ? list : [];
        },

        _imageSelectionLoop: function _imageSelectionLoop(delay) {
            var entityids = this.entitySearch.get("entityids");
            if (entityids &&
               (entityids.length == 1) &&
               (this.imageList.length > 0) &&
               (this.$el.filter(":visible").length > 0)) {
                    var index = this.imageSelection.get("index");
                    if (index < 0 || (index + 1) >= this.imageList.length) {
                        this.imageSelection.set({
                            image: this.imageList.at(0),
                            index: 0,
                        });
                    } else {
                        this.imageSelection.set({
                            image: this.imageList.at(index + 1),
                            index: index + 1,
                        });
                    }
            } else {
                if (this.imageSelection.get("image")) {
                    this.imageSelection.set({
                        image: undefined,
                        index: -1,
                    });
                }
            }

            _.delay(this._imageSelectionLoop, delay, delay);
        },
    });

    var MapEntityListItemView = Backbone.Marionette.ItemView.extend({
        className: "entityentry",
        template: "#listitemviewTemplate",
        serializeData: function() {
            return {
                label: this.model.get1(QA_LABEL, true),
            };
        },

        initialize: function(options) {
            this.entitySearch = _.checkarg(options.entitySearch)
                .throwNoArg("options.entitySearch");
            this.listenTo(this.entitySearch, "change", this._updateSelected);
        },
        
        events: {
            "click"   : "_select"
        },

        onRender: function() {
            this._updateSelected();
        },

        _updateSelected: function _updateSelected() {
            var entityids = this.entitySearch.get('entityids');
            if (entityids && entityids.length == 1 && entityids[0] == this.model.id) {
                this.selected = true;
                this.$el.addClass("selected");
            } else {
                this.selected = false;
                this.$el.removeClass("selected");
            }
        },

        _select: function() {
            var oldids = (this.entitySearch.get('entities') || []);
            if (this.selected) {
                this.entitySearch.set({
                    entityids: _.without(oldids, this.model.id),
                });
            } else {
                this.entitySearch.set({
                    entityids: _.union(oldids, [this.model.id]),
                }, {
                    decluster: true,
                });
            }
        },
    });

    var MapEntityListView = Backbone.Marionette.CompositeView.extend({
        className: 'maplistview',
        template: "#contenttypeTemplate",
        itemViewContainer: ".contentlist",

        itemView: MapEntityListItemView,
        itemViewOptions: function() {
            return {
                entitySearch: this.options.entitySearch,
            };
        },
    });

    var ImageSelection = Backbone.Model.extend({
        defaults: {
            'image': undefined,
            'index': -1,
        }
    });

    var NotifyingImageView = Backbone.Marionette.ItemView.extend({
        className: "notifyingImage",
        template: "#notifyingimageTemplate",

        initialize: function initialize(options) {
            _.bindAll(this);

            options = _.checkarg(options).withDefault({})

            this.imageTemplate = _.template($("#imageTemplate").html());

            this.files = _.checkarg(options.files).throwNoArg("options.files");
            this.imageSelection = _.checkarg(options.imageSelection)
                .throwNoArg("options.imageSelection");
            this.displayedImage = _.checkarg(options.displayedImage)
                .throwNoArg("options.displayedImage");

            this.displayingImage = undefined;
            this.listenTo(this.imageSelection, "change", this.onDomRefresh);
        },

        onClose: function() {
            this.displayingImage = undefined;
        },

        onDomRefresh: function onDomRefresh() {
            if (this.$el.filter(":visible").length > 0) {
                var image = this.imageSelection.get("image");
                var displayed = this.displayedImage.get("image");

                if (this.displayingImage === image) {
                    return;
                }
                if (this.displayingImage !== displayed) {
                    console.log("Not ready for new-image event, discarding");
                    return;
                }

                // Note which image we are currently in the process of displaying.
                this.displayingImage = image;

                this._fadeInImageSelection();
            } else {
                this.displayingImage = undefined;
                this.$("img").remove();
                this.displayedImage.set("image", undefined);
            }
        },

        _fadeInImageSelection: function _fadeInImageSelection() {
            if (_.isUndefined(this.displayingImage)) {
                this.$("img:visible").fadeOut("slow", function() {
                    $(this).remove();
                });
                this.displayedImage.set("image", undefined);
            } else {
                this.files.getp(this.displayingImage.geta(QA_HAS_FILE),
                        _.partial(this._displayJpegFile, this.displayingImage), this);
            }
        },

        _displayJpegFile: function _displayJpegFile(image, files) {
            var file = selectFileByMimeType(files, "image/jpeg");
            if (file) {
                this.$el.append(this.imageTemplate({
                    uri: image.id,
                    systemlocation: file.get1(QA_SYSTEM_LOCATION, true, true),
                    label: image.get1(DCT_TITLE),
                }));

                var hidden = this.$("img:hidden");
                var visible = this.$("img:visible");

                hidden.fadeIn("slow");
                visible.fadeOut("slow", function() {
                    $(this).remove();
                });

                this.displayedImage.set("image", image);
            } else {
                console.log("No image/jpeg found for " + image.id);
            }
        },
    });

    function frontendOnReady() {
        var router = new QldarchRouter();

        var searchModel = new SearchModel();
        var entitySearchModel = new EntitySearchModel();

        var contentSearchModel = new ContentSearchModel();

        var entityRelatedContentModel = new ContentSearchModel();

        var mapSearchModel = new MapSearchModel();

        var predicatedImages = new PredicatedImagesMap();

        var displayedImages = new DisplayedImages();

        var fulltextTranscriptModel = new FulltextSearchCollection({
            search: searchModel,
            defaultField: "transcript",
            solrURL: "/solr/collection1/select",
        });

        var fulltextArticleModel = new FulltextSearchCollection({
            search: searchModel,
            defaultField: "article",
            solrURL: "/solr/collection1/select",
        });

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

        var transcripts = new RDFGraph([], {
            url: function() { return JSON_ROOT + "transcriptSummary" },
            comparator: DCT_TITLE,
        });

        var articles = new RDFGraph([], {
            url: function() { return JSON_ROOT + "articleSummary" },
            comparator: DCT_TITLE,
        });

        var entities = new RDFGraph([], {
            url: function() { return JSON_ROOT + "entities" },
            comparator: QA_LABEL,
        });

        var files = new CachedRDFGraph([], {
            constructURL: function(ids) {
                if (ids.length == 1) {
                    return JSON_ROOT + "fileSummary?ID=" + encodeURIComponent(ids[0]);
                } else {
                    var rawids = _.reduce(ids, function(memo, id) {
                        match = id.match(/http:\/\/qldarch.net\/omeka\/files\/show\/([0-9]*)/);
                        if (match) {
                            memo.idlist.push(match[1]);
                        } else {
                            memo.ids.push(id);
                        }
                        return memo;
                    }, { ids: [], idlist: [] });

                    return JSON_ROOT + "fileSummary" +
                        "?PREFIX=" + encodeURIComponent("http://qldarch.net/omeka/files/show/") +
                        "&IDLIST=" + _.map(rawids.idlist, encodeURIComponent).join(",") +
                        "&ID=" + _.map(rawids.ids, encodeURIComponent).join("&ID=");
                }
            },
        });

        var artifacts = new SubCollection(displayedEntities, {
            name: "artifacts",
            tracksort: false,
            predicate: function(model) {
                    return _(model.geta(RDFS_SUBCLASS_OF)).contains(QA_DIGITAL_THING);
                },

            comparator: QA_DISPLAY_PRECEDENCE,
        });

        var proper = new SubCollection(displayedEntities, {
            name: "proper",
            tracksort: false,
            predicate: function(model) {
                    return !_(model.geta(RDFS_SUBCLASS_OF)).contains(QA_DIGITAL_THING);
                },

            comparator: QA_DISPLAY_PRECEDENCE,
        });

        var allcontent = new UnionCollection([interviews, photographs, linedrawings]);
    
        /*
        allcontent.on("reset", function(collection) {
            console.log("\tRESET:ALLCONTENT: " + collection.length);
        });
        entitySearchModel.on("change", function(model) {
            console.log("\tCHANGE:ENTITYSEARCHMODEL: " + JSON.stringify(model.toJSON()));
        });
        searchModel.on("change", function(model) {
            console.log("\tCHANGE:SEARCHMODEL: " + JSON.stringify(model.toJSON()));
        });
        contentSearchModel.on("change", function(model) {
            console.log("\tCHANGE:CONTENTSEARCHMODEL: " + JSON.stringify(model.toJSON()));
        });
        photographs.on("reset", function(collection) {
            console.log("\tRESET:PHOTOGRAPHS: " + collection.length);
        });
        entities.on("reset", function(collection) {
            console.log("\tRESET:ENTITIES: " + collection.length);
        });
        displayedEntities.on("reset", function(collection) {
            console.log("\tRESET:DISPLAYED_ENTITIES: " + collection.length);
            console.log(collection);
        });
        artifacts.on("reset", function(collection) {
            console.log("\tRESET:ARTIFACTS: " + collection.length);
            console.log(collection);
        });
        artifacts.on("add", function(model, collection) {
            console.log("\tADD:ARTIFACTS: " + collection.length);
            console.log(collection);
        });
        proper.on("reset", function(collection) {
            console.log("\tRESET:DISPLAYED_ENTITIES: " + collection.length);
            console.log(collection);
        });
*/
        fulltextTranscriptModel.on("reset", function(collection) {
            console.log("\tRESET:FulltextTranscriptModel: " + collection.length);
            console.log(collection);
        });
        fulltextArticleModel.on("reset", function(collection) {
            console.log("\tRESET:FulltextArticleModel: " + collection.length);
            console.log(collection);
        });
        /*
        predicatedImages.on("change", function(model) {
            console.log("\t CHANGE:PredicatedImages: " + model.id);
        });
        */
        var searchView = new GeneralSearchView({
            id: "mainsearch",
            model: searchModel,
            proper: proper,
            router: router
        });

        var mapButtonView = new MapSearchButtonView({
            router: router,
        });

        var contentView = new DigitalContentView({
            router: router,
            id: "maincontent",
            artifacts: artifacts,
            content: {
                "http://qldarch.net/ns/rdf/2012-06/terms#Interview": interviews,
                "http://qldarch.net/ns/rdf/2012-06/terms#Photograph": photographs,
                "http://qldarch.net/ns/rdf/2012-06/terms#LineDrawing": linedrawings,
                "http://qldarch.net/ns/rdf/2012-06/terms#Article": articles,
            },
            search: searchModel,
            selection: contentSearchModel,
            entitySearch: entitySearchModel,
            entities: entities,
            predicatedImages: predicatedImages,
            displayedImages: displayedImages,
        });

        var entityView = new EntityContentView({
            router: router,
            id: "mainentities",
            model: proper,
            entities: entities,
            content: allcontent,
            search: searchModel,
            initialize: function() {
                proper.on("reset", this.render, this);
            }
        });

        var fulltextView = new FulltextResultsView({
            router: router,
            id: "fulltextpane",
            model: searchModel,
            selection: contentSearchModel,
            fulltextInterviews: fulltextTranscriptModel,
            fulltextArticles: fulltextArticleModel,
            interviews: interviews,
            articles: articles,
        });

        var contentpaneView = new ContentPaneView({
            router: router,
            id: "contentpane",
            related: entityRelatedContentModel,
            model: entitySearchModel,
            entities: entities,
            photographs: photographs,
            linedrawings: linedrawings,
            artifacts: artifacts,
            files: files,
            displayedImages: displayedImages,
        });

        var imageContentView = new ImageContentView({
            router: router,
            model: contentSearchModel,
            properties: properties,
            content: {
                "http://qldarch.net/ns/rdf/2012-06/terms#Photograph": photographs,
                "http://qldarch.net/ns/rdf/2012-06/terms#LineDrawing": linedrawings,
            },
            entities: entities,
            files: files,
        });

        var transcriptView = new TranscriptView({
            router: router,
            model: contentSearchModel,
            content: {
                "http://qldarch.net/ns/rdf/2012-06/terms#Interview": interviews,
                "http://qldarch.net/ns/rdf/2012-06/terms#Transcript": interviews,
            },
            fulltext: fulltextTranscriptModel,
            transcripts: transcripts,
        });

        var pdfContentView = new PdfContentView({
            router: router,
            model: contentSearchModel,
            properties: properties,
            content: {
                "http://qldarch.net/ns/rdf/2012-06/terms#Article": articles,
            },
            entities: entities,
            files: files,
        });

        var mapSearchView = new MapSearchView({
            router: router,
            entities: entities,
            properties: properties,
            entitySearch: entitySearchModel,
            predicatedImages: predicatedImages,
            files: files,
            displayedImages: displayedImages,
            model: mapSearchModel,
        });

        router.on('route:frontpage', function(search) {
            if (search) {
                searchModel.set(this.deserialize(search));
            } else {
                searchModel.set(searchModel.defaults);
            }
            contentSearchModel.set(contentSearchModel.defaults);
            entitySearchModel.set(entitySearchModel.defaults);
            document.title = "Digital Archive of Queensland Architecture";

            $("#column123,#column12,#column23").hide();
            contentpaneView.detach();
            imageContentView.detach();
            pdfContentView.detach();
            transcriptView.detach();
            mapSearchView.close();
            searchView.append("#column1");
            mapButtonView.append("#column1");
            fulltextView.append("#column1");
            $("#column2").empty().append(contentView.render().$el);
            entityView.append("#column3");
            $("#column1,#column2,#column3").show();

        }, searchModel);

        router.on('route:viewentity', function(id) {
            entitySearchModel.set(entitySearchModel.deserialize(id));

            $("#column123,#column1,#column2,#column23").hide();
            searchView.detach();
            mapButtonView.detach();
            fulltextView.detach();
            entityView.detach();
            imageContentView.detach();
            pdfContentView.detach();
            transcriptView.detach();
            mapSearchView.close();
            contentpaneView.attach("#column12");
            $("#column3").empty().append(contentView.render().$el);
            $("#column12,#column3").show();
        }, entitySearchModel);

        router.on('route:viewimage', function(id) {
            contentSearchModel.set(contentSearchModel.deserialize(id));

            $("#column123,#column2,#column3").hide();
            searchView.detach();
            mapButtonView.detach();
            fulltextView.detach();
            entityView.detach();
            contentpaneView.detach();
            transcriptView.detach();
            mapSearchView.close();
            $("#column1").empty().append(contentView.render().$el);
            imageContentView.append("#column23");
            pdfContentView.detach();
            $("#column1,#column23").show();
        }, contentSearchModel);

        router.on('route:viewpdf', function(id) {
            contentSearchModel.set(contentSearchModel.deserialize(id));

            $("#column123,#column2,#column3").hide();
            searchView.detach();
            mapButtonView.detach();
            fulltextView.detach();
            entityView.detach();
            contentpaneView.detach();
            transcriptView.detach();
            mapSearchView.close();
            imageContentView.detach();
            $("#column1").empty().append(contentView.render().$el);
            pdfContentView.append("#column23");
            $("#column1,#column23").show();
        }, contentSearchModel);

        router.on('route:interview', function(id) {
            contentSearchModel.set(contentSearchModel.deserialize(id));

            $("#column12,#column1,#column2,#column3, #column23").hide();
            searchView.detach();
            mapButtonView.detach();
            fulltextView.detach();
            entityView.detach();
            contentpaneView.detach();
            contentView.close();
            imageContentView.detach();
            pdfContentView.detach();
            mapSearchView.close();
            transcriptView.append("#column123");
            $("#column123").show();
        }, contentSearchModel);

        router.on('route:mapsearch', function(state) {
            mapSearchModel.set(mapSearchModel.deserialize(state));

            $("#column123,#column1,#column2,#column23").hide();
            searchView.detach();
            mapButtonView.detach();
            fulltextView.detach();
            entityView.detach();
            contentpaneView.detach();
            transcriptView.detach();
            imageContentView.detach();
            pdfContentView.detach();
            $("#column12").empty().append(mapSearchView.render().$el);
            $("#column3").empty().append(contentView.render().$el);
            $("#column12,#column3").show();
        }, contentSearchModel);

        Backbone.history.start();

        _.defer(function() {
            properties.fetch({ reset: true });
            displayedEntities.fetch({ reset: true });
            entities.fetch({ reset: true });
            photographs.fetch({ reset: true });
            interviews.fetch({ reset: true });
            transcripts.fetch({ reset: true });
            linedrawings.fetch({ reset: true });
            articles.fetch({ reset: true });
        });
    }

    var QldarchRouter = Backbone.Router.extend({
        initialize: function(options) {
            Backbone.history.on("route", this.onroute, this);
        },

        routes: {
            "": "frontpage",
            "search(/*search)": "frontpage",
            "entity(/*id)": "viewentity",
            "viewimage(/*id)": "viewimage",
            "interview(/*id)": "interview",
            "viewpdf(/*id)": "viewpdf",
            "mapsearch(/*state)": "mapsearch",
        },

        contentViews: {
            "http://qldarch.net/ns/rdf/2012-06/terms#Interview": "interview",
            "http://qldarch.net/ns/rdf/2012-06/terms#Transcript": "interview",
            "http://qldarch.net/ns/rdf/2012-06/terms#Photograph": "viewimage",
            "http://qldarch.net/ns/rdf/2012-06/terms#LineDrawing": "viewimage",
            "http://qldarch.net/ns/rdf/2012-06/terms#Article": "viewpdf",
        },

        currentRoute: {},

        onroute: function(router, route, params) {
            this.currentRoute.route = route;
            this.currentRoute.params = params;
        },
    });

    return {
        frontendOnReady: frontendOnReady,
    };
})();
