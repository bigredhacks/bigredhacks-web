"use strict";
var async = require('async');
var Converter = require("csvtojson").Converter; //converter class
var fs = require("fs");
var College = require('../models/college.js');
var Hardware = require('../models/hardware.js');

var files = "./data/us-colleges-2014.csv ./data/us-colleges-other.csv".split(" ");
var hardwareFiles = "./data/hardware.csv".split(" ");

var collegeLoader = {};
/*
Some notes:
 * Loading should be done before the app enters production to prevent invariant errors
 * Invalidating and reloading list won't affect associations
 */
/**
 * Load a list of colleges in /data into the database
 * Will not do anything if the colleges table has any entries
 * @param callback
 */
collegeLoader.loadOnce = function loadOnce(callback) {
    College.findOne({}, function (err, res) {
        if (err) {
            console.log(err);
            return callback(err);
        }
        else {
            if (res === null) { //college table empty
                return _loadFromFile(callback);
            }
            else { //college table populated
                console.log("College table already populated: Use load() to force adding, or truncate the table first.");
                return callback();
            }
        }
    });
};

/**
 * Load a list of colleges in /data into the database
 * Adds any missing entries
 * @param callback
 */
collegeLoader.load = function load(callback) {
    _addColleges(callback);
};

var hardwareLoader = {};

hardwareLoader.loadOnce = function loadOnce(callback) {
    Hardware.findOne({}, function (err, res) {
        if (err) {
            console.log(err);
            return callback(err);
        }
        else {
            if (res === null) { //hardware table empty
                return _loadHardwareFromFile(callback);
            }
            else { //hardware table populated
                console.log("Hardware table already populated: Use load() to force adding, or truncate the table first.");
                return callback();
            }
        }
    });
};

/**
 * method that adds hardware
 * @param callback
 * @private
 */
function _loadHardwareFromFile(callback) {
    console.log("Adding hardware...");
    async.each(hardwareFiles, _addHardware, function (err) {
        if (err) {
            console.log(err);
            return callback(err);
        }
        else {
            console.log("Adding hardware finished.");
            return callback();
        }
    });
}


/**
 * main method that adds colleges
 * @param callback
 * @private
 */
function _loadFromFile(callback) {
    console.log("Adding colleges...");
    async.each(files, _addColleges, function (err) {
        if (err) {
            console.log(err);
            return callback(err);
        }
        else {
            console.log("Adding colleges finished.");
            return callback();
        }
    });
}

/**
 * parse a college csv
 * @param filepath
 * @param done
 * @private
 */
function _addColleges(filepath, done) {
    var fileStream = fs.createReadStream(filepath);
    //new converter instance
    var csvConverter = new Converter({ constructResult: true });

    //read from file
    fileStream.pipe(csvConverter);

    csvConverter.on("record_parsed", function (res, rawRow, rowIndex) {
        College.add(res.unitid, res.name, res.city, res.state, res.zip, res.longitude, res.latitude,
            function (err) {
                if (err) {
                    done(err + " " + filepath + " " + rowIndex);
                }
            });
    });

    //end_parsed will be emitted once parsing finished
    csvConverter.on("end_parsed", function (jsonObj) {
        console.log("Finished for ", filepath);
        done();
    });
}

/**
 * parse a hardware csv
 * @param filepath
 * @param done
 * @private
 */
function _addHardware(filepath, done) {
    var fileStream = fs.createReadStream(filepath);
    //new converter instance
    var csvConverter = new Converter({ constructResult: true });

    //read from file
    fileStream.pipe(csvConverter);

    csvConverter.on("record_parsed", function (res, rawRow, rowIndex) {
        Hardware.add(
            res.name,
            0,
            0,
            function (err) {
                if (err) {
                    console.log(err);
                    done(err + " " + filepath + " " + rowIndex);
                }
            });
    });

    //end_parsed will be emitted once parsing finished
    csvConverter.on("end_parsed", function (jsonObj) {
        console.log("Finished for ", filepath);
        done();
    });
}

module.exports.collegeLoader = collegeLoader;
module.exports.hardwareLoader = hardwareLoader;