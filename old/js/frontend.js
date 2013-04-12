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

function supplant(s, o) {
    return s.replace(
        /\{([^{}]*)\}/g,
        function (a, b) {
            var r = o[b];
            return r == null ? a : String(r);
        }
    );
};

function selectionMethod(selected) {
    if (!selected.hasClass("selected")) {
        if (selected != null) {
            selected.addClass("selected");
        }
        if (this.selection != null) {
            this.selection.removeClass("selected");
        }
        this.selection = selected;

        return true;
    } else {
        selected.removeClass("selected");
        this.selection = null;

        return false;
    }
};

var properties = { };
var types = { };
var contentByRdfType = { };
var contentByURI = { };
var entities = { };
var resourcesByRdfType = { };

function frontendOnReady() {
    $.getJSON(JSON_ROOT + "properties", function(d1) {
        properties = d1;
        properties["uri"] = {
            "uri": "uri",
            "http://qldarch.net/ns/rdf/2012-06/terms#display": false,
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": "http://www.w3.org/2002/07/owl#ObjectProperty",
            "http://qldarch.net/ns/rdf/2012-06/terms#label": "URI Pseudo-property",
            "http://qldarch.net/ns/rdf/2012-06/terms#editable": false
        };
        $.getJSON(JSON_ROOT + "displayedEntities", function(d5) {
            types = _.groupBy(d5, function(value) {
                if (value[RDFS_SUBCLASS_OF] == QA_DIGITAL_THING) {
                    return "artifacts";
                } else {
                    return "proper";
                }
            });
            displayedContent = d5;
            $.getJSON(JSON_ROOT + "interviewSummary", function(d2) {
                contentByRdfType[QA_INTERVIEW_TYPE] = _.map(d2, function(v) { v[RDF_TYPE] = QA_INTERVIEW_TYPE; return v; });
                $.getJSON(JSON_ROOT + "photographSummary", function(d3) {
                    contentByRdfType[QA_PHOTOGRAPH_TYPE] = _.map(d3, function(v) { v[RDF_TYPE] = QA_PHOTOGRAPH_TYPE; return v; });
                    $.getJSON(JSON_ROOT + "lineDrawingSummary", function(d4) {
                        contentByRdfType[QA_LINEDRAWING_TYPE] = _.map(d4, function(v) { v[RDF_TYPE] = QA_LINEDRAWING_TYPE; return v; });

                        contentByURI = _.groupBy(_.values(contentByRdfType), function(entity) {
                                return entity["uri"];
                            });
                        $.getJSON(JSON_ROOT + "entities", function(d6) {
                            entities = d6;
                            resourcesByRdfType = _.groupBy(_.values(entities), function(entity) {
                                return entity[RDF_TYPE];
                            });

                            displayFrontPage();
                        });
                    });
                });
            });
        });
    });
}

(function(target) {
}($("#primary")));

function displayFrontPage(reload) {
    $("#primary").html(
        '<div id="column1" class="span-8">' +
        '    <div id="mainsearch" class="span-8 last">' +
        '        <h2 class="columntitle span-8 last">General Search</h2>' +
        '        <div id="searchdiv" class="span-8 last"/>' +
        '    </div>' +
        '</div>' +
        '<div id="column2" class="span-8">' +
        '    <div id="maincontent" class="span-8 last">' +
        '        <h2 class="columntitle span-8 last">Digital Content</h2>' +
        '        <div id="contentdiv" class="span-8 last"/>' +
        '    </div>' +
        '</div>' +
        '<div id="column3" class="span-8 last">' +
        '    <div id="mainentities" class="span-8 last">' +
        '        <h2 class="columntitle span-8 last">People and Things</h2>' +
        '        <div id="entitydiv" class="span-8 last"/>' +
        '    </div>' +
        '</div>');
    displaySearchDiv($("#searchdiv"));
    displayContentDiv($("#contentdiv"));
    displayEntityDiv($("#entitydiv"));
    if (!reload) {
        updateEntities(matchnone, matchall, true, true);
        updateContentDiv(matchnone, matchall, matchnone, true, true);
    } else {
        reload();
    }
}


function displaySearchDiv(parentDiv) {
    parentDiv.html('<div><input class="span-8 last" type="text" value="" placeHolder="Search Content, People and Things"/></div>');

    parentDiv.find("input").keyup(function () {
        var val = $(this).val();
        updateEntities(makeperfectstring(val), makepartialstring(val), true, (val == ""));
        updateContentDiv(makeperfectlabel(val), makepartialkeywords(val), matchnone, true, (val == ""));
        $("#entitydiv .available input").val(val);
    });
}

function updateSearchDiv(val) {
    if ($("#searchdiv")) {
        $("#searchdiv input").val(val);
    }
}

function setupContentDisplay() {
    var ContentDisplayModel = Backbone.Model.extend();

    var ContentDisplay = Backbone.View.extend({
        tagName: "div",
        className: "contenttype",
        template: _.template($("#contenttypeTemplate").html()),
    
        events: {},
    
        render: function() {
            $(this.el).html(this.template({
                    uri: model.get('uri'),
                    label: model.get(QA_LABEL)
                }));
        }
    });
}

function displayContentDiv(parentDiv) {
    types.artifacts.forEach(function(type) {
        var typeDiv = $(supplant(
            '<div class="contenttype" data-uri="{uri}">' +
            '    <div class="contentlisttitle span-8">{' + QA_LABEL + '}</div><div class="contentlist"></div>' +
            '</div>', type));
        typeDiv.data("type", type);
        parentDiv.append(typeDiv)
    });

    parentDiv.append('<div class="info span-8 last" style="display:none">No content matches</div>');
}

function updateContentDiv(perfectmatch, partialmatch, relatedTo, show, isEmpty) {
    var val = $.trim(val);
    $(".contenttype").each(function (i, contentDiv) {
        var type = $(contentDiv).data("type");
        var list = $(contentDiv).find(".contentlist");
        list.empty();
        var resources = [];
        var contentRecords = contentByRdfType[type.uri];
        if (contentRecords && !isEmpty) {
            contentRecords.forEach(function(resource) {
                if (perfectmatch(resource)) {
                    resources.push(resource);
                }
            });
            if (resources.length == 0) {
                contentRecords.forEach(function(resource) {
                    if (partialmatch(resource) || relatedTo(resource)) {
                        resources.push(resource);
                    }
                });
            }
        } else {
            // Search box is empty.
            if (contentRecords && contentRecords.length > 0) {
                $(contentDiv).addClass("available");
                for (c = 0; c < 50 && c < contentRecords.length; c++) {
                    resources.push(contentRecords[c]);
                }
            }
        }
        if (resources.length == 0) {
            $(contentDiv).removeClass("available");
            $(contentDiv).fadeOut("fast");
        } else {
            $(contentDiv).addClass("available");
            $(contentDiv).fadeIn("fast");
            resources.forEach(function(resource) {
                var entry = $('<div class="contententry">' + resource[DCT_TITLE] + '</div>');
                list.append(entry);
                entry.click(selectFunctions[resource[RDF_TYPE]](resource, entry));
            });
        }
    });
    var available = $(".contenttype.available");
    if (available.length != 0) {
        $("#contentdiv .info").fadeOut("fast");
        available.filter(":not(:last)").removeClass("final");
        available.filter(":last").addClass("final");
    } else {
        $("#contentdiv .info").fadeIn("fast");
    }
}

function displayEntityDiv(parentDiv) {
    types.proper.forEach(function(type) {
        var uid = _.uniqueId("wordcloud_");
        var typeDiv = $(supplant(
            '<div class="entity" data-uri="{uri}">' +
                '<input class="searchbox span-5" type="text" placeHolder="Search {' + QA_LABEL + '}"/>' +
                '<div class="button slim span-3 last switchwc" style="display:none">As Wordcloud</div>' +
                '<div class="button slim span-3 last switchlist">As List</div>' +
                '<div id="{id}" class="wordgram span-8 last">' +
                '</div>' +
                '<div class="entityworking span-8 last" style="display:none"><div class="entitylisttitle">{' + QA_LABEL + '}</div><div class="entitylist"></div></div>' +
            '</div>', _.extend({ id : uid }, type)));
        typeDiv.data("type", type);
        parentDiv.append(typeDiv)
        makeWordCloud("#" + uid, wordclouds[type.uri]);

        $("svg text").click(function() {
            $(this).parents(".entity").find("input").val($(this).text()).keyup();
        }).mouseenter(function() {
            $(this).animate({opacity:'0.75'});
        }).mouseleave(function() {
            $(this).animate({opacity:'1'});
        });

        typeDiv.find("input")
            .keyup(function() {
                var val = $(this).val();
                updateSearchDiv(val);
                updateEntities(makeperfectstring(val), makepartialstring(val), false, (val == ""));
                updateContentDiv(makeperfectlabel(val), makepartialkeywords(val), matchRelatedTo(), false, (val == ""));
                if (val != "") {
                    $(this).parents(".entity").siblings().removeClass("final").fadeOut("fast");
                    $(this).parents(".entity").addClass("final").fadeIn("fast");
                    typeDiv.find(".button").fadeOut("fast");
                } else {
                    typeDiv.find(".button.switchwc").hide();
                    typeDiv.find(".button.switchlist").fadeIn("fast");
                }
            });
        typeDiv.find(".button.switchlist").click(function() {
            updateEntity(makeperfecttype(type.uri), matchnone, false, !type.uri, typeDiv);
            $(this).fadeOut("fast", function() {
                typeDiv.find(".button.switchwc").fadeIn("fast");
            });
        });
        typeDiv.find(".button.switchwc").click(function() {
            $(this).fadeOut("fast", function() {
                typeDiv.find(".button.switchlist").fadeIn("fast");
            });
            typeDiv.find(".entityworking").fadeOut("fast", function() {
                typeDiv.find(".wordgram").fadeIn("fast");
            });
        });
    });

    parentDiv.append('<div class="info span-8 last" style="display:none">No people or things match</div>');
}

function matchRelatedTo() {
    var resources = $.map($(".entityentry"), function(e) { return $(e).data("resource"); });
    return function(contentResource) {
        return _.any(resources, function(entityResource) {
            return entityResource &&
                _.contains(_.flatten([contentResource["qldarch:relatedTo"]]), entityResource.uri);
        });
    };
}

function matchall(resource) {
    return true;
}

function matchnone(resource) {
    return false;
}

function makepartialstring(value) {
    return function(resource) {
        var val = $.trim(value);
        var found = false;
        val.split(/\W/).forEach(function(word) {
            if (word != "" && (
                    resource[QA_LABEL] && resource[QA_LABEL].toLowerCase().indexOf(word.toLowerCase()) != -1 ||
                    resource[RDFS_LABEL] && resource[RDFS_LABEL].toLowerCase().indexOf(word.toLowerCase()) != -1)) {
                    
                found = true;
            }
        });

        return found;
    };
};

function makeperfectlabel(value) {
    return function(resource) {
        var lhs = $.trim(value).toLowerCase();
        return resource[QA_LABEL] && lhs == resource[QA_LABEL].toLowerCase() ||
                resource[RDFS_LABEL] && lhs == resource[RDFS_LABEL].toLowerCase();
    };
}

function makeperfectstring(lhs) {
    return function(resource) {
        return resource[QA_LABEL] && lhs.toLowerCase() == resource[QA_LABEL].toLowerCase() ||
                resource[RDFS_LABEL] && lhs.toLowerCase() == resource[RDFS_LABEL].toLowerCase();
    };
}

function makepartialkeywords(value) {
    return function(resource) {
        var val = $.trim(value);
        var keywords = resource.keywords.split("|");
        var somefound = false;
        var allfound = true;
        val.split(/\W/).forEach(function(word) {
            if (word != "") {
                var contained = false;
                keywords.forEach(function(keyword) {
                    if (keyword.toLowerCase().indexOf(word.toLowerCase()) != -1) {
                        contained = true;
                    }
                });
                somefound = somefound || contained;
                allfound = allfound && contained;
            }
        });

        return somefound && allfound;
    };
}

function makeperfectrelatedTo(value) {
    function perfectrelatedTo(resource) {
        var relatedTo = resource["qldarch:relatedTo"];
        return value &&
            (value == resource.uri ||
             $.isArray(relatedTo) ? (relatedTo.indexOf(value) != -1) : value == relatedTo);
    }

    return perfectrelatedTo;
}

function makeperfecttype(value) {
    function matchperfecttype(resource) {
        return value &&
            resource &&
            resource[RDF_TYPE] &&
            value == resource[RDF_TYPE];
    };
    return matchperfecttype;
}

function updateEntity(perfectmatch, partialmatch, show, isEmpty, entity) {
    var type = $(entity).data("type");
    var list = $(entity).find(".entitylist");
    list.empty();
    if (!isEmpty) {
        $(entity).find(".wordgram").fadeOut("fast", function() {
            $(entity).find(".entityworking").fadeIn("fast");
        });
        var resources = [];
        resourcesByRdfType[type.uri].forEach(function(resource) {
            if (perfectmatch(resource)) {
                resources.push(resource);
            }
        });
        if (resources.length == 0) {
            console.log(resourcesByRdfType[type.uri]);
            resourcesByRdfType[type.uri].forEach(function(resource) {
                console.log(resource);
                if (partialmatch(resource)) {
                    resources.push(resource);
                }
            });
        }
        if (resources.length == 0) {
            $(entity).removeClass("available");
            $(entity).fadeOut("fast");
        } else {
            $(entity).addClass("available");
            if (show) {
                $(entity).fadeIn("fast");
            }
            resources.forEach(function(resource) {
                var entry = $('<div class="entityentry">' + resource[QA_LABEL] + '</div>');
                entry.data("resource", resource);
                list.append(entry);
                entry.click(function() {
                    if (!entry.hasClass("selected")) {
                        onClickEntity(resource);
                        entry.addClass("selected");
                        var input = entry.parents(".entity").find("input");
                        var restore = function() {
                            restoreFromEntity()
                            input.val("");
                            input.keyup();
                        };

                        input.val(resource[QA_LABEL]).one("keyup", restore);
                        entry.one("click", restore);
                        entry.siblings(".entityentry").fadeOut("fast");
                        entry.parents(".entity").siblings().removeClass("available");
                        updateEntitiesDisplayed();
                    }
                });
            });
        }
    } else {
        // Search box is empty.
        $("input").val("");
        $(".entity").fadeIn("fast");
        $(entity).addClass("available");
        $(entity).find(".entityworking").fadeOut("fast", function() {
            $(entity).find(".wordgram").fadeIn("fast");
        });
    }
}

function updateEntitiesDisplayed() {
    $(".entity").filter(":not(.available)").fadeOut("fast");
    var available = $(".entity.available");
    if (available.length != 0) {
        $("#entitydiv .info").fadeOut("fast");
        available.filter(":not(:last)").removeClass("final");
        available.filter(":last").addClass("final");
    } else {
        $("#entitydiv .info").fadeIn("fast");
    }
}

function updateEntities(perfectmatch, partialmatch, show, isEmpty) {
    $(".entity").each(function (i, entity) {
        updateEntity(perfectmatch, partialmatch, show, isEmpty, entity);
    });
    updateEntitiesDisplayed();
}

var contentSelection = new Object();
contentSelection.selection = null;
contentSelection.select = selectionMethod;

function onClickEntity(resource) {
    var desc = $("#mainentities")
        .append(
            '<div class="entitydetail span-8 last">' +
                '<h2 class="columntitle span-8 last">About ' + resource.label + '</h2>' +
                '<div class="entitydescription span-8 last"/>' +
            '</div>')
        .find(".entitydescription");
    
    var list = desc.append('<div class="propertylist"/>').find(".propertylist");
    for (uri in entities[resource.uri]) {
        if (properties[uri][QA_DISPLAY]) {
            var value = entities[resource.uri][uri];
            if (value) {
                var first = "";
                var rest = [];
                if (_.isArray(value)) {
                    first = _.first(value);
                    rest = _.rest(value);
                } else {
                    first = value;
                }
                var arg = {
                        "label" : properties[uri][QA_LABEL],
                        "value" : properties[uri][RDF_TYPE] == OWL_DATATYPE_PROPERTY ?
                            first :
                            entities[first][QA_LABEL]
                };
                list.append(supplant(
                    '<div class="propertypair span-8 last">' +
                    '<span class="propertylabel span-3">{label}</span>' +
                    '<span class="propertyvalue span-5 last" type="text">{value}</span></div>', arg));
                rest.forEach(function(v) {
                    var arg = {
                            "label" : "&nbsp;",
                            "value" : properties[uri][RDF_TYPE] == OWL_DATATYPE_PROPERTY ?
                                v :
                                entities[v][QA_LABEL]
                    };
                    list.append(supplant(
                        '<div class="propertypair span-8 last">' +
                        '<span class="propertylabel span-3">{label}</span>' +
                        '<span class="propertyvalue span-5 last" type="text">{value}</span></div>', arg));
                });
            }
        }
    }

    if ($("contentpane:visible").length == 0) {
        $("#column3").prepend($("#mainentities").detach());
        $("#column3").append($("#maincontent").detach());
        $("#column1").hide();
        $("#column2").hide();
        $("#mainsearch").fadeOut("fast");
        $("#primary").prepend('<div id="contentpane" class="span-16"/>');
        updateContentDiv(makeperfectrelatedTo(resource.uri), matchnone, matchnone, true, !resource.uri);
    }

    $("#contentpane").append('<div class="contentpanetabs span-16"/><div class="content span-16"><div/></div>');


    $('<span class="button tab">Related Content</span>')
        .appendTo($("#contentpane .contentpanetabs"))
        .click(function() {
            if (contentSelection.select($(this))) {
                $("#contentpane .content>:visible").hide(function() {
                    $(this).remove();
                    displayRelatedContentPane(resource);
                });
            }
        })
        .click();

    $('<span class="button tab">Related Network</span>')
        .appendTo($("#contentpane .contentpanetabs"))
        .click(function() {
            if (contentSelection.select($(this))) {
                $("#contentpane .content>:visible").hide(function() {
                    $(this).remove();
                    displayRelatedNetworkPane(resource);
                });
            }
        });

    $('<span class="button tab">Related Timeline</span>')
        .appendTo($("#contentpane .contentpanetabs"))
        .click(function() {
            if (contentSelection.select($(this))) {
                $("#contentpane .content>:visible").hide(function() {
                    $(this).remove();
                    displayRelatedTimelinePane(resource);
                });
            }
        });

}

function displayRelatedContentPane(resource) {
    var relatedContent = [];
    for (rdftype in contentByRdfType) {
        if (rdftype == QA_PHOTOGRAPH_TYPE || rdftype == QA_LINEDRAWING_TYPE) {
            contentByRdfType[rdftype].forEach(function(content) {
                if (content["qldarch:relatedTo"] == resource.uri) {
                    relatedContent.push(content);
                }
            });
        }
    }
    if (relatedContent.length == 0) {
        $("#contentpane .content").append('<div class="info span-8">No related content found</div>');
    } else {
        if ($("#mainimage").length == 0) {
            $("#contentpane .content").append('<div id="mainimage" class="relatedcontentpane span-16 last">');
        }

        var contentid = 0;

        $("#mainimage").append(supplant(
            '<h3>{label}</h3><a href="{image}" style="display:none"><img class="span-16 last" src="{image}" alt="{label}"/></a>', relatedContent[contentid]));
        contentid = (contentid + 1) % relatedContent.length;

        function transitionImage() {
            if (relatedContent.length > 1) {
                $("#mainimage").children("a:first")
                    .delay(3000)
                    .fadeOut("slow", function() {
                        $("#mainimage").append(supplant(
                            '<a href="{image}" style="display:none">' + 
                            '<img class="span-16 last" src="{image}" alt="{label}"/>' +
                            '</a>', relatedContent[contentid]));
                        $("#mainimage h3").text(relatedContent[contentid].label);
                        contentid = (contentid + 1) % relatedContent.length;
                        $("#mainimage").children("a:last").fadeIn("slow", function() {
                            $(this).siblings("a").remove();
                            transitionImage();
                        });
                    });
            }
        }

        $("#mainimage a").fadeIn("slow", transitionImage);
    }
}

function displayRelatedNetworkPane(resource) {
    var networkpane = $('<div class="relatednetworkpane"/>').appendTo("#contentpane .content");
    if (false) {
        $("#contentpane .content .relatednetworkpane")
            .append('<div class="info span-8">No related network found</div></div>');
    } else {
        networkpane.append(
            '<div class="networklegend span-16">' +
            '<div class="nodelegend span-8">' +
            '</div>' +
            '<div class="linklegend span-8 last">' +
            '</div>' +
            '</div>');

        displayNodeLegend(networkpane.find(".nodelegend"));
        displayLinkLegend(networkpane.find(".linklegend"));
        var links = [];
        pushLinks(links, "qldarch:employedBy", "linktype1");
        pushLinks(links, "qldarch:designedBy", "linktype2");
        pushLinks(links, "qldarch:collaboratedWith", "linktype3");

        drawgraph("#contentpane .content .relatednetworkpane", links,
            function(link) {
                return entities[link] ? entities[link].label : "unknown";
            });
    }
}

function displayNodeLegend(legenddiv) {
    legenddiv.append(
        '<div class="lengendentry span-8">' +
            '<div class="graphic span-4">' +
            '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="14" height="14">' +
            '<g><circle cx="7" cy="7" r="6" class="source"/></g>' +
            '</svg></div>' +
            '<div class="legendlabel span-4 last">Architect</div>' +
            '<div class="graphic span-4">' +
            '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="14" height="14">' +
            '<g><circle cx="7" cy="7" r="6" class="target"/></g>' +
            '</svg></div>' +
        '<div class="legendlabel span-4 last">Firm</div>' +
        '</div>');
}

function displayLinkLegend(legenddiv) {
    legenddiv.append(
        '<div class="lengendentry span-8">' +
            '<div class="graphic span-4">' +
            '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="60" height="14">' +
            '<defs><marker id="legendlink1" viewBox="0 -5 10 10" refX="10" refY="0" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,-5L10,0L0,5"/></marker></defs>' +
            '<g><path class="link linktype1" marker-end="url(#legendlink1)" d="M0,14A60,60 0 0,1 60,14"/></g>' +
            '</svg></div>' +
            '<div class="legendlabel span-4 last">Employed By</div>' +
        '</div>');
}

function pushLinks(linkArray, predicate, linkclass) {
        _.values(entities).forEach(function(entity) {
            if (entity[predicate]) {
                _.flatten([entity[predicate]]).forEach(
                    function(e) {
                        linkArray.push({
                            source: entity.uri,
                            target: entities[e].uri,
                            type: linkclass
                        });
                    });
            }
        });
}

function displayRelatedTimelinePane(resource) {
    $("#contentpane .content").append('<div class="relatedtimelinepane"/>');
    if (false) {
        $("#contentpane .content .relatedtimelinepane")
            .append('<div class="info span-8">No related network found</div></div>');
    } else {
        $("#contentpane .content .relatedtimelinepane").append('<div class="span-16" id="timelinediv"/>');
        createStoryJS({
            type: 'timeline',
            width: '630',
            height: '660',
            source: 'json/BVN.json',
            embed_id: 'timelinediv',
            debug: true
        });
    }
}

function restoreFromEntity() {
    $("#contentpane").fadeOut("fast", function() {
        $(this).remove();
        $("#column1").show();
        $("#column2").show();
        $("#mainsearch").fadeIn("fast").after($("#maincontent").detach());
        $("#column2").append($("#maincontent").detach());
        $("#column3").append($("#mainentities").detach());
        $("#mainentities .entitydetail").remove();
    });
}

function displayInterview(resource) {
    $.getJSON(resource.transcript, function(transcript) {
        $("#primary").html(supplant(
            '<div id="headerdiv" class="span-24">' +
                '<div class="span-18">' +
                    '<h2 class="columntitle">{title}</h2>' + 
                    '<h3>Conducted on {date}</h3>' +
                '</div>' +
                '<div class="returnbutton span-6 last">Front page...</div>' +
            '</div>' + 
            '<div id="audiodiv" class="span-8"></div>', transcript));

        $("#primary .returnbutton").click(function() {
            displayFrontPage();
        });

        $("#audiodiv").append(supplant(
            '<audio id="audiocontrol" class="span-8" controls="controls">' + 
                '<source src="{audio}" type="audio/ogg">' +
            '</audio>' +
            '<div id="transcript" class="transcript span-8">', resource));

        $("#primary").append(
            '<div id="interviewcontentdiv" class="span-16 last">' +
            '</div>');

        $("#interviewcontentdiv").append('<div class="contentpanetabs span-16"/><div class="content span-16"><div/></div>');


        $('<span class="button tab">Search Transcript</span>')
            .appendTo($("#interviewcontentdiv .contentpanetabs"))
            .click(function() {
                if (contentSelection.select($(this))) {
                    $("#interviewcontentdiv .content>:visible").hide(function() {
                        $(this).remove();
                        displaySearchTranscript(transcript);
                    });
                }
            }).click();

        $('<span class="button tab">Related Content</span>')
            .appendTo($("#interviewcontentdiv .contentpanetabs"))
            .click(function() {
                if (contentSelection.select($(this))) {
                    $("#interviewcontentdiv .content>:visible").hide(function() {
                        $(this).remove();
                       displayRelatedTranscriptContentPane(transcript);
                    });
                }
            });

        linkAndPlayInterview(transcript, $("#transcript"));
    });
}

function displaySearchTranscript(transcript) {
    $("#interviewcontentdiv .content").append(
        '<div class="searchtranscriptpane span-16 last" style="margin-top:-10px">' +
        '<div class="span-16 last">' +
        '<input class="searchbox span-8" type="text" value="" placeHolder="Search Transcript"/>' +
        '</div>' +
        '<div class="searchresults span-16 last">' +
            '<div class="entitylisttitle">Utterances</div>' +
            '<div class="resultlist"/>' +
        '</div>' +
        '</div>');

    $("#interviewcontentdiv input").keyup(function(event) {
        var val = $(this).val();
        var results = [];
        if (event.keyCode == 13 || val.length > 3) {
            transcript.exchanges.forEach(function(exchange) {
                if (exchange.transcript.indexOf(val) != -1) {
                    results.push(exchange);
                }
            });
        }
        $("#interviewcontentdiv .resultlist").empty();
        results.forEach(function(result) {
            $(supplant('<div class="transcriptref">' +
                    '<span class="transcriptlabel">{speaker} @ {time}</span>' +
                    '<span class="transcripttext">{transcript}</span' +
                    '</div>', result))
                .appendTo("#interviewcontentdiv .resultlist")
                .click(function() {
                    $('.subtitle[data-time="' + result.time + '"]').click();
                });
        });
    });
}

function displayRelatedTranscriptContent(transcript) {
    // Find all entities and content relatedTo this transcript.
    // Do partial word search from transcript through entities to infer related entities.
    // Find content related to entities.
    // Find entities related to content.
    // Prepare list of related entities (union of entities found above)
    // Prepare carosel of related image content (filtered union of content found above)
    // Display entities and non-image content list
    // Display carosel
}

function linkAndPlayInterview(transcript, transcriptdiv) {
    function subtitleUpdater(jqElement, offset, show) {
        var toppos = jqElement.position().top - offset;
        return function(options) {
            if (show) {
                jqElement.animate({"opacity": "1.0"});
                transcriptdiv.animate({"scrollTop": toppos - 50}, function() { jqElement.animate({"opacity": "1.0"}); });
            } else {
                transcriptdiv.stop();
                jqElement.animate({"opacity": "0.5"});
            }
        };
    }

    var popcorn = Popcorn("#audiocontrol");
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
}

function displayImage(resource, entry) {
    if ($("#contentpane:visible").length == 0) {
        $("#primary").append('<div id="contentpane" class="span-16 last"><h2 class="columntitle"/></div>');
        $("#column1").prepend($("#maincontent").detach());
        $("#column1").append($("#mainentities").detach());
        $("#mainsearch").fadeOut("fast");
        updateEntities(makeperfectrelatedTo(resource.uri), matchnone, true, !resource.uri);
    }

    $("#contentpane h2").text(resource.label);
    if ($("#mainimage").length == 0) {
        $("#contentpane").append('<div id="mainimage" class="span-16 last">');
    }

    $("#mainimage").append(supplant(
        '<a href="http://qldarch.net/omeka/archive/files/{' + QA_SYSTEM_LOCATION + '}" style="display:none"><img class="span-16 last" src="http://qldarch.net/omeka/archive/files/{' + QA_SYSTEM_LOCATION + '}" alt="{' + QA_LABEL + '}"/></a>', resource));
    $("#mainimage").children("a:first").fadeOut("slow", function() {
        $("#mainimage").children("a:last").fadeIn("slow", function() {
            $(this).siblings().remove();
        });
    });
}

function restoreFromImage(entry) {
    entry.removeClass("selected");
    $("#contentpane").fadeOut("fast", function() {
        $(this).remove();
    });
    $("#column2").append($("#maincontent").detach());
    $("#column3").append($("#mainentities").detach());
    $("#mainsearch").fadeIn("fast").find("input").keyup();
}

function selectForInterview(resource, entry) {
    return function() {
        displayInterview(resource);
    };
}

var imageSelection = new Object();
imageSelection.selection = null;
imageSelection.select = selectionMethod;

function selectForImage(resource, entry) {
    return function() {
        if (imageSelection.select(entry)) {
            displayImage(resource, entry);
        } else {
            restoreFromImage(entry);
        }
    };
}

var selectFunctions = {
    "http://qldarch.net/ns/rdf/2012-06/terms#Interview" : selectForInterview,
    "http://qldarch.net/ns/rdf/2012-06/terms#Photograph" : selectForImage,
    "http://qldarch.net/ns/rdf/2012-06/terms#LineDrawing" : selectForImage,
};

