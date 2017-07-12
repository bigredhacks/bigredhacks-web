let fs = require('fs');
let async = require('async');
let mongoose = require('mongoose');
mongoose.connect(process.env.COMPOSE_URI || process.env.MONGOLAB_URI || 'mongodb://localhost/bigredhacks', {
  useMongoClient: true,
  /* other options */
});
let User = require('../models/user.js');

let query = {"internal.status": "Accepted"};
// {"internal.going": true};

User.find(query, null, {"name.first": 1}, function (err, users) {
    if (err) {
        console.error("Error getting users.");
    }
    else {
        console.log("Starting user dump.");
        let stream = fs.createWriteStream("participant_info.csv");
        stream.write("First Name,Last Name,Email,Major,Gender,Year\r\n");
        stream.once('open', function (fd) {
            async.each(users, function (user, done) {
                console.log("wrote user " + user.name.full);
                stream.write(user.name.first + "," + user.name.last + "," + user.email + "," + user.school.major + "," + user.gender + "," + user.school.year + "\r\n");
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