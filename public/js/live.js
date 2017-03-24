var socket = io();

socket.on('announcement', function(data) {
    //window.alert(data);
    if(window.Notification && Notification.permission !== "denied") {
        Notification.requestPermission(function(status) {  // status is "granted", if accepted by user
            var n = new Notification('BigRed//Hacks Announcement!', {
                body: data,
                icon: '/img/logo/full-red.png' // optional
            });
        });
    }
});

function getTimeRemaining(endtime) {
    var t = Math.max(0,Date.parse(endtime) - Date.parse(new Date()));
    var seconds = Math.floor((t / 1000) % 60);
    var minutes = Math.floor((t / 1000 / 60) % 60);
    var hours = Math.floor((t / (1000 * 60 * 60)) % 24);
    var days = Math.floor(t / (1000 * 60 * 60 * 24));
    return {
        'total': t,
        'days': days,
        'hours': hours,
        'minutes': minutes,
        'seconds': seconds
    };
}

$("#request-mentor-btn").on('click', function(e) {
    e.preventDefault();
    //$("#request-mentor-btn").addClass("disabled");
    $.ajax({
        method: "POST",
        url: "/API/RequestMentor",
        data: {
            email: $("#mentor-req-email").val(),
            request: $("#mentor-req-text").val(),
            tableNumber: $("#mentor-req-table").val()
        },
        success: function(data) {
            $("#request-mentor-btn").addClass("disabled");
            $("#mentor-req-alert").css("visibility","visible").addClass("fadeOut").removeClass("alert-danger").removeClass("not-display").addClass("alert-success").text(data);
            console.log(data);
        },
        error: function(data) {
            $("#request-mentor-btn").addClass("disabled");
            $("#mentor-req-alert").css("visibility","visible").removeClass("alert-success").addClass("alert-danger").removeClass("not-display").text(data.responseText);
            console.log(data);

        }
    })
})

//fade out things that have fadeOut class
$(".fadeOut").delay(2000).fadeOut(2000, "easeInCubic");

function initializeClock(id, endtime) {
    var clock = document.getElementById(id);
    var daysSpan = clock.querySelector('.days');
    var hoursSpan = clock.querySelector('.hours');
    var minutesSpan = clock.querySelector('.minutes');
    var secondsSpan = clock.querySelector('.seconds');

    function updateClock() {
        var t = getTimeRemaining(endtime);

        daysSpan.innerHTML = t.days;
        hoursSpan.innerHTML = ('0' + t.hours).slice(-2);
        minutesSpan.innerHTML = ('0' + t.minutes).slice(-2);
        secondsSpan.innerHTML = ('0' + t.seconds).slice(-2);

        if (t.total <= 0) {
            clearInterval(timeinterval);
        }
    }

    updateClock();
    var timeinterval = setInterval(updateClock, 1000);
}

var deadline = new Date(Date.parse(new Date("March 24, 2016 11:30:00")));
initializeClock('clockdiv', deadline);
