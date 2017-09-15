"use strict";

const mongoose = require('mongoose');
const en = require("./enum.js");

let mentorRequestSchema = new mongoose.Schema({
    // Description of problem/reason for mentorship request
    description: { type: String,                                required: true},
    // Desired skills for this request
    skills:      { type: [String] },
    // User who made the request
    user:        { type: mongoose.Schema.Types.ObjectId,        ref: "User", required: true},
    // Mentor assigned to the request
    mentor:      { type: mongoose.Schema.Types.ObjectId,        ref: "Mentor", default: null},
    // Status of the request
    status:      { type: String, enum: en.mentorrequest.status, default: "Unclaimed"},
    // Location of user who made the request. Usually a table number.
    location:    { type: String,                                default: "Unknown"},
    // Number of matching mentors for this request (based on skills)
    num_matching_mentors: { type: Number, default: 0 },
    // When the request was created
    createdAt:   { type: Date,                                  default: Date.now()}
});

mentorRequestSchema.statics.generateRequest = function(userId, descrip, loc, callback) {
    let request = new this({
        user: userId,
        description: descrip,
        location: loc
    });
    request.save(callback);
};

module.exports = mongoose.model("MentorRequest", mentorRequestSchema);