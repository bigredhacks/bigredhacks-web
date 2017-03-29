"use strict";
var mongoose = require('mongoose');

var attendeeSchema = new mongoose.Schema({
    name: {
        first: {type: String},
        last: {type: String}
    },
    email: {type: String},
    time: {type: Date, default:Date.now()},
    reference: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true}
});

var scanEventSchema = new mongoose.Schema({
    name: {type: String, index: {unique: true}},
    attendees: [
        attendeeSchema
        ]
});

module.exports = mongoose.model("ScanEvent", scanEventSchema);