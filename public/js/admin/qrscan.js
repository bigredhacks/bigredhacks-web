"use strict";
var app = angular.module('brh.controllers', []);

var attendeeBlob = $('#data-init').data('init');
var responseP = $('#response-message');

function makeEventScan(email, pubid) {
    var event = $('#active-event option:selected').text();
    $.ajax({
        type: 'POST',
        url: '/api/admin/qrScan',
        data: {
            email: email,
            pubid: pubid,
            scanEventId: event
        },
        dataType: 'json',
        success: function(data, status, jqXHR) {
            console.log(data);
            console.log(status);
            console.log(jqXHR);
        },
        error: function(err) {
            console.error(err);
            responseP.html(err.responseText);
            alert(err.responseText);
        }
    });
}

function populateAttendeeTable() {
    var tableName = $('#active-event option:selected').text();
    // Clear table
    var table = $('#attendee-append');
    table.empty();
    table.append('<tr><td>Name</td><td>Email</td></tr>')
    for (var i of attendeeBlob.scanEvents) {
        if (i.name === tableName) {
            for (var j of i.attendees) {
                var appendHtml = '<tr><td>' + j.name.first + ' ' + j.name.last + '</td><td>' + j.email + '</td></tr>'
                table.append(appendHtml);
            }
        }
    }
}

app.controller('checkin.ctrl', ['$scope', '$http', function ($scope, $http) {
    $scope.users = [];
    $scope.inputSearch = "";

    //For QR scanning
    //Creates QRCodeDecoder Object
    var qr = new QCodeDecoder;
    var video = document.getElementById('camera');

    //Ensures that Canvas is supported in the browser
    if (!qr.isCanvasSupported() || !qr.hasGetUserMedia()){
        alert("Your browser doesn't match the required specs.");
        throw new Error("Canvas and getUserMedia are required");
    }
    //Specifies where to put the stream and what triggers the video
    //decodeFromCamera is the object that starts scanning every frame of the camera stream
    var elems = [{
        target: document.querySelector("#camera video"),
        activator: document.querySelector("#camera #scanQR"),
        deactivator: document.querySelector("#camera #stopScanQR"),
        decoder: qr.decodeFromCamera
    }];

    function _decodeCallback(err,result,e) {
      if (err){
        console.error(err);
      }

      if (!result) return;

      makeEventScan('',result);
    }

    //In case we have more than one stream
    elems.forEach(function(e) {
        e.activator.onclick = function(r) {
            //Stop any default behavior associated with buttons
            r && r.preventDefault();
            //Attempt to decode
            e.decoder.call(qr, e.target, _decodeCallback, false)
        };

        e.deactivator.onclick = function(r) {
            //Stop any default behavior associated with buttons
            r && r.preventDefault();
            //Attempt to decode

            // Although we could stop the timer here, this does not disable the camera stream, so reload instead.
            //clearInterval(qr.timerCapture);
            location.reload();
        }
    });

    $scope.filterSearch = function (user) {
        var input = $scope.inputSearch.toLowerCase();
        var name = (user.name.first + " " + user.name.last).toLowerCase();
        return (input == "" || name.indexOf(input) != -1);
    };

    $scope.filterCheckedIn = function (user) {
        return !user.internal.checkedin;
    };

    $scope.loadUsers = function () {
        $http.get('/api/admin/users/checkin')
            .success(function (data, status, headers, config) {
                $scope.users = data;
                console.log("Got users", data);
            })
            .error(function (data, status, headers, config) {
                console.log("Failed getting users", data, status, headers);
            });
    };

    $scope.checkinUser = function (pubid) {
        $http({
            method: 'PATCH',
            url: '/api/admin/user/' + pubid + '/checkin',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                checkedin: true
            }
        }).success(function (data) {
            $scope.loadUsers();
        }).error(function () {
            console.log("Error checking user in");
        });
    };

    $scope.loadUsers();

}]);

// Non angular js:
$('#attend-button').click(function() {
    var email = $('#email-input').val();
    makeEventScan(email,'');
});

$('#active-event').change(function() {
    populateAttendeeTable();
});

// $('#new-event-button').click(function() {
//     $.ajax({
//         type: 'POST',
//         url: '/api/admin/makeEvent',
//         data: {
//             name: $('#new-event-name').val()
//         },
//         dataType: 'json',
//         success: function(data, status, jqXHR) {
//             console.log(data);
//             console.log(status);
//             console.log(jqXHR);
//             location.reload();
//         }
//     });
// });