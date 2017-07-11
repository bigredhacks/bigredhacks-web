'use strict';
$(document).ready(function () {

    // Socket
    let socket = io(); //client-side Socket.IO object

    socket.on('request update', function (newRequestList) {
        location.reload(); // TODO: Use jquery to make this more user-friendly
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
        })
    });
});

