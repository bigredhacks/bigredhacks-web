"use strict";
var mongoose = require('mongoose');

var scanEventSchema = new mongoose.Schema({
    name: {type: String, index: {unique: true}},
    attendees: [{type: mongoose.Schema.Types.ObjectId, ref: "User", required: true}]
});

module.exports = mongoose.model("ScanEvent", scanEventSchema);