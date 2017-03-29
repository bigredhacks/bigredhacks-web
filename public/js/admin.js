$('document').ready(function () {

    var npCheckbox = $("[name='np-toggle-checkbox']");
    npCheckbox.bootstrapSwitch();

    /**
     * generic ajax to update status
     * @param type team,user
     * @param id
     * @param newStatus
     * @param callback
     */
    var updateStatus = function updateStatus(type, id, newStatus, callback) {
        if (type != "user" && type != "team") {
            console.error("Unrecognized update type in updateStatus!");
        }
        $.ajax({
            type: "PATCH",
            url: "/api/admin/" + type + "/" + id + "/setStatus",
            data: {
                status: newStatus
            },
            success: function (data) {
                callback(data);
            },
            error: function (e) {
                //todo more descriptive errors
                console.log("Update failed!");
            }
        });
    };

    //generic ajax to update role
    var updateRole = function updateRole(email, newRole, callback) {
        $.ajax({
            type: "PATCH",
            url: "/api/admin/user/" + email + "/setRole",
            data: {
                role: newRole
            },
            success: function (data) {
                callback(data);
            },
            error: function (e) {
                //todo more descriptive errors
                console.log("Update failed!");
            }
        });
    };


    /****************************
     * No participation switch***
     ***************************/

    /**
     * Check whether use is in non-participation mode
     * @type {*|jQuery}
     */
    var getNp = function () {
        $.ajax({
            type: "GET",
            url: "/api/admin/np",
            success: function (data) {
                if (data == "true" || data == "1") {
                    toggleNp(true);
                    //third parameter skips on change event
                    npCheckbox.bootstrapSwitch("state", true, true); //set starting state
                }
                else {
                    npCheckbox.bootstrapSwitch("state", false, true);
                    return toggleNp(false);

                }
            },
            error: function (e) {
                console.log("Unable to determine participation mode.");
                npCheckbox.bootstrapSwitch("state", false, true);
                return toggleNp(false);
            }
        })
    };

    var setNp = function (state) {
        $.ajax({
            type: "POST",
            url: "/api/admin/np/set",
            data: {
                state: state
            },
            success: function (data) {
                toggleNp(state);
                if (state == false) {
                    alert("WARNING: No participation mode is turned off for the duration of this session. All changes made to applicants during this time are permanent.");
                }
            },
            error: function (e) {
                console.log("Unable to set participation mode");
            }
        })
    };

    //disable non-participation enabled items
    var toggleNp = function (state) {
        $(".np-enabled").children().prop("disabled", state);
        $(".np-enabled input[type=radio],.np-enabled input[type=checkbox]").prop("disabled", state);
    };

    npCheckbox.on('switchChange.bootstrapSwitch', function (event, state) {
        setNp(state);
    });


    /******************
     * Initialization**
     ******************/
    getNp();


    /******************
     * Detail Views****
     *****************/

    //handle decision radio buttons for individual(detail) view
    $('input[type=radio][name=individualstatus]').on('change', function () {
        var newStatus = $(this).val();
        var pubid = $(this).closest('form').data('pubid');
        updateStatus("user", pubid, newStatus, function (data) {
        });
    });

    //handle decision radio buttons for team view
    $('input[type=radio][name=teamstatus]').on('change', function () {
        var _this = this;
        var newStatus = $(_this).val();
        var teamid = $("#teamid").text();
        updateStatus("team", teamid, newStatus, function (data) {
            $('.status').text(newStatus);
            $('.status').attr("class", "status " + newStatus);
        });
    });

    //fixme #pubid will not work with teams because of duplicate ids
    $("#setRSVP").on("change", function () {
        var _this = $(this);
        var pubid = $("#pubid").text();
        $(this).attr("disabled", true);
        var newGoing = $(this).val();
        $.ajax({
            type: "PATCH",
            url: "/api/admin/user/" + pubid + "/setRSVP",
            data: {
                going: newGoing
            },
            success: function (data) {
                _this.attr("disabled", false);
            },
            error: function (e) {
                console.log("RSVP update failed", e);
            }
        });
    });

    $("#setCheckedIn").on("change", function () {
        var _this = $(this);
        var pubid = $("#pubid").text();
        $(this).attr("disabled", true);
        var newChecked = $(this).val();
        $.ajax({
            type: "PATCH",
            url: "/api/admin/user/" + pubid + "/checkIn",
            data: {
                checkedin: newChecked
            },
            success: function (data) {
                _this.attr("disabled", false);
            },
            error: function (e) {
                console.log("CheckedIn update failed", e);
            }
        });
    });

    // remove user from database
    $('#remove-user').on('click', function () {
        var c = confirm("Are you sure you want to remove this user?");
        if (c) {
            $.ajax({
                type: "DELETE",
                url: "/api/admin/user/removeUser",
                data: {
                    pubid: $("#pubid").text()
                },
                success: function (res) {
                    location.href = "/admin/dashboard";
                },
                error: function (e) {
                    console.log("Couldn't remove the user!");
                }
            });
        }
    });


    /******************
     * SEARCH PAGE ****
     ******************/

    //handle decision buttons
    $(".decisionbuttons button").click(function () {
        var _this = this;
        var buttongroup = $(this).parent();
        var buttons = $(this).parent().find(".btn");
        var newStatus = $(_this).data("status");
        var pubid = $(_this).parents(".applicant").data("pubid");

        $(buttons).prop("disabled", true).removeClass("active");

        updateStatus("user", pubid, newStatus, function (data) {
            $(_this).parent().siblings(".status-text").text(newStatus);
            $(buttons).prop("disabled", false);
            $(_this).addClass("active");
        });
    });

    //show and hide email list in search window
    var areEmailsShowing = false; //email list is collapsed by default
    $("#email-show-button").click(function (e) {
        e.preventDefault();
        if (areEmailsShowing) {
            $("#email-content").hide();
            $("#email-show-button").text("(show)");
            areEmailsShowing = false;
        } else {
            $("#email-content").show();
            $("#email-show-button").text("(hide)");
            areEmailsShowing = true; //changes state to true to indicate that the emails are being shown
        }
    });

    //handle decision radio buttons for search view
    $('.decision-radio input[type=radio][name=status]').on('change', function () {
        var _this = this;
        var newStatus = $(_this).val();
        var radios = $(_this).parents(".decision-radio").find("input[type=radio]");
        var pubid = $(_this).parents(".applicant").data("pubid");

        $(radios).prop("disabled", true);

        updateStatus("user", pubid, newStatus, function (data) {
            $(radios).prop("disabled", false);
        })
    });

    //switch render location
    $('#render').on('change', function () {
        var redirect = _updateUrlParam(window.location.href, "render", $(this).val());
        window.location.assign(redirect);
    });
    var searchCategories = {
        pubid: {
            name: "pubid",
            placeholder: "Public User ID"
        },
        email: {
            name: "email",
            placeholder: "Email"
        },
        name: {
            name: "name",
            placeholder: "Name"
        }
    };

    $("#categoryselection").change(function () {
        var catString = $(this).val();
        var category = searchCategories[catString];
        var persist = $(this).find(":selected").data("persist");

        if (typeof category === "undefined") {
            console.log(catString, "Is not a valid category!");
        }
        else {
            var inputElem = '<input class="form-control" type="text" name="' + category.name + '" placeholder="' + category.placeholder + '" value="' + persist + '" />';
            $(".category-input").html(inputElem);
        }
    });

    //select default
    $("#categoryselection option").each(function (ind) {
        if ($(this).data("persist") != "") {
            $("#categoryselection").val($(this).val()).change();
        }
    });


    /*********************
     *** Role settings****
     *********************/

    //edit button
    $(".btn-edit.role").on('click', function () {
        $(this).siblings(".btn-save").eq(0).prop("disabled", function (idx, oldProp) {
            return !oldProp;
        });
        $(this).closest("tr").find(".roleDropdown").prop("disabled", function (idx, oldProp) {
            return !oldProp;
        });
    });

    //save button
    $(".btn-save.role").on('click', function () {
        var _this = this;
        var email = $(this).parents("tr").find(".email").text();
        var role = $(this).closest("tr").find(".roleDropdown").val();
        updateRole(email, role, function (data) {
            $(_this).prop("disabled", true);
            $(_this).closest("tr").find(".roleDropdown").prop("disabled", true);
        })
    });

    //remove button
    $(".btn-remove.role").on('click', function () {
        var _this = this;
        var email = $(this).parents("tr").find(".email").text();
        var c = confirm("Are you sure you want to remove " + email + "?");
        if (c) {
            updateRole(email, "user", function (data) {
                $(_this).parents("tr").remove();
            });
        }


    });

    //handle decision radio buttons for settings view
    $('#btn-add-user').on('click', function () {
        var email = $("#new-email").val();
        var role = $("#new-role").val();
        updateRole(email, role, function (data) {
            var c = confirm("Are you sure you want to add " + email + "?");
            if (c) {
                updateRole(email, role, function (data) {
                    //todo dynamic update
                    //$("#user-roles").append('<tr>name coming soon</tr><tr>'+email+'</tr><tr>'+role+'</tr>');
                    location.reload();
                });
            }
        });
    });


    /**********************
     *** Bus Management****
     **********************/

    //add college to list of bus stops
    $('#addcollege').on('click', function () {
        //FIXME: highly error-prone implementation
        // College ID
        var currentidlist = $("#collegeidlist").val();
        if (currentidlist != "") {
            $("#collegeidlist").val(currentidlist + "," + collegeDatum.id);
        }
        else {
            $("#collegeidlist").val(collegeDatum.id);
        }
        var newCollege = $("#college").val();
        var currentBusStops = $("#busstops").val();
        var currentBusStopsDisplay = $("#busstops-display").text();
        if (currentBusStopsDisplay != "") {
            $("#busstops,#busstops-display").val(currentBusStops + "," + newCollege).text(currentBusStops + "," + newCollege);
        }
        else {
            $("#busstops,#busstops-display").val(newCollege).text(newCollege);
        }
        $("#college").val("");
    });

    //edit bus from list of buses
    $('.editbus').on('click', function () {
        var businfobox = $(this).parents(".businfobox");

        //toggle display and edit components
        businfobox.find('.edit-group').css('display', 'inline'); //.show() defaults to block
        businfobox.find('.display-group').hide();
        businfobox.find('.modifybus.edit-group').css('display', 'block'); //allow buttons to be centered

        //Edit bus route name
        var currentBusName = businfobox.find(".busname").text().trim();
        businfobox.find(".newbusname").val(currentBusName);

        //Edit max capacity of bus
        var currentBusCapacity = businfobox.find(".maxcapacitynumber").text().trim();
        businfobox.find(".edit-maxcapacity").val(currentBusCapacity);

        //Edit custom message
        var customMessage = businfobox.find('.custom-message-par').text().trim();
        businfobox.find(".edit-custom-message").val(customMessage);
    });

    $('.cancel').on('click', function () {
        var businfobox = $(this).parents(".businfobox");
        //toggle display and edit components
        businfobox.find('.edit-group').hide();
        businfobox.find('.display-group').show();
    });

    //remove bus from list of buses
    $('.removebus').on('click', function () {
        var _this = this;
        var c = confirm("Are you sure you want to remove this bus?");
        if (c) {
            $.ajax({
                type: "DELETE",
                url: "/api/admin/removeBus",
                data: {
                    busid: $(_this).parents(".businfobox").data("busid")
                },
                success: function (data) {
                    $(_this).parents(".businfobox").remove();
                    if ($('.businfobox').length == 0)
                        $(".header-wrapper-leaf").after("<h3 id='nobuses'> No Buses Currently </h3>");
                },
                error: function (e) {
                    console.log("Couldn't remove the bus!");
                }
            });
        }
    });

    //remove college from list of colleges
    $("li").on('click', '.removecollege', function () {
        $(this).parent().remove();
    });

    //add new college to list of colleges
    $('.addnewcollege').on('click', function () {
        var businfobox = $(this).parents(".businfobox");
        var newcollegeid = businfobox.find(".newcollege.tt-input").data("collegeid");
        var newcollege = businfobox.find(".newcollege.tt-input").val(); //tt-input contains the actual input in typeahead
        businfobox.find(".busstops").append("<li data-collegeid='" + newcollegeid + "'>" +
            "<span class='collegename'>" + newcollege + '</span>&nbsp;&nbsp;<a class="removecollege edit-group" style="display:inline">(remove)</a></li>');
        businfobox.find(".newcollege").val("");
    });

    //update bus from list of buses
    $(".update").on('click', function () {
        var businfobox = $(this).parents(".businfobox");
        var stops = [];
        for (var i = 0; i < businfobox.find(".busstops li").length; i++) {
            stops.push({
                collegeid: businfobox.find(".busstops li").eq(i).data("collegeid"),
                collegename: businfobox.find(".collegename").eq(i).text()
            })
        }

        $.ajax({
            type: "PUT",
            url: "/api/admin/updateBus",
            contentType: 'application/json', // important
            data: JSON.stringify({
                busid: businfobox.data("busid"),
                busname: businfobox.find(".newbusname").val(),
                stops: stops,
                buscapacity: businfobox.find(".edit-maxcapacity").val(),
                customMessage: businfobox.find('.edit-custom-message').val()
            }),
            success: function (data) {
                //toggle display and edit components
                businfobox.find('.edit-group').hide();
                businfobox.find('.display-group').show();

            },
            error: function (e) {
                console.log("Couldn't update the bus!", e);
            }
        });
    });

    // Unset bus captain
    $('#unsetCaptain').on('click', function () {
        var em = $('#removeEmail').val();
        $.ajax({
            type: "DELETE",
            url: "/api/admin/busCaptain",
            data: {
                email: em
            },
            success: function (data) {
                location.reload();
            },
            error: alertErrorHandler
        });
    });

    function busRouteConfirmationAjax(type, message) {
        return function () {
            var id = $(this).parents(".businfobox").data("busid");
            var c = confirm(message);
            if (c) {
                $.ajax({
                    type: type,
                    url: "/api/admin/confirmBus",
                    data: {
                        busid: id
                    },
                    success: function (data) {
                        location.reload();
                    },
                    error: alertErrorHandler
                });
            }
        };
    }

    $('.confirmroute').on('click', busRouteConfirmationAjax('POST', 'Are you sure you want to enable this bus route?'));
    $('.unconfirmroute').on('click', busRouteConfirmationAjax('DELETE', 'Are you sure you want to disable this bus route?'));


    // Bus route override
    $("#submit-student-route").on('click', function () {
        $.ajax({
            method: "PUT",
            url: "/api/admin/busOverride",
            data: {
                email: $("#route-override-email").val(),
                routeName: $("#route-override-name").val()
            },
            error: alertErrorHandler,
            success: function (res) {
                location.reload();
            }
        });
    });

    // Delete Student Bus Route Override
    $(".delete-student-route").on('click', function () {
        var dat = $(this).parents("tr");
        var that = this;
        $.ajax({
            method: "DELETE",
            url: "/api/admin/busOverride",
            data: {
                email: dat[0].dataset.student
            },
            error: alertErrorHandler,
            success: function (res) {
                $(that).parents("tr").remove();
            }
        });
    });


    /********************************
     *** Reimbursement Management****
     ********************************/
    // Add Student Override
    $("#submit-student").on('click', function () {
        var that = this;
        $.ajax({
            method: "POST",
            url: "/api/admin/reimbursements/student",
            data: {
                email: $("#add-email").val(),
                amount: $("#add-amount").val()
            },
            error: alertErrorHandler,
            success: function (res) {
                location.reload();
            }
        });
    });

    // Delete Student Override
    $(".delete-student").on('click', function () {
        var dat = $(this).parents("tr");
        var that = this;
        $.ajax({
            method: "DELETE",
            url: "/api/admin/reimbursements/student",
            data: {
                email: dat[0].dataset.student
            },
            error: alertErrorHandler,
            success: function (res) {
                $(that).parents("tr").remove();
            }
        });
    });

    //disable amount for charter bus
    $("#new-travel, .modeDropdown").on('change', function () {
        var newAmount;
        if ($(this).is("#new-travel")) {
            newAmount = $("#new-amount");
        }
        else {
            newAmount = $(this).closest("tr").find(".amount");
        }
        if ($(this).val() == "Charter Bus") {
            newAmount.val(0);
            newAmount.prop("disabled", true);
        }
        else {
            newAmount.val("");
            newAmount.prop("disabled", false);
        }
    });

    //edit button
    $(".btn-edit.reimbursements").on('click', function () {
        var school = $(this).parents("tr");
        $(this).siblings(".btn-save").eq(0).prop("disabled", function (idx, oldProp) {
            return !oldProp;
        });

        school.find(".modeDropdown").prop("disabled", function (idx, oldProp) {
            return !oldProp;
        });
        //we dont reimburse charter buses
        if (school.find(".modeDropdown").val() != "Charter Bus") {
            school.find(".amount").prop("disabled", function (idx, oldProp) {
                return !oldProp;
            })
        }
    });

    //save button
    $(".btn-save.reimbursements").on('click', function () {
        var _this = this;
        var school = $(this).parents("tr");
        $.ajax({
            method: "PATCH",
            url: "/api/admin/reimbursements/school",
            data: {
                collegeid: school.data("collegeid"),
                travel: school.find(".modeDropdown").val(),
                amount: school.find(".amount").val()
            },
            success: function (d) {
                $(_this).prop("disabled", true);
                school.find(".modeDropdown").prop("disabled", true);
                school.find(".amount").prop("disabled", true);
            }
        });
    });

    //remove button
    $(".btn-remove.reimbursements").on('click', function () {
        var _this = this;
        var collegeid = $(this).parents("tr").data("collegeid");
        $.ajax({
            method: "DELETE",
            url: "/api/admin/reimbursements/school",
            data: {
                collegeid: collegeid
            },
            success: function (d) {
                $(_this).parents("tr").remove();
            }
        })

    });

    //handle decision radio buttons for settings view
    $('#btn-add-school').on('click', function () {
        $.ajax({
            type: "POST",
            url: "/api/admin/reimbursements/school",
            data: {
                collegeid: $("#new-collegeid").val(),
                college: $("#new-college").val(),
                travel: $("#new-travel").val(),
                amount: $("#new-amount").val()
            },
            error: function (e) {
                console.error(e);
            },
            success: function (res) {
                //todo dynamic update
                location.reload();
            }
        });
    });

    //todo replace with jqvalidator
    setInterval(function () {
        if ($("#new-collegeid").val() == "" || $("#new-travel").val() == "" || ($("#new-travel").val() != "Charter Bus" && $("#new-amount").val() == ""))
            $("#btn-add-school").prop("disabled", true);
        else $("#btn-add-school").prop("disabled", false);
    }, 500);


    var _updateUrlParam = function _updateUrlParam(url, param, paramVal) {
        var newAdditionalURL = "";
        var tempArray = url.split("?");
        var baseURL = tempArray[0];
        var additionalURL = tempArray[1];
        var temp = "";
        if (additionalURL) {
            tempArray = additionalURL.split("&");
            for (var i = 0; i < tempArray.length; i++) {
                if (tempArray[i].split('=')[0] != param) {
                    newAdditionalURL += temp + tempArray[i];
                    temp = "&";
                }
            }
        }
        var rows_txt = temp + "" + param + "=" + paramVal;
        return baseURL + "?" + newAdditionalURL + rows_txt;
    };
});

try {
    _tt_college_enable();
} catch (e) {
    // Some pages should not need this, so this error is expected.
}

function overrideFormDefault(form, target) {
    $(form).submit(function (e) {
        e.preventDefault();
        $(target).click();
    });
}

// Generic error handler, alerting the error thrown to the user.
function alertErrorHandler(jqXHR, textStatus, errorThrown) {
    var resp = textStatus + ' (' + errorThrown + ')';
    if (jqXHR.responseText)
        resp += ': ' + jqXHR.responseText;
    alert(resp);
}
