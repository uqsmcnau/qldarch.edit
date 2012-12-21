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

var contentSelection = new Object();
contentSelection.selection = null;
contentSelection.select = selectionMethod;

function interviewReady() {
    displayFrontPage();
}

var interviews = {
    "Birrell.json" : {
        uri: "Birrell.json",
        label: "Interview with James Birrell",
        audio: "audio/Birrell_JM_and_AW.ogg",
        transcript: "transcript/Birrell.json",
        keywords: "James|Birrell|Interview",
        "rdf:type": "http://qldarch.net/rdf#Interview",
    },
    "Bligh.json" : {
        uri: "Bligh.json",
        label: "Interview with Graham Bligh",
        audio: "audio/Graham_Bligh.ogg",
        transcript: "transcript/Bligh.json",
        keywords: "Graham|Bligh|Interview",
        "rdf:type": "http://qldarch.net/rdf#Interview",
    }
};

function displayFrontPage() {
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

    displayInterview(interviews['Birrell.json']);
}


function displayInterview(resource, callback) {
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


        $('<span class="button tab">Search Transcripts</span>')
            .appendTo($("#interviewcontentdiv .contentpanetabs"))
            .click(function() {
                if (contentSelection.select($(this))) {
                    $("#interviewcontentdiv .content>:visible").hide(function() {
                        $(this).remove();
                        displaySearchTranscript(resource);
                    });
                }
            }).click();

        linkAndPlayInterview(transcript, $("#transcript"), callback);
    });
}

function displaySearchTranscript(resource) {
    $("#interviewcontentdiv .content").append(
        '<div class="searchtranscriptpane span-16 last" style="margin-top:-10px">' +
        '<div class="span-16 last">' +
        '<input class="searchbox span-8" type="text" value="" placeHolder="Search Transcripts"/>' +
        '</div>' +
        '<div class="searchresults span-16 last">' +
            '<div class="entitylisttitle">Utterances</div>' +
            '<div class="resultlist"/>' +
        '</div>' +
        '</div>');

    $("#interviewcontentdiv input").keyup(function(event) {
        var val = $(this).val();

        $.getJSON('http://115.146.94.110/solr/collection1/select?q=transcript%3A' + val + '&rows=20&wt=json', function(results) {
            $("#interviewcontentdiv .resultlist").empty();
            results.response.docs.forEach(function(result) {
                $(supplant('<div class="transcriptref">' +
                        '<span class="transcriptlabel">{interview}</span>' +
                        '<span class="transcriptlabel">{time}</span>' +
                        '<span class="transcripttext">{transcript}</span' +
                        '</div>', result))
                    .appendTo("#interviewcontentdiv .resultlist")
                    .click(function() {
                        if (resource.uri == result.interview) {
                            $('.subtitle[data-time="' + result.time + '"]').click();
                        } else {
                            displayInterview(interviews[result.interview], function(popcorn) {
                                var start = Math.max(0.5, Popcorn.util.toSeconds(result.time)) - 0.5;
                                $("#interviewcontentdiv input").val(val).keyup();
                                return popcorn.currentTime(start);
                            });
                        }
                    });
            });
        });
    });
}

function linkAndPlayInterview(transcript, transcriptdiv, callback) {
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

    if (popcorn) {
        popcorn.destroy();
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
    _.defer(function() {
        _.delay(callback, 1000, popcorn);
    });
}
