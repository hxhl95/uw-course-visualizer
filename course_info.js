var show_disclaimer = true;
$("#cfet").click(function(){
    if (show_disclaimer)
        show_disclaimer = confirm("DISCLAIMER: the course information that is automatically fetched by this script is not always complete or accurate. In particular, the prerequisites data is sometimes parsed incorrectly due to its complex representation in the undergrad calendar. Please verify the data before relying on it.\n\nContinue showing this warning?");

    var cid = $("#cid").val().toUpperCase().replace(/\W/g, "");
    var url = "http://api.uwaterloo.ca/public/v1/?callback=?";
    $.ajax({url: url, dataType: "jsonp", data: {key: "ce0c9eabb4d4ff3388d202cb1378399d", service: "courseinfo", q: cid}, success: function(resp){
        if (!resp.response.data)
            alert("No data found for " + cid + "!");
        else {
            resp = resp.response.data.result[0];
            $("#cname").val(resp.Title);
            $("input[type=checkbox][name=cterm]").removeAttr('checked');
            $.each(["Fall", "Winter", "Spring"], function(){if (resp["avail" + this] == "1") $("#ct" + this[0]).attr("checked", "checked");});
            if ((offres = /\W[Oo]ffered:\s?([FWS,\s]+)/g.exec(resp.Description + resp.noteDesc)) && offres.length > 1)
                $.each(offres[1].split(","), function(){$("#ct" + $.trim(this)[0]).attr("checked", "checked");});
            $("#creqs").val(JSON.stringify(parse_reqs(resp.prereqDesc)).replace(/"/g, ''));
        }
    }});
});

// parse requisites from input string to array representation
var parse_reqs = function(reqs){
    reqs = reqs.replace(/prereq:/gi, "");
    reqs = reqs.replace(/([\/,;])/g, "$1 ");
    if (!(reqs = reqs.match(/^.*[0-9]{2,3}(?!%)[A-Z\)]*(.*\))*/))) return "";
    reqs = reqs[0];

    var engcards = {"one": 1, "two": 2, "three": 3, "1": 1, "2": 2, "3": 3};
    reqs = reqs.replace(/(,\s*)(one|two|three|1|2|3)( of)/gi, " and $2$3");
    
    var pstmp;
    while(reqs != (pstmp = reqs.replace(/^(^|.*[^A-Z])([A-Z]{2,})(([^A-Z][A-Z]?)+)([\/\s]+)([0-9]{2,3}(?!%))/, "$1$2$3$5$2 $6")))
        reqs = pstmp;
    while(reqs != (pstmp = reqs.replace(/([A-Z]{2,})([,\/\s]+[^0-9]+)([0-9]{2,3})/, "$1 $3$2$3")))
        reqs = pstmp;

    var parse = function(reqs){
        reqs = $.trim(reqs);

        var tokens;
        if ((tokens = /^\(([^\(\)]+|(\(.+\).*)*)\)$/.exec(reqs)))
            return parse(tokens[1]);

        var seps = [[";", []], ["and", []], ["\\&", []], [], [",", []], ["or", [1]], ["\\/", [1]]];
        for (var i = 0; i < seps.length; i++)
        {
            if (seps[i].length == 0){
                if ((tokens = /^(one|two|three|1|2|3) of(.+)$/gi.exec(reqs)))
                    return (pstmp = parse(tokens[2].replace(/,(?=[^\)]*(?:\(|$))/g, ' or'))).length==1 ?
                        pstmp : $.merge([engcards[tokens[1].toLowerCase()]], pstmp.splice(1));
            }
            else if ((tokens = reqs.split(new RegExp(seps[i][0] + "(?=[^\\)]*(?:\\(|$))", 'i')))[0] != reqs)
                return $.merge(seps[i][1], $.map(tokens, function(x){
                    var r = parse(x), e = (seps[i][1].length==0); if (!r || (r.length == 1 && !isNaN(r[0]))) return;
                    return ((e && !isNaN(r[0])) || (!e && r.length > 1) ? [r] : r);
                }));
        }

        reqs = reqs.replace(/\W/g, '');
        if ((tokens = reqs.match(/[A-Z]{2,}[0-9]{2,3}[A-Z]*/)))
            return [tokens[0]];
        else
            return;
    };

    return parse(reqs);
};
