var socket = io();

socket.on("announcement", function(data) {
    //window.alert(data);
    if(window.Notification && Notification.permission !== "denied") {
        Notification.requestPermission(function(status) {  // status is "granted", if accepted by user
            let n = new Notification("BigRed//Hacks Announcement!", {
                body: data,
                icon: "/img/logo/full-red.png" // optional
            });
        });
    }
});

function getTimeRemaining(endtime) {
    let t = Math.max(0,Date.parse(endtime) - new Date());
    let seconds = Math.floor((t / 1000) % 60);
    let minutes = Math.floor((t / 1000 / 60) % 60);
    let hours = Math.floor((t / (1000 * 60 * 60)) % 24);
    let days = Math.floor(t / (1000 * 60 * 60 * 24));
    return {
        "total": t,
        "days": days,
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds
    };
}

$("#request-mentor-btn").on("click", function(e) {
    e.preventDefault();
    //$("#request-mentor-btn").addClass("disabled");
    $.ajax({
        method: "POST",
        url: "/api/RequestMentor",
        data: {
            email: $("#mentor-req-email").val(),
            request: $("#mentor-req-text").val(),
            tableNumber: $("#mentor-req-table").val()
        },
        success: function(data) {
            $("#request-mentor-btn").addClass("disabled");
            $("#mentor-req-alert").css("visibility","visible").addClass("fadeOut").removeClass("alert-danger").removeClass("not-display").addClass("alert-success").text(data);
        },
        error: function(data) {
            $("#request-mentor-btn").addClass("disabled");
            $("#mentor-req-alert").css("visibility","visible").removeClass("alert-success").addClass("alert-danger").removeClass("not-display").text(data.responseText);
        }
    });
});

//fade out things that have fadeOut class
$(".fadeOut").delay(2000).fadeOut(2000, "easeInCubic");

function initializeClock(id, endtime) {
    let clock       = document.getElementById(id);
    let daysSpan    = clock.querySelector(".days");
    let hoursSpan   = clock.querySelector(".hours");
    let minutesSpan = clock.querySelector(".minutes");
    let secondsSpan = clock.querySelector(".seconds");

    function updateClock() {
        let t = getTimeRemaining(endtime);

        daysSpan.innerHTML    = t.days;
        hoursSpan.innerHTML   = ("0" + t.hours).slice(-2);
        minutesSpan.innerHTML = ("0" + t.minutes).slice(-2);
        secondsSpan.innerHTML = ("0" + t.seconds).slice(-2);

        if (t.total <= 0) {
            clearInterval(timeinterval);
        }
    }

    updateClock();
    let timeinterval = setInterval(updateClock, 1000);
}

let deadline = new Date("September 17, 2017 8:00:00 AM");
initializeClock("clockdiv", deadline);
