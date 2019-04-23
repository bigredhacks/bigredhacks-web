"use strict";

var AWS = require('aws-sdk');
var uid = require('uid2');
var fs = require('fs');
var async = require('async');

var mongoose = require('mongoose');
mongoose.connect(process.env.COMPOSE_URI || process.env.MONGOLAB_URI || 'mongodb://localhost/bigredhacks', {
    useMongoClient: true,
    /* other options */
});
//mongoose.connect('mongodb://localhost/bigredhacks');
var config = require('../config.js');
var User = require('../models/user.js');

var RECEIPT_DEST = 'travel/';

var LOCAL_DEST = process.env.LOCAL_DEST;

var s3 = new AWS.S3({
    accessKeyId: config.setup.AWS_access_key,
    secretAccessKey: config.setup.AWS_secret_key
});

var query = { "internal.travel_receipt": { "$ne": null }, "internal.checkedin": true };


User.find(query, function (err, users) {
    if (err) {
        console.error("Error getting users.");
    }
    else {
        console.log("Starting travel dump.");
        async.each(users, function (user, done) {
            var save_name = LOCAL_DEST + user.name.first + "_" + user.name.last + "_" + uid(2) + ".pdf";
            var filename = user.internal.travel_receipt;
            console.log(filename, save_name);
            var params = { Bucket: config.setup.AWS_S3_bucket, Key: RECEIPT_DEST + filename };
            //console.log(params);
            var file = fs.createWriteStream(save_name);
            var r = s3.getObject(params).createReadStream().pipe(file);
            r.on("error", function (err) { console.log(err) });
            r.on('finish', done);
        }, function (err, res) {
            console.log(err, "Finished!");
            process.exit();
        });

    }
});
