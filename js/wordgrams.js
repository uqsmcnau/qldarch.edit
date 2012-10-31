var wordclouds = {
    "http://qldarch.net/rdf#Architect" : [
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

    "http://qldarch.net/rdf#Firm" : [
        {"text":"Conrad & Gargett","size":13},
        {"text":"BVN","size":22},
        {"text":"Karl Langer","size":18},
        {"text":"Hayes and Scott","size":21},
        {"text":"Wilson Architects","size":23}
    ],

    "http://qldarch.net/rdf#Client" : [
        {"text":"Arawa Tavern","size":6},
        {"text":"Bougainville Copper Ltd","size":18},
        {"text":"Carlton & United Breweries Queensland Ltd","size":7},
        {"text":"Christmas Residence","size":20},
        {"text":"Civic & Civic Pty Ltd","size":11},
        {"text":"Cyclone Housing","size":17},
        {"text":"Day Centres","size":6},
        {"text":"Department of the Co-ordinator General and the Queensland Agricultural College Council","size":25},
        {"text":"Glendale System Housing","size":6},
        {"text":"Hamlet Estate Housing","size":10},
        {"text":"Hervey Bay Retirement Village","size":27},
        {"text":"Home Units","size":30},
        {"text":"Inala Youth Club","size":29},
        {"text":"James Hardie Trading Ltd Office and Vehicle Parc","size":28},
        {"text":"Karana Community Centre","size":23},
        {"text":"Lamb Home","size":24},
        {"text":"Mermaid Town Houses","size":27},
        {"text":"MLC Offices","size":11},
        {"text":"Poultry Abattoir ","size":29},
        {"text":"Presbyterian Church of Australia","size":8},
        {"text":"Queensland Agricultural College","size":8},
        {"text":"Runaway Bay Hotel","size":16},
        {"text":"Runaway Town Pty Ltd","size":16},
        {"text":"Sanitarium Health Food Co.","size":26},
        {"text":"Silverton Centre","size":16},
        {"text":"Sports Union of University of Queensland","size":19},
        {"text":"State Government of Queensland","size":14},
        {"text":"Stirling Henry Pty Ltd Warehouse and Workshop","size":13},
        {"text":"Sub-Normal Children's Home","size":9},
        {"text":"Supreme Court Building","size":10},
        {"text":"Toombul Shopping Town","size":21},
        {"text":"Watkins Property and Administration Pty Ltd","size":11}
    ],
    "http://qldarch.net/rdf#Structure" : [
        {"text":"H.W.Atkinson","size":21},
        {"text":"C.McLay","size":6},
        {"text":"A.H.Conrad","size":27},
        {"text":"T.B.F.Gargett","size":12},
        {"text":"V.T.Curtis","size":7},
        {"text":"C.A.Hamilton","size":18},
        {"text":"L.H.Hailey","size":19},
        {"text":"K.H.Frost","size":30},
        {"text":"W.A.H.Conrad","size":20},
        {"text":"P.R.Gargett","size":28},
        {"text":"J.M.Orange","size":27},
        {"text":"J.D.McPhee","size":13},
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
