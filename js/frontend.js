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
        return false;
    }
};

var selection = new Object();
selection.selection = null;
selection.select = selectionMethod;

function setDefinition(definition, k) {
    $(".definitionbox>*:visible").fadeOut("fast", function() {
        $(".definitionbox").html('<div class="definition" style="display:none">' + definition + '</div>');
        $(".definitionbox .definition").fadeIn("fast");

        if (k) {
            k();
        }
    });
}

function populatePropertiesBox(targetJQ, properties, types) {
    var selector = targetJQ.html('<div class="propertyselector"></div>').children(".propertyselector");
    selector.selected = null;
    properties.forEach(function(property) {
        var option = selector.append(supplant(
                '<div class="propertyoption" data-uri="{uri}">... {label} ...</div>',
                property)).children().last();
        option.data("rdfsummary", property);
        option.click(function() {
            if (selection.select($(this))) {
                var sub = $(".propertydiv .target:first");
                sub.empty();
                property.domain.forEach(function(uri) {
                    types.forEach(function(type) {
                        if (type.uri == uri) {
                            populateEntitySelection(sub, type, selectForRelationship);
                        }
                    });
                });

                var obj = $(".propertydiv .target:last");
                obj.empty();
                property.range.forEach(function(uri) {
                    types.forEach(function(type) {
                        if (type.uri == uri) {
                            populateEntitySelection(obj, type, selectForRelationship);
                        }
                    });
                });

                setDefinition(property.definition);
            }
        });
    });
}

function populateEntitiesBox(targetJQ, properties) {
    var selector = targetJQ.html('<div class="propertyselector entity"></div>').children(".propertyselector");
    selector.selected = null;
    properties.forEach(function(entity) {
        var option = selector.append(supplant(
                '<div class="propertyoption" data-uri="{uri}">{label} ...</div>',
                entity)).children().last();
        option.data("rdfsummary", entity);
        option.click(function() {
            if (!$(this).hasClass("selected")) {
                selection.select($(this));
                setDefinition(entity.definition);
                var target = $(".entitydiv>.target:first");
                target.empty();
                populateEntitySelection($(".entitydiv>.target:first"), entity, selectForEntity);
            }
        });
    });
}


function selectForEntity(workingDiv, entityDiv, resource, entry) {
    return function() {
        entityDiv.find(".searchbox").val(resource.label);
        $(this).addClass("selected").siblings().fadeOut("fast", function() { $(this).remove(); });
        var targetDiv = $("#definediv .target");
        if (!entities[resource.uri]) {
            targetDiv.append('<div class="alert">Demo mode data not found</div>');
        } else {
            targetDiv.append('<div class="detailsbox"></div>');
            var detailsDiv = targetDiv.find(".detailsbox");
            for (uri in entities[resource.uri]) {
                if (properties[uri].editable) {
                    var arg = {
                            "label" : properties[uri].label,
                            "value" : entities[resource.uri][uri]
                    };
                    detailsDiv.append(supplant('<div class="propertypair span-8 last">' +
                        '<label class="propertylabel span-3">{label}</label>' +
                        '<input class="propertyvalue span-4 last" type="text" value="{value}"/></div>', arg));
                }
            }
            targetDiv.append('<div class="button span-8 last">Update/Create Entity</div>')
                .find(".button")
                .click(function() {
                    $(this).fadeOut("fast", function() {
                        $(this).replaceWith('<div class="success span-8 last">Entity Updated</div>');
                        targetDiv.children().delay(successDelay).fadeOut("slow", function() {
                            $(this).remove();
                        });
                    });
                });
        }
    };
}


function selectForRelationship(workingDiv, entityDiv, resource, entry) {
    return function() {
        entityDiv.find(".searchbox").val(resource.label);
        $(this).addClass("selected").siblings().fadeOut("fast", function() { $(this).remove(); });
        if ($(".entitylist .selected").length == 2 &&
                $(".confirmrelationship.button").length == 0) {
            var reificationType = $("#relationshipdiv .selected").data("rdfsummary").reification;
            $("#relationshipdiv").append('<div class="relationshipbox"></div>');
            var relationshipDiv = $("#relationshipdiv .relationshipbox");

            if (reificationType) {
                relationshipDiv.append('<div class="detailsbox"></div>');
                var detailsDiv = $("#relationshipdiv .detailsbox");
                $.each(properties, function(i, property) {
                    // If the domain contains the relatinship
                    if (property.editable && property.domain && property.domain.indexOf(reificationType) != -1) {
                        var arg = {
                                "label" : property.label,
                                "value" : ""
                        };
                        detailsDiv.append(supplant('<div class="propertypair span-8 last">' +
                            '<label class="propertylabel span-3">{label}</label>' +
                            '<input class="propertyvalue span-4 last" type="text" value="{value}"/></div>', arg));
                    }
                });
            }
            relationshipDiv.append(
                '<div class="confirmrelationship button span-8 last">Confirm Relationship</div>')
                .find(".button")
                .click(function() {
                    $(this).fadeOut("fast", function() {
                        $(this).replaceWith('<div class="success span-8 last">Relationship Added</div>');
                        relationshipDiv.delay(successDelay).fadeOut("slow", function() {
                            $(this).remove();
                        });
                    });
                });
        }
    };
}

function frontendOnReady() {
    displayFrontPage();
}

function displayFrontPage() {
    $("#primary").html(
        '<div id="mainsearch" class="span-8">' +
            '<h2 class="columntitle span-8">Search</h2>' + 
            '<div id="searchdiv" class="span-8"/>' +
        '</div>' +
        '<div id="maincontent" class="span-8">' +
            '<h2 class="columntitle span-8">Digital Content</h2>' +
            '<div id="contentdiv" class="span-8"/>' +
        '</div>' +
        '<div id="mainentities" class="span-8 last">' +
            '<h2 class="columntitle span-8 last">People and Things</h2>' +
            '<div id="entitydiv" class="span-8 last"/>' +
        '</div>');
    displaySearchDiv($("#searchdiv"));
    displayContentDiv($("#contentdiv"));
    displayEntityDiv($("#entitydiv"));
    updateEntities("");
    updateContentDiv("");
}

function displaySearchDiv(parentDiv) {
    parentDiv.html('<input class="span-8 last" type="text" value="" placeHolder="Search Content, People and Things"/></div>');

    parentDiv.find("input").keyup(function () {
        updateEntities($(this).val());
        updateContentDiv($(this).val());
    });
}

function displayContentDiv(parentDiv) {
    types.artifacts.forEach(function(type) {
        var typeDiv = $(supplant(
            '<div class="contenttype" data-uri="{uri}">' +
            '    <div class="contentworking span-8 last"><div class="contentlisttitle span-8">{plural}</div><div class="contentlist"></div></div>' +
            '</div>', type));
        typeDiv.data("type", type);
        parentDiv.append(typeDiv)
    });
}

function updateContentDiv(val) {
    val = $.trim(val);
    $(".contenttype").each(function (i, contentDiv) {
        var type = $(contentDiv).data("type");
        var list = $(contentDiv).find(".contentlist");
        list.empty();
        var resources = [];
        var contentRecords = contentByRdfType[type.uri];
        if (val != "") {
            contentRecords.forEach(function(resource) {
                if (val == resource.label) {
                    resources.push(resource);
                }
            });
            if (resources.length == 0) {
                contentRecords.forEach(function(resource) {
                    var keywords = resource.keywords.split("|");
                    var somefound = false;
                    var allfound = true;
                    val.split(" ").forEach(function(word) {
                        if (word != "") {
                            var contained = false;
                            keywords.forEach(function(keyword) {
                                if (keyword.indexOf(word) != -1) {
                                    contained = true;
                                }
                            });
                            somefound = somefound || contained;
                            allfound = allfound && contained;
                        }
                    });
                    if (somefound && allfound) {
                        resources.push(resource);
                    }
                });
            }
        } else {
            // Search box is empty.
            if (contentRecords && contentRecords.length > 0) {
                $(contentDiv).addClass("available");
                for (c = 0; c < 10 && c < contentRecords.length; c++) {
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
                var entry = $('<div class="contententry">' + resource.label + '</div>');
                list.append(entry);
                entry.click(selectFunctions[resource["rdf:type"]](resource, entry));
            });
        }
    });
    var available = $(".contenttype.available");
    available.filter(":not(:last)").removeClass("final");
    available.filter(":last").addClass("final");
}

function displayEntityDiv(parentDiv) {
    menuProperties.types.forEach(function(type) {
        var typeDiv = $(supplant(
            '<div class="entity" data-uri="{uri}">' +
            '    <div class="wordgram span-8 last">' +
            '    <input class="searchbox" type="text" placeHolder="Find {label}"/>' +
            '    <img class="first span-8 last" src="img/wordcram.png" alt="{label} Wordcram"/>' +
            '    </div>' +
            '    <div class="entityworking span-8 last" style="display:none"><div class="entitylisttitle span-8">{label}</div><div class="entitylist"></div></div>' +
            '</div>', type));
        typeDiv.data("type", type);
        parentDiv.append(typeDiv)
    });
}

function updateEntities(val) {
    val = $.trim(val);
    $(".entity").each(function (i, entity) {
        var type = $(entity).data("type");
        var list = $(entity).find(".entitylist");
        list.empty();
        if (val != "") {
            $(entity).find(".wordgram").fadeOut("fast", function() {
                $(entity).find(".entityworking").fadeIn("fast");
            });
            var resources = [];
            resourcesByRdfType[type.uri].forEach(function(resource) {
                if (val == resource.label) {
                    resources.push(resource);
                }
            });
            if (resources.length == 0) {
                resourcesByRdfType[type.uri].forEach(function(resource) {
                    var found = false;
                    val.split(" ").forEach(function(word) {
                        if (word != "" && resource.label.indexOf(word) != -1) {
                            found = true;
                        }
                    });
                    if (found) {
                        resources.push(resource);
                    }
                });
            }
            if (resources.length == 0) {
                $(entity).removeClass("available");
                $(entity).fadeOut("fast");
            } else {
                $(entity).addClass("available");
                $(entity).fadeIn("fast");
                resources.forEach(function(resource) {
                    var entry = $('<div class="entityentry">' + resource.label + '</div>');
                    list.append(entry);
    //                entry.click(onSelectGenerator(workingDiv, entityDiv, resource, entry, selection));
                });
            }
        } else {
            // Search box is empty.
            $(".entity").fadeIn("fast");
            $(entity).addClass("available");
            $(entity).find(".entityworking").fadeOut("fast", function() {
                $(entity).find(".wordgram").fadeIn("fast");
            });
        }
    });
    var available = $(".entity.available");
    available.filter(":not(:last)").removeClass("final");
    available.filter(":last").addClass("final");
}

function displayInterview(resource) {
    $.getJSON(resource.transcript, function(transcript) {
        $("#primary").html(supplant(
            '<div id="headerdiv" class="span-24">' +
                '<div class="span-18">' +
                    '<h2 class="columntitle">{title}</h2>' + 
                    '<h3>Conducted on {date}</h3>' +
                '</div>' +
                '<div class="returnbutton span-6 last">Return to Search...</div>' +
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

        linkAndPlayInterview(transcript, $("#transcript"));
    });
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

        var subtitlediv = $('<div class="subtitle" style="display:block;opacity:0.5"/>');
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

function selectForInterview(resource, entry) {
    return function() {
        console.log("Displaying Interview");
        displayInterview(resource);
        console.log("Interview displayed");
    };
}

var selectFunctions = {
    "http://qldarch.net/rdf#Interview" : selectForInterview
};

