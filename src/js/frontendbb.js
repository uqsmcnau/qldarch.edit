var frontend = (function() {
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
        tagName: "div",
        className: "generalsearch",

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

    var Photograph = Backbone.Model.extend({ });

    var Photographs = Backbone.Collection.extend({
        model: Photograph,

        initialize: function() {
            var that = this;
            $.getJSON(JSON_ROOT + "photographSummary", function(d) {
                _.chain(d)
                    .map(function(v) { v[RDF_TYPE] = QA_INTERVIEW_TYPE; return v; })
                    .sort(DCT_TITLE)
                    .reverse()
                    .each(function(v) { that.push(new Photograph(v)); console.log(v[DCT_TITLE]); });
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
    }

    return {
        frontendOnReady: frontendOnReady
    };
})();
