"use strict";

let AWS = require('aws-sdk');
let uid = require('uid2');
let fs = require('fs');
let async = require('async');

let mongoose = require('mongoose');
mongoose.connect(process.env.COMPOSE_URI || process.env.MONGOLAB_URI || 'mongodb://localhost/bigredhacks', {
  useMongoClient: true,
  /* other options */
});
//mongoose.connect('mongodb://localhost/bigredhacks');
let config = require('../config.js');
let User = require('../models/user.js');

let RESUME_DEST = 'resume/';
let RECEIPT_DEST = 'travel/';

let LOCAL_DEST = 'D:/resumes/';

let s3 = new AWS.S3({
    accessKeyId: config.setup.AWS_access_key,
    secretAccessKey: config.setup.AWS_secret_key
});

var query = {"internal.status": "Accepted"};
    //{ "internal.going": true};
/*
    "$or": [
        {"internal.going": true},
        {
            "$and": [
                {"internal.cornell_applicant": true},
                {"internal.status": "Accepted"}
            ]
        }
    ]
};
*/

User.find(query, function (err, users) {
    if (err) {
        console.error("Error getting users.");
    }
    else {
        console.log("Starting resume dump.");
        async.each(users, function (user, done) {
            let save_name = LOCAL_DEST + user.name.first + "_" + user.name.last + "_" + uid(2) + ".pdf";
            let filename = user.app.resume;
            console.log(filename, save_name);
            let params = {Bucket: "files.bigredhacks.com", Key: RESUME_DEST + filename};
            //console.log(params);
            let file = fs.createWriteStream(save_name);
            let r = s3.getObject(params).createReadStream().pipe(file);
            r.on("error", function(err) {console.log(err)});
            r.on('finish', done);
        }, function (err, res) {
            console.log(err, "Finished!");
            process.exit();
        });

    }
});
