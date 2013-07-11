 
        _displayAnArticle: function(files) {
            var file = selectFileByMimeType(files, "application/pdf");
            if (file) {
                this._displayPdf(file);
                return true;
            } else {
                return false;
            }
        },

    var ContentPropertyViewCollection = Backbone.ViewCollection.extend({
        computeModelArray: function() {
            var contentDescription = this.sources['contentDescription'];
            var properties = this.sources['properties'];
            var entities = this.sources['entities'];

            if (!contentDescription || !properties || !entities) {
                return [];
            }

            var metadata = _(this.contentDescription.predicates()).map(function(predicate) {
                var propDefn = this.properties.get(predicate);
                if (!propDefn) {
                    console.log("Property not found in ontology: " + predicate);
                    return undefined;
                } else if (propDefn.get1(QA_DISPLAY, true, true)) {
                    var value = contentDescription.get1(predicate, logmultiple);
                    var precedence = propDefn.get1(QA_DISPLAY_PRECEDENCE);
                    precedence = precedence ? precedence : MAX_PRECEDENCE;

                    if (propDefn.geta_(RDF_TYPE).contains(OWL_OBJECT_PROPERTY)) {
                        if (entities.get(value) && entities.get(value).get1(QA_LABEL)) {
                            return {
                                label: propDefn.get1(QA_LABEL, logmultiple),
                                value: this.entities.get(value).get1(QA_LABEL, logmultiple),
                                precedence: precedence,
                                uri: predicate,
                            };
                        } else {
                            console.log("ObjectProperty(" + predicate + ") failed resolve");
                            console.log(entities.get(value));
                            return undefined;
                        }
                    } else {
                        return {
                            label: propDefn.get1(QA_LABEL, logmultiple),
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

    var ContentDetailItemView = Backbone.Marionette.ItemView.extend({
        template: "#detailItemTemplate",
    });
        
    var ContentDetailView = Backbone.Marionette.CompositeView.extend({
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
            this.selection = _.checkarg(options.selection).throwNoArg("options.selection");

            this.selectedEntity = new (Backbone.ViewModel.extend({
                computed_attributes: {
                    entity: function() {
                        var entityids = this.get('selectedEntities').get('selection');
                        return (entityids && entityids.length == 1)
                            ? this.get('entities').get(entityids[0])
                            : undefined;
                    }
                },
            }))({
                source_models: {
                    entities: this.entities,
                    selectedEntities: this.selection,
                },
            });

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

    var FileModel = Backbone.ViewModel.extend({
        computed_attributes: {
            contentId: function() {
                return this.get('contentId');
            },

            hasFiles: {
                contentFiles: function() {
                    var content = this.get('contentDescription');
                    var files = this.get('files');
                    if (content.get1(QA_HAS_FILE)) {
                        files.getp(content.geta(QA_HAS_FILE),
                            _.partial(this.fileUpdater, content), this);
                        return true;
                    } else {
                        return false;
                    }
                },
            },

            fileUpdater: function(oldContent, files) {
                var currContent = this.get('contentDescription');
                if (oldContent == currContent) {
                    this.set('files', files);
                }
            },
        },
    });

    var PdfDisplayViewModel = Backbone.ViewModel.extend({
        computed_attributes: {
            url: function() {
                var fileCollections = this.get('files');
                var fileCollection = files ? filecollections[QA_ARTICLE_TYPE] : undefined;

                var contentModel = this.get('contentModel');


                var file = fileResource ?
                    selectFileByMimeType(fileResource, "application/pdf") : undefined;

                if (!file) {
                    return undefined;
                } else {
                    return "/omeka/archive/files/" +
                        file.get1(QA_SYSTEM_LOCATION, true, true);
                }
            },
        },
    });

    var PdfDisplayView = Backbone.Marionette.extend({
        template: "#pdfTemplate",

        initialize: function(options) {
            this.files = _.checkarg(options.files).throwNoArg("options.files");
            this.contentModel = _.checkarg(options.contentModel)
                .throwNoArg("options.contentModel");

            this.model = new PdfDisplayViewModel({
                source_models: {
                    files: this.files,
                    contentModel: this.contentModel,
                },
            });
        },

        onRender: function() {
            this._renderInfoBox();
            this._renderPdfDisplay();
        },

        _renderInfoBox: function () {
            this.$(".info").text("Content not found (" + this.selection.get('selection') + ")");
        },

        _renderPdfDisplay: function() {
            PDFJS.disableWorker = true;
            var url = this.model.get('url');
            if (_.isUndefined(url)) {
                this.$("canvas").hide();
                this.$(".info").show();

            } else {
                this.$(".info").hide();
                this.$("canvas").show();
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
            }
        },
    });

    // Depends on: contentSearchModel, and various content collections keyed by type.
    var PdfContentViewModel = Backbone.ViewModel.extend({
        computed_attributes: {
            contentDescription: function() {
                var contentSearchModel = this.get('contentSearchModel');
                var type = contentSearchModel.get('type');
                if (type !== QA_ARTICLE_TYPE) {
                    return undefined;
                }

                var contentId = contentSearchModel.get('selection');

                if (contentId && type && _.contains(_.keys(content), type)) {
                    return content[type].get(contentId);
                } else {
                    return undefined;
                }
            },

            contentId: function() {
                return this.get('contentSearchModel').get('selection');
            },
        },
    });

    var PdfContentView = Backbone.Marionette.Layout.extend({
        className: "imagepane",
        template: "#imagecontentTemplate",

        regions: { // FIXME: remap these.
            content: ".content",
            metadata: ".imagemetadata",
        },

        initialize: function(options) {
            _.bindAll(this);

            this.contentSearchModel = _.checkarg(options.contentSearchModel)
                .throwNoArg("options.contentSearchModel");
            this.content = _.checkarg(options.content).throwNoArg("options.content");
            this.properties = _.checkarg(options.properties).throwNoArg("options.properties");
            this.entities = _.checkarg(options.entities).throwNoArg("options.entities");
            this.files = _.checkarg(options.files).throwNoArg("options.files");

            this.model = new PdfContentViewModel({
                source_models: _.extend({
                    contentSearchModel: this.contentSearchModel,
                }, content),
            });
        },

        events: {
            "click .imagedisplay"   : "_togglemetadata",
        },

        onRender: {
            this.content.show(new PdfDisplayView({
                contentModel: this.model,
                files: this.files,
            }));

            this.metadata.show(new ContentDetailView({
                entities: this.entities,
                properties: this.properties,
                selection: this.contentSearchModel,
            });
        },
    });



