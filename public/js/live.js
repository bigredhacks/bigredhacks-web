var socket = io();

socket.on('announcement', function(data) {
    window.alert(data);
});
