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

function populateEntitySelection(targetJQ, type, onSelectGenerator) {
    var entityDiv = $(supplant(
        '<div class="entity">' +
        '    <input class="searchbox" type="text" placeHolder="Find {label}"/>' +
        '    <img class="first span-8 last" src="img/wordcram.png" alt="{label} Wordcram"/>' +
        '    <div class="entityworking span-8 last"><div class="entitylist"></div></div>' +
        '</div>', type));

    targetJQ.append(entityDiv);
    entityDiv.find(".searchbox").keyup(function() {
        var val = $(this).val();

        // Handle sibling entity types.
        if (val == "") {
            entityDiv.siblings().fadeIn("fast");
        } else {
            entityDiv.siblings().hide();
        }

        // Handle entity list
        var workingDiv = $(this).parent().find(".entityworking");
        var list = workingDiv.find(".entitylist");
        list.empty();
        if (val != "") {
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
            resources.forEach(function(resource) {
                var entry = $('<div class="entityentry">' + resource.label + '</div>');
                list.append(entry);
                entry.click(onSelectGenerator(workingDiv, entityDiv, resource, entry, selection));
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
