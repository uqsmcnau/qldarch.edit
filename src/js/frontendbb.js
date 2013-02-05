var frontend = (function() {
    // Alias the Rdfbone extensions to Backbone
    var RDFGraph = Backbone.RDFGraph;
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
    });

    var JSON_ROOT = "/ws/rest/";
    var QA_DISPLAY = "http://qldarch.net/ns/rdf/2012-06/terms#display";
    var QA_LABEL = "http://qldarch.net/ns/rdf/2012-06/terms#label";
    var QA_EDITABLE = "http://qldarch.net/ns/rdf/2012-06/terms#editable";
    var QA_SYSTEM_LOCATION = "http://qldarch.net/ns/rdf/2012-06/terms#systemLocation";
    var QA_EXTERNAL_LOCATION = "http://qldarch.net/ns/rdf/2012-06/terms#externalLocation";
    var QA_TRANSCRIPT_LOCATION = "http://qldarch.net/ns/rdf/2012-06/terms#transcriptLocation";
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

    var ContentSearchModel = Backbone.Model.extend({
        defaults: {
            'selection': "",
            'type': "",
        },

        initialize: function() { },

        serialize: function() {
            return encodeURIComponent(this.get('selection')) 
                + "/" + encodeURIComponent(this.get('type'));
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

    var ToplevelView = Backbone.View.extend({
        template: "",
        initialize: function(options) {
            _.bindAll(this);
            this.template = _.template($(_.result(this, "template")).html());
            this.router = options.router;
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
                this.$el = this.$el.detach();
            }
            this.attached = false;

            return this;
        },

        _update: function() { },
    });

    var GeneralSearchView = ToplevelView.extend({
        template: "#searchdivTemplate",

        initialize: function(options) {
            ToplevelView.prototype.initialize.call(this, options);
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
        template: "#digitalContentTemplate",

        initialize: function(options) {
            options || (options = {});
            ToplevelView.prototype.initialize.call(this, options);

            this.content = options.content;
            this.search = options.search;
            this.selection = options.selection;
            this.contentViews = [];
            if (options.initialize) { options.initialize.call(this); }
        },

        render: function() {
            ToplevelView.prototype.render.call(this);
            this.$el.html(this.template());

            this.contentViews = this.model.map(function(artifactType) {
                if (artifactType.id && this.content[artifactType.id]) {
                    return new ContentTypeView({
                        router: this.router,
                        model: this._subViewModel(artifactType),
                        type: artifactType,
                        router: this.router,
                        search: this.search,
                        selection: this.selection,
                    });
                }
            }, this);

            _(this.contentViews).each(function(view) {
                this.$('#contentdiv').append(view.render().el);
            }, this);

            return this;
        },

        _update: function() {
            _(this.contentViews).each(function(view) { view._update(); });
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
            this.selection = options.selection;
            this.itemviews = {};

            this.model.on("reset", this.render);
            this.search.on("change", this._update);

            this.$placeholder = $('<span display="none" data-uri="' + this.type.id + '"/>');
            this.rendered = false;
            this.visible = false;
            this.predicate = this._defaultPredicate;
            this.itemViews = [];

            this.recordroute = true;
            this.router.on('route:viewimage', function () { this.recordroute = false }, this);
            this.router.on('route:frontpage', function () { this.recordroute = true }, this);
        },
        
        events: { // Not used here, but maintained to prepare for refactoring with EntityTV.
            "keyup input"   : "_keyup"
        },

        render: function() {
            this.$el.html(this.template({
                uri: this.type.id,
                label: this.type.get1(QA_LABEL, logmultiple)
            }));

            this.model.each(function(entityItem) {
                var itemView = new ContentItemView({
                    typeview: this,
                    router: this.router,
                    model: entityItem,
                    selection: this.selection,
                    type: this.type,
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
                itemview._update();
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
            this._update();
        },

    });

    var ContentItemView = Backbone.View.extend({
        className: "contententry",
        initialize: function(options) {
            options || (options = {});
            this.template = _.template($("#itemTemplate").html());
            this.router = options.router;
            this.selection = options.selection;
            this.type = options.type;
            this.typeview = options.typeview;

            _.bindAll(this);
            if (options.initialize) { options.initialize.call(this); }

            this.$placeholder = $('<span display="none" data-uri="' + this.model.id + '"/>');
            this.rendered = false;
            this.visible = false;
            this.predicate = this._defaultPredicate;
            this.selection.on("change", this._update);
            this.offset = 0;
        },
        
        events: {
            "click"   : "_select"
        },

        render: function() {
            this.$el.html(this.template({
                label: this._labeltext(this.model.get1(DCT_TITLE, logmultiple))
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
            if (this.selection.get("selection") === this.model.id) {
                this.$el.addClass("selected");
                this.$el.parents(".contentlist").scrollTop(this.offset);
            } else {
                this.$el.removeClass("selected");
            }
        },

        _cascadeUpdate: function() {},

        _labeltext: function(label) {
            if (label.length < 40) return label;
            var rawcut = Math.floor(label.length/2);
            var lower = Math.min(18, rawcut);
            var upper = Math.max(Math.floor(label.length/2), label.length - 18);
            var front = label.substr(0, lower);
            var back = label.substr(upper);
            var result = front + '&hellip;' + back;
            return result;
        },

        _select: function() {
            var newSelection = (this.selection.get('selection') !== this.model.id) ?
                this.model.id : undefined;

            this.offset = this.$el.parents(".contentlist").scrollTop();

            this.selection.set({
                'selection': newSelection,
                'type': newSelection ? this.type.id : undefined,
            });
            
            if (newSelection) {
                if (this.router.currentRoute.route !== this.router.contentViews[this.type.id]) {
                    this.router.navigate(this.router.contentViews[this.type.id] + "/" +
                            this.selection.serialize(),
                            { trigger: true, replace: !this.typeview.recordroute });
                }
            } else {
                this.router.navigate("", { trigger: true, replace: false });
            }
        },

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
                        this.model.get1(DCT_TITLE) &&
                        _.any(this.model.geta(DCT_TITLE), function(title) {
                            return title.toLowerCase().indexOf(word.toLowerCase()) != -1;
                        }) ||
                        this.model.get1(RDFS_LABEL) &&
                        _.any(this.model.geta(RDFS_LABEL), function(label) {
                            return label.toLowerCase().indexOf(word.toLowerCase()) != -1;
                        }))) {
                            
                        found = true;
                    }
                }, this);

                return found;
            };
        },
    });

    var EntityContentView = ToplevelView.extend({
        template: "#entityContentTemplate",

        initialize: function(options) {
            options || (options = {});
            ToplevelView.prototype.initialize.call(this, options);

            this.content = options.content;
            this.search = options.search;
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
                label: this.type.get1(QA_LABEL, true)
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
                label: this.model.get1(QA_LABEL, true)
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
                        this.model.get1(QA_LABEL) &&
                        _.any(this.model.geta(QA_LABEL), function(label) {
                            return label.toLowerCase().indexOf(word.toLowerCase()) != -1;
                        }) ||
                        this.model.get1(RDFS_LABEL) &&
                        _.any(this.model.geta(RDFS_LABEL), function(label) {
                            return label.toLowerCase().indexOf(word.toLowerCase()) != -1;
                        }))) {
                            
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
        template: "#contentpaneTemplate",

        initialize: function(options) {
            options || (options = {});
            ToplevelView.prototype.initialize.call(this, options);

            this.infoTemplate = _.template($("#infopanelTemplate").html());
        },

        events: {
            "click span"   : "_selecttab"
        },

        render: function() {
            ToplevelView.prototype.render.call(this);

            this.$el.html(this.template());
            this._update();
            this.$(".button:first").click();
            return this;
        },

        _selecttab: function(event) {
            this.$(".content").html(this.infoTemplate({
                message: $(event.target).attr("type") + " Tab disabled pending deploying relatedTo inferencing",
            }));
        },

        _update: function() {
        },

    });

    var EntityDetailView = ToplevelView.extend({
        template: "#entitydetailTemplate",

        initialize: function(options) {
            options || (options = {});
            ToplevelView.prototype.initialize.call(this, options);

            this.itemTemplate = _.template($("#entitydetailItemTemplate").html());

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
                document.title = "QldArch: " + this.entity.get1(QA_LABEL, true);
                this.$("h2").text("About " + this.entity.get1(QA_LABEL));
                var $propertylist = this.$(".propertylist");
                $propertylist.empty();
                _.each(this.entity.predicates(), function(predicate) {
                    var property = this.properties.get(predicate);
                    if (property.get1(QA_DISPLAY, true, true)) {
                        $propertylist.append(this.itemTemplate({
                            label: this.properties.get(predicate).get1(QA_LABEL, true),
                            value: this.entity.get1(predicate, logmultiple),
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
            this.properties = options.properties,

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
                if (this.contentDescription) {
                    if (this.$(".imagedisplay img").length != 0 &&
                            this.contentDescription.id === this.$(".imagedisplay img").data("uri")) {
                        return;
                    }

                    console.log("Content");
                    console.log(this.content);
                    console.log("ContentDescription");
                    console.log(this.contentDescription);
                    console.log("Model");
                    console.log(this.model);
                    console.log("Properties");
                    console.log(this.properties);

                    document.title = "QldaArch: " + this.contentDescription.get1(DCT_TITLE, logmultiple);

                    this.$(".imagedisplay").append(this.imageTemplate({
                        label: this.contentDescription.get1(DCT_TITLE),
                        systemlocation: this.contentDescription.get1(QA_SYSTEM_LOCATION, true, true),
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
                    _(this.contentDescription.predicates()).each(function(property) {
                        var propMeta = this.properties.get(property);
                        if (propMeta.get1(QA_DISPLAY, true, true)) {
                            this.$(".propertylist").append(this.detailItemTemplate({
                                label: propMeta.get1(QA_LABEL, logmultiple),
                                value: this.contentDescription.get1(property, logmultiple),
                            }));
                        }
                    }, this);

                    var link = 'http://qldarch.net/omeka/archive/files/' +
                        this.contentDescription.get(QA_SYSTEM_LOCATION);

                    this.$(".propertylist").append(this.detailItemTemplate({
                        label: this.properties.get(QA_SYSTEM_LOCATION).get1(QA_LABEL, logmultiple),
                        value: '<a target="_blank" href="' + link + '">' + link + '</a>',
                    }));
                } else {
                    this.$(".columntitle").text("Unknown Image");
                    this.$(".imagedisplay div.info").remove();
                    this.$(".imagedisplay").prepend(this.infoTemplate({
                        message: "Content not found (" + this.model.get('selection') + ")",
                    }));
                }
            }
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
            console.log("_toggle called");
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
            this.contentDescription = undefined;
            this.transcript = undefined;

            this.model.on("change", this._updateContentDescription);
            _.each(_.values(this.content), function(collection) {
                collection.on("reset", this._updateContentDescription, this)
            }, this);
        },

        events: {
            "keyup input.searchbox"   : "searchTranscript"
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
            var contentId = this.model.get('selection');
            var type = this.model.get('type');
            if (contentId && type && this.content[type]) {
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
                    $(this.transcriptResultTemplate({
                        speaker: result.speaker,
                        time: result.time,
                        transcript: result.transcript,
                    })).appendTo(this.$(".resultlist")).click(function() {
                            $('.subtitle[data-time="' + result.time + '"]').click();
                        });
                }, this);
            }
        },
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

        var contentSearchModel = new ContentSearchModel();

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
                    return _(model.geta(RDFS_SUBCLASS_OF)).contains(QA_DIGITAL_THING);
                },

            comparator: QA_DISPLAY_PRECIDENCE,
        });

        var proper = new SubCollection(displayedEntities, {
            name: "proper",
            tracksort: false,
            predicate: function(model) {
                    return !_(model.geta(RDFS_SUBCLASS_OF)).contains(QA_DIGITAL_THING);
                },

            comparator: QA_DISPLAY_PRECIDENCE,
        });

        interviews.on("reset", function(collection) {
            console.log("\tRESET:INTERVIEWS: " + collection.length);
            console.log(collection);
        });

        /*
        searchModel.on("change", function(model) {
            console.log("\tCHANGE:SEARCHMODEL: " + JSON.stringify(model.toJSON()));
        });

        photographs.on("reset", function(collection) {
            console.log("\tRESET:PHOTOGRAPHS: " + collection.length);
        });

        entities.on("reset", function(collection) {
            console.log("\tRESET:ENTITIES: " + collection.length);
        });
*/
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
            selection: contentSearchModel,
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

        var imageContentView = new ImageContentView({
            router: router,
            model: contentSearchModel,
            properties: properties,
            content: {
                "http://qldarch.net/ns/rdf/2012-06/terms#Photograph": photographs,
                "http://qldarch.net/ns/rdf/2012-06/terms#LineDrawing": linedrawings
            },
        });

        var transcriptView = new TranscriptView({
            router: router,
            model: contentSearchModel,
            content: {
                "http://qldarch.net/ns/rdf/2012-06/terms#Interview": interviews,
            },
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
            contentSearchModel.set(contentSearchModel.defaults);
            document.title = "Digital Archive of Queensland Architecture";

            $("#column123,#column12,#column23").hide();
            contentpaneView.detach();
            imageContentView.detach();
            entityDetailView.detach();
            transcriptView.detach();
            searchView.append("#column1");
            contentView.append("#column2");
            entityView.append("#column3");
            $("#column1,#column2,#column3").show();

        }, searchModel);

        router.on('route:viewentity', function(id) {
            entitySearchModel.set(entitySearchModel.deserialize(id));

            $("#column123,#column1,#column2,#column23").hide();
            searchView.detach();
            entityView.detach();
            imageContentView.detach();
            transcriptView.detach();
            contentpaneView.attach("#column12");
            entityDetailView.append("#column3");
            contentView.append("#column3");
            $("#column12,#column3").show();
        }, entitySearchModel);

        router.on('route:viewimage', function(id) {
            contentSearchModel.set(contentSearchModel.deserialize(id));

            $("#column123,#column2,#column3").hide();
            searchView.detach();
            entityView.detach();
            contentpaneView.detach();
            entityDetailView.detach();
            transcriptView.detach();
            contentView.append("#column1");
            imageContentView.append("#column23");
            $("#column1,#column23").show();
        }, contentSearchModel);

        router.on('route:interview', function(id) {
            contentSearchModel.set(contentSearchModel.deserialize(id));

            $("#column12,#column1,#column2,#column3, #column23").hide();
            searchView.detach();
            entityView.detach();
            contentpaneView.detach();
            entityDetailView.detach();
            contentView.detach();
            imageContentView.detach();
            transcriptView.append("#column123");
            $("#column123").show();
        }, contentSearchModel);

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
        },

        contentViews: {
            "http://qldarch.net/ns/rdf/2012-06/terms#Interview": "interview",
            "http://qldarch.net/ns/rdf/2012-06/terms#Photograph": "viewimage",
            "http://qldarch.net/ns/rdf/2012-06/terms#LineDrawing": "viewimage",
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
