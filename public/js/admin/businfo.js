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