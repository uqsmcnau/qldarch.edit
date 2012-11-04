// http://blog.thomsonreuters.com/index.php/mobile-patent-linktype2s-graphic-of-the-day/
var samplelinks = [
  {source: "Microsoft", target: "Amazon", type: "linktype1"},
  {source: "Microsoft", target: "HTC", type: "linktype1"},
  {source: "Samsung", target: "Apple", type: "linktype2"},
  {source: "Motorola", target: "Apple", type: "linktype2"},
  {source: "Nokia", target: "Apple", type: "linktype3"},
  {source: "HTC", target: "Apple", type: "linktype2"},
  {source: "Kodak", target: "Apple", type: "linktype2"},
  {source: "Microsoft", target: "Barnes & Noble", type: "linktype2"},
  {source: "Microsoft", target: "Foxconn", type: "linktype2"},
  {source: "Oracle", target: "Google", type: "linktype2"},
  {source: "Apple", target: "HTC", type: "linktype2"},
  {source: "Microsoft", target: "Inventec", type: "linktype2"},
  {source: "Samsung", target: "Kodak", type: "linktype3"},
  {source: "LG", target: "Kodak", type: "linktype3"},
  {source: "RIM", target: "Kodak", type: "linktype2"},
  {source: "Sony", target: "LG", type: "linktype2"},
  {source: "Kodak", target: "LG", type: "linktype3"},
  {source: "Apple", target: "Nokia", type: "linktype3"},
  {source: "Qualcomm", target: "Nokia", type: "linktype3"},
  {source: "Apple", target: "Motorola", type: "linktype2"},
  {source: "Microsoft", target: "Motorola", type: "linktype2"},
  {source: "Motorola", target: "Microsoft", type: "linktype2"},
  {source: "Huawei", target: "ZTE", type: "linktype2"},
  {source: "Ericsson", target: "ZTE", type: "linktype2"},
  {source: "Kodak", target: "Samsung", type: "linktype3"},
  {source: "Apple", target: "Samsung", type: "linktype2"},
  {source: "Kodak", target: "RIM", type: "linktype2"},
  {source: "Nokia", target: "Qualcomm", type: "linktype2"}
];

function drawgraph(targetselector, links, linkresolver) {
    var nodes = {};

    // Compute the distinct nodes from the links.
    links.forEach(function(link) {
      link.source = nodes[link.source] || (nodes[link.source] = {name: linkresolver(link.source)});
      link.target = nodes[link.target] || (nodes[link.target] = {name: linkresolver(link.target)});
    });

    var w = 630,
        h = 660;

    var force = d3.layout.force()
        .nodes(d3.values(nodes))
        .links(links)
        .size([w, h])
        .linkDistance(60)
        .charge(-300)
        .on("tick", tick)
        .start();

    var svg = d3.select(targetselector).append("svg:svg")
        .attr("width", w)
        .attr("height", h);

    // Per-type markers, as they don't inherit styles.
    svg.append("svg:defs").selectAll("marker")
        .data(["linktype1", "linktype2", "linktype3"])
      .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
      .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

    var path = svg.append("svg:g").selectAll("path")
        .data(force.links())
      .enter().append("svg:path")
        .attr("class", function(d) { return "link " + d.type; })
        .attr("marker-end", function(d) { return "url(#" + d.type + ")"; });

    var circle = svg.append("svg:g").selectAll("circle")
        .data(force.nodes())
      .enter().append("svg:circle")
        .attr("r", 6)
        .call(force.drag);

    var text = svg.append("svg:g").selectAll("g")
        .data(force.nodes())
      .enter().append("svg:g");

    // A copy of the text with a thick white stroke for legibility.
    text.append("svg:text")
        .attr("x", 8)
        .attr("y", ".31em")
        .attr("class", "shadow")
        .text(function(d) { return d.name; });

    text.append("svg:text")
        .attr("x", 8)
        .attr("y", ".31em")
        .text(function(d) { return d.name; });

    // Use elliptical arc path segments to doubly-encode directionality.
    function tick() {
      path.attr("d", function(d) {
        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
        return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
      });

      circle.attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      });

      text.attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      });
    }
}
