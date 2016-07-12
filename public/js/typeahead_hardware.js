/*
 * Typeahead
 */
var engine2 = new Bloodhound({
    datumTokenizer: function (d) {
        console.log(d);
        return Bloodhound.tokenizers.whitespace(d.name);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    prefetch: '/api/hardware',
    identify: function (obj) {
        console.log(obj);
        return obj.name;
    }
});

engine2.initialize();

$('#hardware').tagsinput({
    typeaheadjs: [{
        minLength: 0
    }, {
        displayKey: 'name',
        valueKey: 'name',
        name: 'name',
        source: showAll
    }]
});

function showAll(q, sync) {
    if (q === '') {
        sync(engine2.all());
    }
    else {
        engine2.search(q, sync);
    }
}

//clear if empty on focusout
$("document").ready(function () {
    $("#hardware").on("focusout", function () {
        if ($(this).val().length == 0) {
            $(this).data("hardware", "");
        }
    });
});