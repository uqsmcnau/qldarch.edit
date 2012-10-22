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

function frontendOnReady() {
    displayFrontPage();
}

function displayFrontPage(reload) {
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
    if (!reload) {
        updateEntities(matchnone, matchall, true, true);
        updateContentDiv(matchnone, matchall, true, true);
    } else {
        reload();
    }
}

function displaySearchDiv(parentDiv) {
    parentDiv.html('<input class="span-8 last" type="text" value="" placeHolder="Search Content, People and Things"/></div>');

    parentDiv.find("input").keyup(function () {
        var val = $(this).val();
        updateEntities(makeperfectstring(val), makepartialstring(val), true, (val == ""));
        updateContentDiv(makeperfectlabel(val), makepartialkeywords(val), true, (val == ""));
        $("#entitydiv .available input").val(val);
    });
}

function updateSearchDiv(val) {
    if ($("#searchdiv")) {
        $("#searchdiv input").val(val);
    }
}

function displayContentDiv(parentDiv) {
    types.artifacts.forEach(function(type) {
        var typeDiv = $(supplant(
            '<div class="contenttype" data-uri="{uri}">' +
            '    <div class="contentlisttitle span-8">{plural}</div><div class="contentlist"></div>' +
            '</div>', type));
        typeDiv.data("type", type);
        parentDiv.append(typeDiv)
    });
}

function updateContentDiv(perfectmatch, partialmatch, show, isEmpty) {
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
                    if (partialmatch(resource)) {
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
    types.proper.forEach(function(type) {
        var typeDiv = $(supplant(
            '<div class="entity" data-uri="{uri}">' +
                '<input class="searchbox span-5" type="text" placeHolder="Search {plural}"/>' +
                '<div class="wordgram span-8 last">' +
                    '<img class="first span-8 last" src="img/wordcram.png" alt="{label} Wordcram"/>' +
                '</div>' +
                '<div class="entityworking span-8 last" style="display:none"><div class="entitylisttitle">{label}</div><div class="entitylist"></div></div>' +
            '</div>', type));
        typeDiv.data("type", type);
        parentDiv.append(typeDiv)

        typeDiv.find("input").keyup(function() {
            var val = $(this).val();
            updateSearchDiv(val);
            updateContentDiv(makeperfectlabel(val), makepartialkeywords(val), false, (val == ""));
            updateEntities(makeperfectstring(val), makepartialstring(val), false, (val == ""));
            if (val != "") {
                $(this).parents(".entity").siblings().removeClass("final").fadeOut("fast");
                $(this).parents(".entity").addClass("final").fadeIn("fast");
            }
        });
    });
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
        val.split(" ").forEach(function(word) {
            if (word != "" && resource.label.indexOf(word) != -1) {
                found = true;
            }
        });

        return found;
    };
};

function makeperfectlabel(value) {
    return function(resource) {
        return $.trim(value) == resource.label;
    };
}

function makeperfectstring(lhs) {
    return function(rhs) {
        return lhs == rhs;
    };
}

function makepartialkeywords(value) {
    return function(resource) {
        var val = $.trim(value);
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

        return somefound && allfound;
    };
}

function makeperfectrelatedTo(value) {
    function perfectrelatedTo(resource) {
        return value &&
            resource &&
            resource["qldarch:relatedTo"] && 
            value == resource["qldarch:relatedTo"];
    }
    return perfectrelatedTo;
}

function updateEntities(perfectmatch, partialmatch, show, isEmpty) {
    $(".entity").each(function (i, entity) {
        var type = $(entity).data("type");
        var list = $(entity).find(".entitylist");
        list.empty();
        if (!isEmpty) {
            $(entity).find(".wordgram").fadeOut("fast", function() {
                $(entity).find(".entityworking").fadeIn("fast");
            });
            var resources = [];
            resourcesByRdfType[type.uri].forEach(function(resource) {
                if (perfectmatch(resource.label)) {
                    resources.push(resource);
                }
            });
            if (resources.length == 0) {
                resourcesByRdfType[type.uri].forEach(function(resource) {
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
                    var entry = $('<div class="entityentry">' + resource.label + '</div>');
                    list.append(entry);
                    entry.click(function() {
                        if (!entry.hasClass("selected")) {
                            onClickEntity(resource);
                            entry.addClass("selected");
                            var input = entry.parents(".entity").find("input");
                            var restore = function() {
                                restoreFromEntity()
                                input.keyup();
                            };

                            input.val(resource.label).one("keyup", restore);
                            entry.one("click", restore);
                            entry.siblings(".entityentry").fadeOut("fast");
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
    });
    var available = $(".entity.available");
    available.filter(":not(:last)").removeClass("final");
    available.filter(":last").addClass("final");
}

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
        if (properties[uri].display) {
            var arg = {
                    "label" : properties[uri].label,
                    "value" : entities[resource.uri][uri]
            };
            list.append(supplant(
                '<div class="propertypair span-8 last">' +
                '<span class="propertylabel span-3">{label}</span>' +
                '<span class="propertyvalue span-5 last" type="text">{value}</span></div>', arg));
        }
    }

    $("#mainentities").append($("#maincontent").detach());
    $("#mainsearch").fadeOut("fast");
    $("#primary").prepend('<div id="contentpane" class="span-16"><h2 class="columntitle">Related Content</h2></div>');
    updateContentDiv(makeperfectrelatedTo(resource.uri), matchnone, true, resource.uri);
}

function restoreFromEntity() {
    $("#contentpane").fadeOut("fast", function() {
        $(this).remove();
    });
    $("#mainsearch").fadeIn("fast").after($("#maincontent").detach());
    $("#mainentities .entitydetail").remove();
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
        displayInterview(resource);
    };
}

function selectForPhotograph(resource, entry) {
    return function() {
    };
}

var selectFunctions = {
    "http://qldarch.net/rdf#Interview" : selectForInterview,
    "http://qldarch.net/rdf#Photograph" : selectForPhotograph,
    "http://qldarch.net/rdf#LineDrawing" : selectForInterview,
};

