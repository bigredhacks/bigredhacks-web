"use strict";
const mongoose = require('mongoose');

let announcementSchema = new mongoose.Schema({
    message: {type: String, required: true},
    time: {type: Date, default: Date.now},
});

module.exports = mongoose.model("Announcement", announcementSchema);
