var wordclouds = {
    "http://qldarch.net/ns/rdf/2012-06/terms#Architect" : [
        {"text":"Atkinson","size":21},
        {"text":"McLay","size":6},
        {"text":"Conrad","size":27},
        {"text":"Gargett","size":12},
        {"text":"Curtis","size":7},
        {"text":"Hamilton","size":18},
        {"text":"Hailey","size":19},
        {"text":"Frost","size":30},
        {"text":"Conrad","size":20},
        {"text":"Gargett","size":28},
        {"text":"Orange","size":27},
        {"text":"McPhee","size":13},
        {"text":"Holmes","size":25},
        {"text":"Hawkins","size":15},
        {"text":"Cummings","size":14},
        {"text":"Duhs","size":6},
        {"text":"Whiteoad","size":30},
        {"text":"Charton","size":28},
        {"text":"Bligh","size":24},
        {"text":"Jessup","size":19},
        {"text":"Bretnall","size":26},
        {"text":"Parkinson","size":11},
        {"text":"Voller","size":10},
        {"text":"Bligh","size":30},
        {"text":"Ryan","size":8},
        {"text":"Voller","size":24},
        {"text":"Langer","size":27},
        {"text":"Wilson","size":19},
        {"text":"Birrell","size":20}
    ],

    "http://qldarch.net/ns/rdf/2012-06/terms#Firm" : [
        {"text":"Conrad & Gargett","size":13},
        {"text":"BVN","size":22},
        {"text":"Karl Langer","size":18},
        {"text":"Hayes and Scott","size":21},
        {"text":"Wilson Architects","size":23}
    ],

    "http://qldarch.net/ns/rdf/2012-06/terms#Client" : [
        {"text":"Bougainville Copper Ltd","size":18},
        {"text":"Carlton & United Breweries Queensland Ltd","size":7},
        {"text":"Civic & Civic Pty Ltd","size":11},
        {"text":"Glendale System Housing","size":6},
        {"text":"Hamlet Estate Housing","size":10},
        {"text":"Hervey Bay Retirement Village","size":27},
        {"text":"James Hardie Trading Ltd Office and Vehicle Parc","size":28},
        {"text":"Karana Community Centre","size":23},
        {"text":"Presbyterian Church of Australia","size":8},
        {"text":"Queensland Agricultural College","size":8},
        {"text":"Sanitarium Health Food Co.","size":26},
        {"text":"Sports Union of University of Queensland","size":19},
        {"text":"State Government of Queensland","size":28},
        {"text":"Stirling Henry Pty Ltd","size":13},
        {"text":"Toombul Shopping Town","size":21},
        {"text":"Watkins Property and Administration Pty Ltd","size":11}
    ],
    "http://qldarch.net/ns/rdf/2012-06/terms#Structure" : [
        {"text":"Watkins Place","size":21},
        {"text":"MLC Offices","size":18},
        {"text":"Toombul Shopping Town","size":7},
        {"text":"Silverton Centre","size":20},
        {"text":"Runaway Bay Shopping Centre","size":11},
        {"text":"Arawa and Panguna Shopping Centre","size":17},
        {"text":"Supreme Court Building","size":6},
        {"text":"District Courts Building","size":10},
        {"text":"Hervey Bay Retirement Village","size":23},
        {"text":"Karana Community Centre","size":27},
        {"text":"University of Queensland Sports Union Complex","size":11},
        {"text":"Inala Youth Club","size":29},
        {"text":"Runaway Bay Hotel","size":8},
        {"text":"Capalba Tavern","size":8},
        {"text":"Arawa Tavern","size":16},
        {"text":"Cyclone Housing","size":16},
        {"text":"Home Units","size":19},
        {"text":"Mermaid Town Houses","size":14},
        {"text":"Glendale System Housing","size":13},
        {"text":"Hamlet Estate Housing","size":9},
        {"text":"Sanitarium Factory","size":10},
        {"text":"Edwards Dunlop Warehouses","size":21},
        {"text":"Intensive Minimal Disease Piggery","size":11},
        {"text":"Poultry Technology and Research Unit","size":6},
        {"text":"Meat Abattoir","size":21},
        {"text":"General Teaching Buildings Mount Gravatt Teachers' College","size":7},
        {"text":"Library and Science Building, Brisbane Boys College","size":6},
        {"text":"Camden Home Units","size":11},
        {"text":"Christmas Residence","size":17},
        {"text":"Lamb Home","size":27},
        {"text":"Stirling Henry Pty Ltd Warehouse and Workshop","size":11},
        {"text":"Poultry Abattoir","size":29},
        {"text":"James Hardie Trading Ltd Office and Vehicle Parc","size":8},
        {"text":"University of Queensland Physics Building commissioned","size":8},
        {"text":"St. Lucia Presbyterian Church","size":16},
        {"text":"Blackheath Home for Boys","size":16},
        {"text":"Morden Laboratories","size":19},
        {"text":"Committee of Director of Fruit Marketing Premises","size":14},
        {"text":"W.R. Black Home for Girls","size":13},
        {"text":"Greek Orthodox Church of St. George","size":9},
        {"text":"Committee of Director of Fruit Marketing Premises","size":6},
        {"text":"Radford House","size":8},
        {"text":"Stanthorpe Shire Council Civic Centre and Library","size":18},
        {"text":"Office and Banana Ripening Premises","size":8},
        {"text":"Crematorium for Brisbane Crematorium Limited","size":17},
        {"text":"Country Order Merchant's Building","size":27},
        {"text":"School of Veterinary Science Stage 2","size":11},
        {"text":"Greek Orthodox Sunday School","size":17},
        {"text":"Wilson Holiday Residence","size":27},
        {"text":"St. David's Church","size":21},
        {"text":"La Boite Theatre","size":17},
        {"text":"Kindler Memorial Theatre, Queensland Institute of Technology","size":6},
        {"text":"Engineering Building B, Capricornia Institute of Technology","size":10},
        {"text":"Science 1 Building, Griffith University","size":27},
        {"text":"Classrooms, Brisbane Grammar School","size":11},
        {"text":"Outdoor Education Centre, Brisbane Grammar School","size":8},
    ],
    "http://qldarch.net/ns/rdf/2012-06/terms#BuildingTypology" : [
        {"text":"Dwellings","size":19},
        {"text":"Educational facilities","size":14},
        {"text":"Commercial buildings","size":13},
        {"text":"Religious buildings","size":9},
        {"text":"Recreation and sports facilities","size":6},
    ]
};



var wordcloud_fill = d3.scale.category20();
function makeWordCloud(target, wordlist) {
    function makedraw(target) {
        return function(words) {
            d3.select(target).append("svg")
                .attr("width", 306)
                .attr("height", 124)
                .append("g")
                .attr("transform", "translate(153,62)")
                .selectAll("text")
                .data(words)
                .enter().append("text")
                .style("font-size", function(d) { return d.size + "px"; })
                .style("font-family", "Helvetica, Arial, Geneva, sans-serif")
                .style("fill", function(d) { return wordcloud_fill(d.text.toLowerCase()); })
                .attr("text-anchor", "middle")
                .attr("transform", function(d) {
                        return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })
                .text(function(d) { return d.text; });
        };
    }
    d3.layout.cloud().size([306, 124])
        .words(wordlist)
        .rotate(function() { return ~~(Math.random() * 2) * 90; })
        .fontSize(function(d) { return d.size; })
        .on("end", makedraw(target))
        .start();
}
