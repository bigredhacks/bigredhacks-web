/**
 * Tokenize on whitespace ignoring parenthesis
 * @param d
 * @returns {Array}
 */
function tokenizerWhitespaceIgnoreParen(d) {
    var tokenized = Bloodhound.tokenizers.whitespace(d);
    return tokenized.map(function (x) {
        return x.replace(/\(|\)|&|-/gi, '');
    });
}

/*
 * Typeahead
 */
var engine3 = new Bloodhound({
    datumTokenizer: tokenizerWhitespaceIgnoreParen,
    queryTokenizer: tokenizerWhitespaceIgnoreParen,
    prefetch: {
        url: '/majors.json',
        filter: function (data) {
            return $.map(data, function (major) {
                return major;
            });
        }
    },
    sorter: function (a, b) {
        a = a.toLowerCase();
        b = b.toLowerCase();
        if (a.indexOf('cs') > -1 && b.indexOf('cs') > -1) {
            return a.localeCompare(b);
        } else if (b.indexOf('cs') > -1) {
            return 1;
        } else if (a.indexOf('cs') > -1) {
            return -1;
        } else {
            return a.localeCompare(b);
        }
    }
});

engine3.initialize();
var ttadapt = engine3.ttAdapter();
var $major = $('#major');

//general typeahead
$major.typeahead({
        minLength: 1
    },
    {
        displayKey: '',
        source: ttadapt,
        limit: 4,
        highlight: true,
        hint: true
    }).on('typeahead:selected typeahead:autocomplete', function (obj, datum, name) {
});


//clear if empty on focusout
$("document").ready(function () {
    $major.on("focusout", function () {
        if ($(this).val().length == 0) {
            $(this).data("major", "");
        }
    });
});
