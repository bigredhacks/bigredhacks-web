"use strict";
var mongoose = require('mongoose');
var async = require('async');

var annotationSchema = new mongoose.Schema({
    time: {type: Date, default: Date.now},
    info: {type: String, default: Date.now, required: true},
});

module.exports = mongoose.model("TimeAnnotation", annotationSchema);
