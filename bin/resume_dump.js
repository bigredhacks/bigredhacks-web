let fs = require('fs');
let async = require('async');
let mongoose = require('mongoose');
let https = require('https');

// Function to Download from a single URL
let download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};

// Replace this with the production MongoDB URL
let connectUrl = 'mongodb://productionaccess:granolapianist921@ds151662.mlab.com:51662/bigredhacks2017';
mongoose.connect(connectUrl, {
    useMongoClient: true,
    /* other options */
});
let User = require('../models/user.js');
let config = require('../config.js');

let RESUME_DEST = 'resume/';
// Replace this with the path that you want
let LOCAL_DEST = 'c:/Users/aliu/r/bigredhacks-web/resumes/';

let query = {"internal.status": "Accepted"};
    //{ "internal.going": true};

User.find(query,  function (err, users) {
    if (err) {
        console.error("Error getting users.");
    }
    else {
        console.log("Starting resume dump.");
        async.each(users, function (user, done) {
            let save_name = LOCAL_DEST + user.name.first + "_" + user.name.last + ".pdf";
            let filename = user.app.resume;
            // Hand check these resume links if anything breaks
            let resumeLink = "https://files.bigredhacks.com/" + RESUME_DEST + filename;
            console.log(filename, save_name, resumeLink);
            download(resumeLink, save_name, done);
        }, function (err, res) {
            console.log(err, "Finished!");
            process.exit();
        });

    }
});
