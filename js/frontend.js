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

function frontendOnReady() {
    displayFrontPage();
}

function displayFrontPage(reload) {
    $("#primary").html(
        '<div id="column1" class="span-8">' +
            '<div id="mainsearch" class="span-8 last">' +
                '<h2 class="columntitle span-8 last">General Search</h2>' + 
                '<div id="searchdiv" class="span-8 last"/>' +
            '</div>' +
        '</div>' +
        '<div id="column2" class="span-8">' +
            '<div id="maincontent" class="span-8 last">' +
                '<h2 class="columntitle span-8 last">Digital Content</h2>' +
                '<div id="contentdiv" class="span-8 last"/>' +
            '</div>' +
        '</div>' +
        '<div id="column3" class="span-8 last">' +
            '<div id="mainentities" class="span-8 last">' +
                '<h2 class="columntitle span-8 last">People and Things</h2>' +
                '<div id="entitydiv" class="span-8 last"/>' +
            '</div>' +
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

    parentDiv.append('<div class="info span-8 last" style="display:none">No content matches</div>');
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
                '<input class="searchbox span-5" type="text" placeHolder="Search {plural}"/>' +
                '<div class="button slim span-3 last switchwc" style="display:none">As Wordcloud</div>' +
                '<div class="button slim span-3 last switchlist">As List</div>' +
                '<div id="{id}" class="wordgram span-8 last">' +
                '</div>' +
                '<div class="entityworking span-8 last" style="display:none"><div class="entitylisttitle">{label}</div><div class="entitylist"></div></div>' +
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
                updateContentDiv(makeperfectlabel(val), makepartialkeywords(val), false, (val == ""));
                updateEntities(makeperfectstring(val), makepartialstring(val), false, (val == ""));
                if (val != "") {
                    $(this).parents(".entity").siblings().removeClass("final").fadeOut("fast");
                    $(this).parents(".entity").addClass("final").fadeIn("fast");
                    typeDiv.find(".button").fadeOut("fast");
                } else {
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
                    resource.label && resource.label.indexOf(word) != -1 ||
                    resource.altlabel && resource.altlabel.indexOf(word) != -1)) {
                    
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
        val.split(/\W/).forEach(function(word) {
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
            resource["rdf:type"] &&
            value == resource["rdf:type"];
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
        if (properties[uri].display) {
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
                        "label" : properties[uri].label,
                        "value" : first
                };
                list.append(supplant(
                    '<div class="propertypair span-8 last">' +
                    '<span class="propertylabel span-3">{label}</span>' +
                    '<span class="propertyvalue span-5 last" type="text">{value}</span></div>', arg));
                rest.forEach(function(v) {
                    var arg = {
                            "label" : "&nbsp;",
                            "value" : v
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
        updateContentDiv(makeperfectrelatedTo(resource.uri), matchnone, true, !resource.uri);
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
        if (rdftype == "http://qldarch.net/rdf#Photograph" ||
                rdftype == "http://qldarch.net/rdf#LineDrawing") {
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
    $("#contentpane .content").append('<div class="relatednetworkpane"/>');
    if (false) {
        $("#contentpane .content .relatednetworkpane")
            .append('<div class="info span-8">No related network found</div></div>');
    } else {
        drawgraph("#contentpane .content .relatednetworkpane", samplelinks);
    }
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
        '<a href="{image}" style="display:none"><img class="span-16 last" src="{image}" alt="{label}"/></a>', resource));
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
    "http://qldarch.net/rdf#Interview" : selectForInterview,
    "http://qldarch.net/rdf#Photograph" : selectForImage,
    "http://qldarch.net/rdf#LineDrawing" : selectForImage,
};

