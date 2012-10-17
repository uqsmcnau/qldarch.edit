function supplant(s, o) {
    return s.replace(
        /\{([^{}]*)\}/g,
        function (a, b) {
            var r = o[b];
            return r == null ? a : String(r);
        }
    );
};

var selection = new Object();
selection.selection = null;
selection.select = function(selected) {
    if (selected != null) {
        selected.addClass("selected");
    }
    if (this.selection != null) {
        this.selection.removeClass("selected");
    }
    this.selection = selected;
};

function setDefinition(definition, f) {
    $(".definitionbox>*:visible").fadeOut("fast", function() {
        $(".definitionbox").html('<div class="definition" style="display:none">' + definition + '</div>');
        $(".definitionbox .definition").fadeIn("fast");

        if (f) {
            f();
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
            selection.select($(this));

            var sub = $(".propertydiv .target:first");
            sub.empty();
            element.domain.forEach(function(uri) {
                types.forEach(function(type) {
                    if (type.uri == uri) {
                        populateEntitySelection(sub, type, uri);
                    }
                });
            });

            var obj = $(".propertydiv .target:last");
            obj.empty();
            element.range.forEach(function(uri) {
                types.forEach(function(type) {
                    if (type.uri == uri) {
                        populateEntitySelection(obj, type, uri);
                    }
                });
            });

            setDefinition(element.definition);
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
            selection.select($(this));
            setDefinition(element.definition);
            var target = $(".entitydiv>.target:first");
            target.empty();
            populateEntitySelection($(".entitydiv>.target:first"), element);
        });
    });
}

function populateEntitySelection(targetJQ, type) {
    console.log(type);
    var entity = $(supplant(
        '<div class="entity">' +
        '    <input class="searchbox span-3 last" type="text" placeHolder="Find {label}"/>' +
        '    <img class="span-8 last" src="img/wordcram.png" alt="{label} Wordcram"/>' +
        '    <div class="entitylist span-8"></div>' +
        '</div>', type));

    targetJQ.append(entity);
    entity.focusin(function() {
        entity.siblings().fadeOut("fast");
    }).focusout(function() {
        entity.siblings().fadeIn("fast");
    });
    entity.find("input").keyup(function() {
        var val = $(this).val();
        $(this).siblings(".entitylist").empty();
        if (val != "") {
            var list = $(this).siblings(".entitylist");
            entityLists[type.uri].forEach(function(entity) {
                var found = false;
                val.split(" ").forEach(function(word) {
                    if (entity.indexOf(word) != -1) {
                        found = true;
                    }
                });
                if (found != -1) {
                    list.append('<div class="entityentry">' + entity + '</div>');
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
            populateEntitiesBox($(this), properties[p]);
        } else if (properties[p] != null) {
            populatePropertiesBox($(this), properties[p], properties.types);
        } else {
            console.log("Unable to find properties: " + p + " in " + properties);
        }
    });
}
