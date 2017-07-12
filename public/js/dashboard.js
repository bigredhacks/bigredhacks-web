const MAX_RESUME_MB = 15

$(document).ready(function () {

    /************************************
     *** Dashboard Home Functionality****
     ************************************/
        //Update resume
    $("#resume-update").on('click', function (e) {
        e.preventDefault();
        $("#resume-form").toggle();
        $('body').animate({
            scrollTop: $('body').get(0).scrollHeight
        }, 500);
    });

    //File picker
    $(function () {
        $("input[type='file']").filepicker({style: 'default'});
    });

    setInterval(function () {
        try{
            checkUserId();
            checkResume();
        }
        catch(err){
            // can occur if there is no flie
        }
        
    }, 1000);

    //working with cornell students checkbox event
    $("#cornellteamcheck").on("change", function () {
        let _this = this;
        $(".checkbox").addClass("disabled");
        $(_this).prop("disabled", true);
        let checked = this.checked;
        $.ajax({
            url: "/user/team/cornell",
            type: "POST",
            data: {checked: checked},
            success: function (d) {
                $(".checkbox").removeClass("disabled");
                $(_this).prop("disabled", false);
            }
        })
    });

    /**
     * generic ajax to handle a user's bus decision (sign up or opt out)
     * @param busid
     * @param decision signup, optout
     * @param callback
     */
    var userBusDecision = function userBusDecision(busid, decision, callback) {
        $.ajax({
            type: "POST",
            url: "/user/busdecision",
            data: {
                busid: busid,
                decision: decision
            },
            success: callback,
            error: function (e) {
                if (decision.toLowerCase() == "optout") {
                    alert('Error opting out! Please contact us at info@bigredhacks.com');
                }
                else {
                    alert('The bus is full! Please contact us at info@bigredhacks.com');
                }
            }
        });
    };

    //Sign up for bus
    $(".buttonParent").on('click', function () {
        var btnId = $(this).find('input').prop('id');
        var businfobox = $(this).parents(".businfobox");
        userBusDecision(businfobox.data("busid"), btnId, function (data) {
            var newMemberNumber = parseInt(businfobox.find(".currentnumber").data("currentnumber"));
            var decisionText, newClass, propValue, newId;
            if (btnId == 'signup') {
                newMemberNumber++;
                decisionText = 'Signed Up';
                newClass = 'btn btn-danger';
                propValue = 'opt out';
                newId = 'optout';
                $("#signup-message").show();
                $("#optout-message").hide();
            } else {
                newMemberNumber--;
                decisionText = 'Opt Out';
                newClass = 'btn btn-success';
                propValue = 'sign up';
                newId = 'signup';
                $("#optout-message").show();
                $("#signup-message").hide();
            }
            
            businfobox.find(".currentnumber").html(newMemberNumber.toString());
            businfobox.find(".currentnumber").data("currentnumber", newMemberNumber.toString());
            businfobox.find(".userbusdecision").html(decisionText);
            $('#' + btnId).prop ({
                id: newId,
                value: propValue,
                name: newId,
                class: newClass
            })
        });
    });
});


//check length of user id input
function checkUserId() {
    //field doens't exist if registration disabled
    if ($('#addteamid').length > 0) {
        if ($('#addteamid').val().length > 0) {
            $('#addteamid-submit').prop('disabled', false);
        }
        else {
            $('#addteamid-submit').prop('disabled', true);
        }
    }
}

//check whether resume is present in upload
function checkResume() {
    var files = $('input#resumeinput')[0].files;
    if (files.length > 0 && files[0].type === "application/pdf") {
        $('#resume-save').prop('disabled', false);
    }
    else {
        $('#resume-save').prop('disabled', true);
    }
}

/**********************
 /********RSVP**********
 /*********************/

//not interested in going check for waitlisted
$("#notinterested").on("change", function () {
    var _this = this;
    $(".checkbox").addClass("disabled");
    $(_this).prop("disabled", true);
    var checked = this.checked;
    $.ajax({
        url: "/api/rsvp/notinterested",
        type: "POST",
        data: {checked: checked},
        success: function (d) {
            $(".checkbox").removeClass("disabled");
            $(_this).prop("disabled", false);
        }
    })
});

//rsvp for cornell students
$("#cornell-rsvp").on("change", function () {
    var _this = this;
    $(".checkbox", this).addClass("disabled");
    $(_this).prop("disabled", true);
    var checked = this.checked;
    $.ajax({
        url: "/api/rsvp/cornellstudent",
        type: "PATCH",
        data: {checked: checked},
        success: function (d) {
            $(".checkbox").removeClass("disabled");
            $(_this).prop("disabled", false);
        }
    })
});

$("#rsvpDropdown").on('change', function () {
    const val = $(this).val().toLowerCase();
    if (val == "yes") {
        $("#rsvp-yes").show();
        $("#rsvp-no").hide();
    } else if (val == "no") {
        $("#rsvp-no").show();
        $("#rsvp-yes").hide();
    } else {
        $("#rsvp-yes").hide();
        $("#rsvp-no").hide();
    }
});

function rsvpingYes() {
    return $("#rsvpDropdown").val().toLowerCase() == "yes";
}

$.validator.addMethod("conditionalRSVP", function (val, elem, params) {
    // Require value if yes response
    return !rsvpingYes() || val;
});

$.validator.addMethod("cocAndLiabilityRead", function (val, elem, params) {
    // Require coc/liability documents have been read if yes response
    return !rsvpingYes() || $('#rsvp-yes-button').hasClass('btn-success');
});

$.validator.addMethod('filesize', function (value, element, param) {
    return this.optional(element) || (element.files[0].size <= param)
    }, 'File size must be less than ' + MAX_RESUME_MB + ' mb'); 

$('#rsvpForm').validate({
    ignore: 'input:not([name])', //ignore unnamed input tags
    onfocusout: function (e, event) {
        this.element(e); //validate field immediately
    },
    onkeyup: false,
    rules: {
        rsvpDropdown: {
            required: true
        },
        receipt: {
            conditionalRSVP: true,
            extension: "pdf,jpg,png",
            accept: 'application/pdf,image/jpg,image/png',
            filesize: 1024 * 1024 * MAX_RESUME_MB
        },
        legal: {
            conditionalRSVP: true
        },
        'agreements-viewed': {
            cocAndLiabilityRead: true
        }
    },
    messages: {
        rsvpDropdown: "Please indicate whether you will be able to attend",
        receipt: {
            conditionalRSVP: "Please upload a travel receipt"
        },
        legal: {
            conditionalRSVP: "Please review the legal information"
        },
        'agreements-viewed': {
            cocAndLiabilityRead: "Please read the liability & waiver release and the code of conduct."
        }
    }
});

// Make buttons success-colored after clicked on
$('#liability').click(function(){
    $(this)
        .removeClass('btn-danger')
        .addClass('btn-success');
    //if ($('#code-of-conduct').hasClass('btn-success')) {
        $('#rsvp-yes-button')
            .removeClass('btn-danger')
            .addClass('btn-success');
    //}
});