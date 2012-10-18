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
    properties.forEach(function(element) {
        var option = selector.append(supplant(
                '<div class="propertyoption" data-uri="{uri}">... {label} ...</div>',
                element)).children().last();
        selector.data("rdfsummary", element);
        option.click(function() {
            if (selection.select($(this))) {

                var sub = $(".propertydiv .target:first");
                sub.empty();
                element.domain.forEach(function(uri) {
                    types.forEach(function(type) {
                        if (type.uri == uri) {
                            populateEntitySelection(sub, type, selectForRelationship);
                        }
                    });
                });

                var obj = $(".propertydiv .target:last");
                obj.empty();
                element.range.forEach(function(uri) {
                    types.forEach(function(type) {
                        if (type.uri == uri) {
                            populateEntitySelection(obj, type, selectForRelationship);
                        }
                    });
                });

                setDefinition(element.definition);
            }
        });
    });
}

function populateEntitiesBox(targetJQ, properties) {
    var selector = targetJQ.html('<div class="propertyselector entity"></div>').children(".propertyselector");
    selector.selected = null;
    properties.forEach(function(element, index, array) {
        var option = selector.append(supplant(
                '<div class="propertyoption" data-uri="{uri}">{label} ...</div>',
                element)).children().last();
        selector.data("rdfsummary", element);
        option.click(function() {
            if (!$(this).hasClass("selected")) {
                selection.select($(this));
                setDefinition(element.definition);
                var target = $(".entitydiv>.target:first");
                target.empty();
                populateEntitySelection($(".entitydiv>.target:first"), element, selectForEntity);
            }
        });
    });
}


function selectForEntity(workingDiv, entityDiv, resource, entry) {
    return function() {
        workingDiv.empty();
        if (!entities[resource.uri]) {
            workingDiv.append('<div class="alert span-8 last">Demo mode data not found</div>');
        } else {
            for (uri in entities[resource.uri]) {
                if (properties[uri].editable) {
                    var arg = {
                            "label" : properties[uri].label,
                            "value" : entities[resource.uri][uri]
                    };
                    workingDiv.append(supplant('<div class="propertypair span-8 last">' +
                        '<label class="propertylabel span-3">{label}</label>' +
                        '<input class="propertyvalue span-5 last" type="text" value="{value}"/></div>', arg));
                }
            }
            workingDiv.append('<div class="button span-5 push-3">Update</div>');
        }
    };
}


function selectForRelationship(workingDiv, entityDiv, resource, entry) {
    return function() {
        entityDiv.find(".searchbox").val(resource.label).keyup();
    };
}

function populateEntitySelection(targetJQ, type, onSelectGenerator) {
    var entityDiv = $(supplant(
        '<div class="entity">' +
        '    <input class="searchbox" type="text" placeHolder="Find {label}"/>' +
        '    <img class="first span-8 last" src="img/wordcram.png" alt="{label} Wordcram"/>' +
        '    <div class="entityworking span-8 last"><div class="entitylist"></div></div>' +
        '</div>', type));

    targetJQ.append(entityDiv);
    entityDiv.focusin(function() {
        entityDiv.siblings().fadeOut("fast");
    }).focusout(function() {
        entityDiv.siblings().fadeIn("fast");
    });
    entityDiv.find("input").keyup(function() {
        var val = $(this).val();
        var workingDiv = $(this).parent().find(".entityworking");
        var list = workingDiv.find(".entitylist");
        list.empty();
        if (val != "") {
            resourcesByRdfType[type.uri].forEach(function(resource) {
                var found = false;
                val.split(" ").forEach(function(word) {
                    if (word != "" && resource.label.indexOf(word) != -1) {
                        found = true;
                    }
                });
                if (found) {
                    var entry = $('<div class="entityentry">' + resource.label + '</div>');
                    list.append(entry);
                    entry.click(onSelectGenerator(workingDiv, entityDiv, resource, entry, selection));
                }
            });
        }
    });
}

function backendOnReady() {
    var propertyDivs = $(".propertydiv").detach();
    var entityDivs = $(".entitydiv").detach();

    $(".accordion").each(function() {
        var accordion = $(this);
        var current = null;
        $(".accordion-header").click(function() {
            var t = $(this);
            if (current) {
                if (!t.data("open")) {
                    current.nextUntil(".accordion-header").filter(".accordion-content").slideUp("fast");
                    t.nextUntil(".accordion-header").filter(".accordion-content").slideDown("fast");
                    setDefinition(t.data("definition"), function() {
                        selection.select(null);
                    });
                    current.data("open", false);
                    current = t;
                    current.data("open", true);
                } else {
                    current.nextUntil(".accordion-header").filter(".accordion-content").slideUp("fast");
                    setDefinition("", function() {
                        selection.select(null);
                    });
                    current.data("open", false);
                    current = null;
                }
                $("#content .target").empty();
            } else {
                t.nextUntil(".accordion-header").filter(".accordion-content").slideDown("fast");
                setDefinition(t.data("definition"));
                current = $(this);
                current.data("open", true);
            }

            if (t.data("content") == "property") {
                $("#content").html(propertyDivs);
            } else {
                $("#content").html(entityDivs);
            }
        });
    });

    $(".accordion-content").each(function() {
        var p = $(this).data("properties");
        if (p == "types") {
            populateEntitiesBox($(this), menuProperties[p]);
        } else if (menuProperties[p] != null) {
            populatePropertiesBox($(this), menuProperties[p], menuProperties.types);
        } else {
            console.log("Unable to find properties: " + p + " in " + menuProperties);
        }
    });
}
