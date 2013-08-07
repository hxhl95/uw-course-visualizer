Array.prototype.incIdx = function(x){var l = this.length-1; return this[this[l] = (this[l] + x) % l];};

////////////////////////////////////////////////////
// Graph handling code

var c = {}, g, layouter, renderer;
var width = $(document).width() - 260;
var height = $(document).height();
$(document).ready(function(){
    g = new Graph();
    g.edgeFactory.template.style.directed = true;
    renderer = new Graph.Renderer.Raphael('canvas', g, width, height);
});

var render_clr = {'F': "#fa4", 'W': "#aee", 'S': "#6e6"};
var render = function(s) {
    return function(r, n) {
        var set = r.set().push(r.rect(0, 0, -10 + n.id.length * 14, 40).attr({"fill": render_clr[s], "stroke-width": 2, r : "10px"}))
            .push(r.text(-4 + n.id.length * 7, 21, n.id).attr({"font-size":"16px"}))
            .dblclick(function(){g.nodes[n.id].shape[0].attr({fill: render_clr[c[n.id].term.incIdx(1)]}); r.safari();});
        set.items.forEach(function(el){
            el.tooltip(r.set().push(r.text(0, 32, n.label).attr({"font-size":"14px"})));
            el.mousedown(function(){showCourse(n.id);});
        });
        return set;
    };
};

////////////////////////////////////////////////////
// Prereqs verifier for courses

var evalReqs = function(){
    var checkReqs = function(id, reqs, doAction){
        if (!$.isArray(reqs)){
            var res = c.hasOwnProperty(reqs);
            if (doAction){
                if (res) g.addEdge(reqs, id);
                else missingReqs.push(reqs);
            }
            return res;
        }
        if (isNaN(reqs[0]))
            return ($.inArray(false, $.map(reqs, function(x){return checkReqs(id, x, doAction);})) == -1);
        else {
            var res = $.map(reqs.slice(1), function(x){if (checkReqs(id, x, false)) return $.isArray(x)?[x]:x; else return;});
            checkReqs(id, res.slice(Math.max(res.length-reqs[0],0)), true); // draw edges
            if (res.length >= reqs[0]) return true;
            else if (doAction) missingReqs.push(reqs);
            return false;
        }
    };
    var stringifyReqs = function(reqs){
        if (!reqs || reqs.length == 0 || !reqs[0]) return "";
        return "(" + (isNaN(reqs[0]) ? "" : ["one", "two", "three"][reqs[0]-1] + " of ") +
            $.map(reqs.slice(isNaN(reqs[0]) ? 0 : 1), function(x){return $.isArray(x) ? stringifyReqs(x) : x;}).join(", ") + ")";
    };

    $("#errdisp").html('');
    for (var id in c){
        var missingReqs = [];
        if (c[id].reqs.length>0)
            checkReqs(id, t = c[id].reqs, true);
        if (missingReqs.length>0)
            $("#errdisp").append("<strong>" + id + "</strong>: " + stringifyReqs(missingReqs).slice(1, -1) + "<br>");
    }
};

////////////////////////////////////////////////////
// UI functions for courses

$("#cnew").click(function(){
    var id = $("#cid").val().toUpperCase().replace(/\W/g, "");
    if (!id.match(/[A-Z]{2,}[0-9]{2,3}[A-Z]?/))
    {
        alert("Invalid course ID!");
        return;
    }
    var nterms = $("input:checkbox[name=cterm]:checked").map(function(){return this.value;}).get();
    if (nterms.length == 0)
    {
        alert("Course not offered in any terms?");
        return;
    }
    if (!c.hasOwnProperty(id))
        c[id] = {};
    c[id].name = $("#cname").val();
    c[id].term = $.merge(nterms, [c[id].term ? Math.max(nterms.indexOf(c[id].term.incIdx(0)),0) : 0]);
    c[id].reqs = $("#creqs").val().length>0 ? JSON.parse($("#creqs").val().toUpperCase().replace(/[^A-Z0-9\[\],]/g, "").replace(/([A-Z]{2,}[0-9]{2,3}[A-Z]*)/g, "\"$1\"")) : "";
    
    g.addNode(id, {label: c[id].name, render: render(c[id].term[0])});
    evalReqs();
    renderer.draw();
    g.nodes[id].shape[0].attr({fill: render_clr[c[id].term.incIdx(0)]});
    $.each(g.nodes[id].shape, function(){this.tp[0].attr("text", c[id].name);});
});

var showCourse = function(id){
    $("#cid").val(id);
    $("#cname").val(c[id].name);
    $("input[type=checkbox][name=cterm]").removeAttr('checked');
    $.each(c[id].term, function(){$("#ct" + this).attr('checked', 'checked');});
    $("#creqs").val(JSON.stringify(c[id].reqs).replace(/"/g, ''));
};

$("#cdel").click(function(){
    var id = $("#cid").val().toUpperCase().replace(/\W/g, "");
    g.removeNode(id);
    delete c[id];
    evalReqs();
    renderer.draw();
});

$("#cclr").click(function(){
    $("#cid, #cname, #creqs").val('');
    $("input:checkbox[name=cterm]:checked").removeAttr('checked');
});

////////////////////////////////////////////////////
// UI functions for Graph

$("#gload").click(function(){
    var d, id;
    try {d = $.parseJSON(prompt("Enter data:"));}
    catch(e){return;}
    if (d == null || !d.c || !d.g) return;

    for (id in g.nodes)
        g.removeNode(id);
    c = d.c;
    for (id in c)
        g.addNode(id, {label: c[id].name, render: render(c[id].term[0])});
    evalReqs();
    renderer.draw();
    for (id in c)
    {
        g.nodes[id].shape[0].attr({fill: render_clr[c[id].term.incIdx(0)]});
        $.each(g.nodes[id].shape, function(){
            this.translate(d.g[id][0], d.g[id][1]);
            this.tp[0].attr("text", c[id].name);
        });
    }
    renderer.draw();
});

$("#gsave").click(function(){
    var gdata = {};
    for (var id in c)
    {
        var sbbox = g.nodes[id].shape.getBBox();
        gdata[id] = [Math.floor(sbbox.x), Math.floor(sbbox.y)];
    }
    prompt("Data:", "{\"c\":" + JSON.stringify(c) + ",\"g\":" + JSON.stringify(gdata) + "}");
});

$("#gclr").click(function(){
    for (var id in g.nodes)
        g.removeNode(id);
    c = {};
    $("#errdisp").html('');
    renderer.draw();
});
