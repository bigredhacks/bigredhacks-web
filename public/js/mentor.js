'use strict';
$(document).ready(function () {

    // Socket
    let socket = io(); //client-side Socket.IO object

    socket.on('request update', function (newRequestList) {
        location.reload(); // TODO: Use jquery to make this more user-friendly
    });

    $("input[name='opt-in-toggle']").change(function () {
        var newVal = $(this).val() === "true";
        $.ajax({
            type: "POST",
            url: "/mentor/optin",
            data: {
                newVal: newVal
            },
            dataType: "json",
            success: function () {
                if (newVal === true) {
                    $("#success-msg").text("Successfully opted into mentor request emails!");
                }
                else {
                    $("#success-msg").text("Successfully opted out of mentor request emails!");
                }
            },
            error: function (e) {
                console.error(e);
                $("#success-msg").text("An unexpected error occurred while changing your opted in/out status.");
            }
        });
    });

    // Others
    $('.btn-claim').click(function() {
        var _that = this;
        $.ajax({
            type: "POST",
            url: "/mentor/claim",
            data: {
                mentorId: $(_that).closest('.mentorRequests').data('mentor'),
                requestId: $(_that).closest('tr').data('request')
            },
            dataType: "json",
            success: function (data) {
                location.reload();
            },
            error: function (e) {
                console.error(e);
                location.reload();
            }
        });
    });
});

