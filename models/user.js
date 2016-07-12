"use strict";
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var uid = require('uid2');
var async = require('async');

var College = require("./college.js");
var Team = require("./team.js");
var en = require("./enum.js");

var SALT_WORK_FACTOR = 10;

//general user info
var userSchema = new mongoose.Schema({
    pubid: {type: String, index: {unique: true}}, //public facing userid
    name: {
        first: {type: String, required: true},
        last: {type: String, required: true}
    },
    gender: {type: String, enum: en.user.gender},
    email: {type: String, required: true, lowercase: true, trim: true, index: {unique: true}},
    password: {type: String, required: true},
    phone: String,
    logistics: {
        dietary: {type: String, enum: en.user.dietary},
        tshirt: {type: String, enum: en.user.tshirt},
        anythingelse: String
    },
    school: {
        id: {type: String, ref: "College", index: true},
        name: String,
        year: {type: String, enum: en.user.year},
        major: String
    },
    app: {
        github: String,
        linkedin: String,
        resume: String,
        questions: {
            q1: String,//@todo fill out with identifiers for questions
            q2: String,
            hardware: [String]
        },
        hackathonsAttended: {type: String, enum: en.user.hackathonsAttended, required: true}
    },
    internal: {
        teamid: {type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null},
        teamwithcornell: {type: Boolean, default: false},
        busid: {type: mongoose.Schema.Types.ObjectId, ref: "Bus", default: null},
        status: {type: String, enum: en.user.status, default: "Pending"},
        notificationStatus: {type: String, enum: en.user.status, default: "Pending"}, // The status that we've last informed them of
        lastNotifiedAt: {type: Date, default: null},
        going: {type: Boolean, default: null},
        travel_receipt: {type: String, default: null},
        not_interested: {type: Boolean, default: null}, //waitlisted - if true, they forfeit their spot
        cornell_applicant: {type: Boolean, default: false},
        checkedin: {type: Boolean, default: false}
    },
    passwordtoken: String,
    created_at: {type: Date, default: Date.now},
    modified_at: {type: Date, default: Date.now},
    role: {type: String, enum: en.user.role, default: "user"},
    team: Array, //virtual property used to populate team members,]
    mentorinfo: {
        company: String,
        skills: [String],
        bio: String
    }
});

//full name of user
userSchema.virtual('name.full').get(function () {
    return this.name.first + " " + this.name.last;
});

//todo validate existence of college
userSchema.pre('save', function (next) {
    var _this = this;

    //add a public uid for the user
    //TODO consider moving to create
    if (typeof _this.pubid === "undefined") {
        _this.pubid = uid(10);
    }

    //check if user was modified
    if (_this.isModified()) {
        _this.modified_at = Date.now();
    }

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
 * compares the user's password and derermines whether it's valid
 * @param candidatePassword
 * @returns {boolean}
 */
userSchema.methods.validPassword = function (candidatePassword) {
    return bcrypt.compareSync(candidatePassword, this.password);
};


//todo cleanup with async library
/**
 * add a user to team by public user id
 * @param pubid
 * @param callback
 */
userSchema.methods.addToTeam = function (pubid, callback) {
    var _this = this;
    var userModel = mongoose.model("User"); //reference the static model
    userModel.findOne({pubid: pubid}, function (err, other) {
        if (err) {
            return callback(err);
        }
        if (other === null) {
            return callback(null, "User does not exist.");
        }
        else if (pubid == _this.pubid) {
            //user can't add himself
            return callback(null, "User is already in your team!");
        }
        else if (other.internal.teamid == _this.internal.teamid && _this.internal.teamid !== null) {
            //same team, but both not null
            return callback(null, "User is already in your team");
        }
        else if (other.internal.teamid !== null && _this.internal.teamid !== null && other.internal.teamid !== _this.internal.teamid) {
            return callback(null, "User is already part of a team.");
        }
        //other user has a team
        if (other.internal.teamid !== null) {
            Team.findTeam(other._id, function (err, team) {
                if (err) {
                    return callback(err);
                }
                else {
                    team.addUser(_this._id, _this.name, function (err, newteam) {
                        if (err) {
                            return callback(err);
                        }
                        if (typeof newteam == 'string') {
                            return callback(null, newteam);
                        }
                        else {
                            _this.internal.teamid = other.internal.teamid;
                            _this.save(function (err, res) {
                                if (err) {
                                    return callback(err);
                                }
                                else {
                                    return callback(null, res);
                                }
                            })
                        }
                    })
                }
            })
        }
        //current user doesn't have a team
        else if (_this.internal.teamid === null) {
            var team = new Team();
            team.addUser(_this._id, _this.name, function (err, newteam) {
                if (err) {
                    return callback(err);
                }
                if (typeof newteam == 'string') {
                    return callback(null, newteam);
                }
                else {
                    newteam.addUser(other._id, other.name, function (err, res) {
                        if (err) {
                            return callback(err);
                        }
                        if (typeof newteam == 'string') {
                            return callback(null, newteam);
                        }
                        else {
                            other.internal.teamid = newteam._id;
                            _this.internal.teamid = newteam._id;
                            async.parallel([
                                    function (done) {
                                        _this.save(done)
                                    },
                                    function (done) {
                                        other.save(done)
                                    }],
                                function (err) {
                                    if (err) {
                                        console.log(err)
                                    }
                                    callback(err, res);
                                });
                        }
                    });
                }
            });
        }
        //current user has a team and other user does not
        else {
            _this.populate("internal.teamid", function (err, user) {
                if (err) {
                    return callback(err);
                }
                else {
                    user.internal.teamid.addUser(other._id, other.name, function (err, newteam) {
                        if (err) {
                            return callback(err);
                        }
                        if (typeof newteam == 'string') {
                            return callback(null, newteam);
                        }
                        else {
                            other.internal.teamid = _this.internal.teamid;
                            other.save(function (err, res) {
                                if (err) {
                                    return callback(err);
                                }
                                else return callback(null, res);
                            })
                        }
                    });
                }
            })
        }
    });
};

//todo cleanup with async library
/**
 * leave the user's current team
 * @param callback
 * @returns {*}
 */
userSchema.methods.leaveTeam = function (callback) {
    var user = this;
    if (typeof user.internal.teamid === null) {
        return callback(null, "You are currently not in a team.");
    }
    else {
        user.populate("internal.teamid", function (err, user) {
            if (err) {
                return callback(err);
            }
            try {
                user.internal.teamid.removeUser(user._id, function (err, team) {
                    if (err) {
                        return callback(err);
                    }
                    user.internal.teamid = null;
                    user.save(function (err) {
                        if (err) return callback(err);
                        else {
                            return callback(null, true);
                        }
                    });
                })
            }
            catch (err) {
                callback("userSchema.methods.leaveTeam: " + err);
            }
        })
    }
};

/**
 * Remove a user from a team by user_id
 * @param user_id
 * @param callback
 */
userSchema.statics.removeFromTeam = function (user_id, callback) {
    User.findById(user_id, function (err, user) {
        if (err) {
            return callback(err);
        }
        else {
            if (user.internal.teamid === null) {
                return callback();
            }
            user.populate("internal.teamid", function (err, user) {
                if (err) {
                    return callback(err);
                }
                else {
                    user.internal.teamid.removeUser(user_id, function (err) {
                        if (err) {
                            return callback(err);
                        }
                        else {
                            user.internal.teamid = null;
                            user.save(function (err) {
                                if (err) return callback(err);
                                else return callback(true);
                            })
                        }
                    })
                }
            })
        }
    })
};

module.exports = mongoose.model("User", userSchema);
