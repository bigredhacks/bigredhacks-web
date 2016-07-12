"use strict";
var mongoose = require('mongoose');
var async = require('async');

var announcementSchema = new mongoose.Schema({
    message: {type: String, required: true},
    time: {type: Date, default: Date.now},
});

module.exports = mongoose.model("Announcement", announcementSchema);
