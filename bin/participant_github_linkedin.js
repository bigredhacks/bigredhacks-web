// LOCAL VERSION OF ADMIN SPONSORS DOWNLOAD
// DEPRECATED

var fs = require('fs');
var async = require('async');
var mongoose = require('mongoose');
mongoose.connect(process.env.COMPOSE_URI || process.env.MONGOLAB_URI || 'mongodb://localhost/bigredhacks', {
  useMongoClient: true,
  /* other options */
});
var User = require('../models/user.js');

var query = {"internal.going": true};

User.find(query, null, {"name.first": 1}, function (err, users) {
    if (err) {
        console.error("Error getting users.");
    }
    else {
        console.log("Starting user dump.");
        var stream = fs.createWriteStream("participant_info.csv");
        stream.write("First Name,Last Name,Github,Linkedin\r\n");
        stream.once('open', function (fd) {
            async.each(users, function (user, done) {
                console.log("wrote user " + user.name.full);
                stream.write(user.name.first + "," + user.name.last + "," + user.app.github + "," + user.app.linkedin + "\r\n");
                done();
            }, function (err) {
                if (err) {
                    console.log(err);
                }
                console.log("Finished writing users");
                stream.end();
            });
        });
    }
});