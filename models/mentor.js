"use strict";
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

const SALT_WORK_FACTOR = 10;

var mentorSchema = new mongoose.Schema({
    name: {
        first: { type: String,   required: true },
        last:  { type: String,   required: true }
    },
    email:     { type: String,   required: true, lowercase: true, trim: true, index: { unique: true } },
    password:  { type: String,   required: true },
    company:   { type: String,   required: true }, // May also just be an organization
    skills:    { type: [String], required: true },
    bio:       { type: String,   required: true },
    emailNewReq: { type: Boolean, default: false },
    passwordtoken: String,
    created_at:  { type: Date, default: Date.now },
    modified_at: { type: Date, default: Date.now },
});

mentorSchema.pre('save', function (next) {
    var _this = this;

    // Lowercase email for consistent login
    _this.email = _this.email.toLowerCase();

    //verify password is present
    if (!_this.isModified('password')) return next();

    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err) return next(err);

        bcrypt.hash(_this.password, salt, null, function (err, hash) {
            if (err) return next(err);
            _this.password = hash;
            next();
        });
    });
});

/**
 * compares the user's password and determines whether it's valid
 * @param candidatePassword
 * @returns {boolean}
 */
mentorSchema.methods.validPassword = function (candidatePassword) {
    return bcrypt.compareSync(candidatePassword, this.password);
};

module.exports = mongoose.model("Mentor", mentorSchema);