"use strict";
var express = require("express");
var AWS = require("aws-sdk");
var async = require("async");
var _ = require("underscore");
var multiparty = require("multiparty");
var moment = require("moment");

var enums = require("../models/enum.js");
var helper = require("../util/routes_helper.js");
const config = require("../config.js");
var validator = require("../library/validations.js");
var middle = require("../routes/middleware.js");
var util = require("../util/util.js");

var Bus = require("../models/bus.js");
var User = require("../models/user.js");
var Mentor = require("../models/mentor.js");
var College = require("../models/college.js");
var Event = require("../models/event.js");
var uid = require("uid2");
var MentorRequest = require("../models/mentor_request");
var Reimbursement = require("../models/reimbursements.js");

var MAX_FILE_SIZE = 1024 * 1024 * 15;
var MAX_BUS_PROXIMITY = 50; //miles

module.exports = function (io) {

    const requestMentor = require("./user/mentor");

    var router = express.Router();

    /**
     * @api {GET} /user Redirects to /user/dashboard
     * @apiName User
     * @apiGroup User
     */
    router.get("/", function (req, res, next) {
        res.redirect("user/dashboard");
    });

    /**
     * @api {GET} /user/dashboard Dashboard for a user
     * @apiName Dashboard
     * @apiGroup User
     */
    router.get("/dashboard", function (req, res, next) {

        var params = { Bucket: config.setup.AWS_S3_bucket, Key: "resume/" + req.user.app.resume };

        async.parallel({
            resumeLink: function (done) {
                /*s3.getSignedUrl('getObject', params, function(err, url) {
                 return done(err, url);
                 });*/
                // return done(null, helper.s3url() + "/resume/" + req.user.app.resume);
                // change back to files.bigredhacks.com at some point?
                return done(null, "https://" + config.setup.AWS_S3_bucket + ".s3.amazonaws.com" + "/resume/" + req.user.app.resume);
            },
            members: function (done) {
                req.user.populate("internal.teamid", function (err, user) {
                    var members = [];
                    if (err) {
                        return done(err);
                    }

                    //initialize members
                    if (user.internal.teamid !== null) {
                        members = user.internal.teamid.members;
                    }
                    return done(err, members);
                });
            },
            // Priority is user-override, then school-override, then default
            reimbursement: function (done) {
                if (req.user.internal.reimbursement_override > 0) {
                    return done(null, { amount: req.user.internal.reimbursement_override });
                }

                Reimbursement.findOne({ "college.id": req.user.school.id }, function (err, rem) {
                    if (rem == null) {
                        var default_rem = {};
                        default_rem.amount = config.admin.default_reimbursement;
                        return done(err, default_rem);
                    }

                    return done(err, rem);
                });
            },
            bus: function (done) {
                _findAssignedOrNearestBus(req, done);
            },
            deadline: function (done) {
                var notified = req.user.internal.lastNotifiedAt;
                const rsvpTime = moment.duration(req.user.internal.daysToRSVP, "days");
                if (notified) {
                    const mNotified = moment(notified).add(rsvpTime);
                    return done(null, {
                        active: !mNotified.isBefore(),
                        message: mNotified.fromNow(true),
                        interval: rsvpTime.humanize()
                    });
                }

                return done(null, null);
            }
        }, function (err, results) {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            }

            let render_data = {
                user: req.user,
                resumeLink: results.resumeLink,
                team: results.members,
                bus: results.bus,
                reimbursement: results.reimbursement,
                deadline: results.deadline,
                title: "Dashboard",
                fbLink: config.yearly.facebook ? config.yearly.facebook : "fb.com/bigredhacks"
            };

            return res.render("dashboard/index", render_data);
        });
    });

    /**
     * @api {GET} /user/dashboard/edit Edit registration page of logged in user.
     * @apiName Edit
     * @apiGroup User
     */
    router.get("/dashboard/edit", function (req, res, next) {
        var user = _.omit(req.user, "password".split(" "));
        res.render("dashboard/edit_app", {
            user: user,
            enums: enums,
            title: "Edit Application"
        });
    });


    /**
     * @api {POST} /dashboard/edit Submit edited user data.
     * @apiName Edit
     * @apiGroup User
     */
    router.post("/dashboard/edit", middle.requireRegistrationOpen, function (req, res, next) {

        var user = req.user;

        req = validator.validate(req, [
            "passwordOptional", "phonenumber", "dietary", "tshirt", "yearDropdown", "major", "linkedin", "q1", "q2", "q3", "anythingelse", "hackathonsAttended"
        ]);
        var errors = req.validationErrors();
        if (errors) {
            res.render("dashboard/edit_app", {
                user: user,
                title: "Edit Application",
                message: "The following errors occurred",
                errors: errors,
                enums: enums
            });
        }
        else {
            if (req.body.password !== "") {
                user.password = req.body.password;
            }
            user.phone = req.body.phonenumber;
            user.gender = req.body.genderDropdown;
            user.ethnicity = req.body.ethnicityDropdown;
            user.school.major = req.body.major;
            user.school.minor = req.body.minor;
            user.app.questions.q1 = req.body.q1;
            user.app.questions.q2 = req.body.q2;
            user.app.questions.q3 = req.body.q3;
            user.app.github = req.body.github;
            user.app.linkedin = req.body.linkedin;
            user.app.hackathonsAttended = req.body.hackathonsAttended;
            user.logistics.dietary = req.body.dietary;
            user.logistics.tshirt = req.body.tshirt;
            user.logistics.anythingelse = req.body.anythingelse;
            user.app.questions.hardware = req.body.hardware.split(",");
            user.save(function (err, doc) {
                console.log("Save?")
                if (err) {
                    // If it failed, return error
                    console.log(err);
                    req.flash("error", "An error occurred.");
                    return res.redirect("/dashboard/edit");
                }
                else {
                    //redirect to dashboard home
                    req.flash("success", "Application successfully updated!");
                    res.redirect("/user/dashboard");
                }
            });
        }
    });

    /**
     * @api {POST} /user/team/add Add a user to team.
     * @apiName Add
     * @apiGroup User
     */
    router.post("/team/add", middle.requireAnyRegistrationOpen, function (req, res, next) {
        var pubid = req.body.userid;
        var user = req.user;

        user.addToTeam(pubid, function (err, resMsg) {
            if (err) {
                console.log(err);
                req.flash("error", "An error occurred. Please try again later"); //todo standardize error messages
            }
            else {
                if (typeof resMsg === "string") {
                    req.flash("error", resMsg);
                }
                else {
                    req.flash("success", "Successfully joined team."); //todo substitute user with name
                }
            }
            res.redirect("/user/dashboard");
        });

    });

    /**
     * @api {GET} /user/team/leave Leave current team.
     * @apiName Leave
     * @apiGroup User
     */
    router.get("/team/leave", middle.requireAnyRegistrationOpen, function (req, res, next) {
        req.user.leaveTeam(function (err, resMsg) {
            if (err) {
                console.log(err);
                req.flash("error", "An error occurred. Please try again later.");
            }
            else {
                if (typeof res === "string") {
                    req.flash("error", res);
                }
                else {
                    req.flash("success", "Successfully left team.");
                }
            }
            res.redirect("/user/dashboard");
        });
    });
    //fixme both add and leave share similar callback function

    /**
     * @api {POST} /user/team/cornell Toggle whether the team includes cornell students.
     * @apiName TeamWithCornell
     * @apiGroup User
     */
    router.post("/team/cornell", function (req, res, next) {
        var checked = (req.body.checked === "true");
        var user = req.user;
        user.internal.teamwithcornell = checked;
        user.save(function (err) {
            if (err) {
                res.send(500);
            }
            else res.send(200);
        });
    });


    /**
     * @api {POST} /user/updateresume Upload a new resume.
     * @apiName UpdateResume
     * @apiGroup User
     */
    router.post("/updateresume", function (req, res, next) {

        var form = new multiparty.Form({ maxFilesSize: MAX_FILE_SIZE });

        form.parse(req, function (err, fields, files) {
            if (err) {
                console.log(err);
                if (err.toString() === "Error: maximum file length exceeded") {
                    err = "Your resume is too big. Please decrease the size to below 10 MB, and try again.";
                }
                req.flash("error", err);
                return res.redirect("/user/dashboard");
            }

            var resume = files.resumeinput[0];
            var options = {};
            // make sure the user has had a resume
            if (req.user.app.resume) {
                options.filename = req.user.app.resume;
            }
            options.type = "resume";

            helper.uploadFile(resume, options, function (err, file) {
                if (err) {
                    console.error(err);
                    req.flash("error", "File upload failed.");
                    return res.redirect("/user/dashboard");
                }
                else if (typeof file === "string") {
                    req.flash("error", file);
                    return res.redirect("/user/dashboard");
                }

                // Actually update user's resume
                var user = req.user;
                if (user) {
                    user.app.resume = file.filename; // TODO: We may need to validate before saving here
                    user.save(function (err) {
                        if (err) {
                            console.error(err);
                            req.flash("error", "Error in saving resume");
                            return res.redirect("/user/dashboard");
                        }

                        req.flash("success", "Resume successfully updated");
                        return res.redirect("/user/dashboard");
                    });
                }
                else {
                    console.error("No user sent, can't update resume!");
                    req.flash("error", "Error in user validation");
                    return res.redirect("/user/dashboard");
                }
            });
        });
    });

    /**
     * @api {POST} /user/busdecision Riding bus signup
     * @apiName BusDecision
     * @apiGroup User
     *
     * @apiParam {String} decision Either signup or optout
     */
    router.post("/busdecision", middle.requireAccepted, function (req, res) {
        var user = req.user;
        if (req.body.decision === "signup") {
            Bus.findOne({ _id: req.body.busid }, function (err, bus) {
                if (bus.members.length < bus.capacity && user.internal.busid !== req.body.busid) {
                    user.internal.busid = req.body.busid;
                    bus.members.push({
                        name: user.name.last + ", " + user.name.first,
                        college: user.school.name,
                        email: user.email,
                        id: user.id
                    });
                    bus.save(function (err) {
                        if (err) {
                            console.log("Bus Save Error: " + err);
                            return res.sendStatus(500);
                        }
                        else {
                            user.save(function (err) {
                                if (err) {
                                    console.log("User Save Error: " + err);
                                    return res.sendStatus(500);
                                }
                                else {
                                    return res.sendStatus(200);
                                }
                            });
                        }
                    });
                }
                else {
                    return res.sendStatus(500);
                }
            });
        }
        else if (req.body.decision.toLowerCase() == "optout") {
            return util.removeUserFromBus(Bus, req, res, user);
        }
        else {
            return res.sendStatus(500);
        }
    });

    /**
     * @api {POST} /user/rsvp Provide decision to RSVP
     * @apiName RSVP
     * @apiGroup User
     */
    router.post("/rsvp", middle.requireAccepted, function (req, res) {
        var form = new multiparty.Form({ maxFilesSize: MAX_FILE_SIZE });

        form.parse(req, function (err, fields, files) {
            if (err) {
                console.log(err);
                if (err.toString() === "Error: maximum file length exceeded") {
                    err = "Your resume is too big. Please decrease the size to below 10 MB, and try again.";
                }
                req.flash("error", err);
                return res.redirect("/user/dashboard");
            }

            //console.log(files);
            if (files.receipt) {
                var receipt = files.receipt[0];
            }

            req.body = helper.reformatFields(fields);

            if (req.body.rsvpDropdown.toLowerCase() === "yes") {
                req.user.internal.going = true;
                //travel receipt
                _findAssignedOrNearestBus(req, function (err, bus) {
                    if (err) {
                        console.log(err);
                    }
                    // Shared function between control flow
                    let _saveAndSubscribe = function _saveAndSubscribe() {
                        async.parallel([
                            function (cb) {
                                req.user.save(cb);
                            },
                            function (cb) {
                                if (!req.user.internal.cornell_applicant) {
                                    helper.updateSubscriberType(config.mailchimp.l_applicants, req.user.email, config.mailchimp.l_external_rsvpd, cb);
                                }
                                else {
                                    helper.updateSubscriberType(config.mailchimp.l_applicants, req.user.email, "Cornell Attendee", cb);
                                }
                            }
                        ], function (err, result) {
                            if (err) {
                                console.error(err);
                                req.flash("error", "An internal error has occurred.");
                            }
                            else {
                                req.flash("success", "We have received your response!");
                            }

                            return res.redirect("/user/dashboard");
                        });
                    };

                    //travel receipt required if no bus and not from cornell
                    if (bus === null && !req.user.internal.cornell_applicant) {
                        //fail if no receipt uploaded
                        if (!receipt) {
                            if (req.user.email.includes("@cornell.edu") || req.user.school.name.includes("Cornell")) {
                                return _saveAndSubscribe();
                            }
                            else {
                                req.flash("error", "Please upload a travel receipt.");
                                return res.redirect("/user/dashboard");
                            }
                        }

                        helper.uploadFile(receipt, { type: "receipt" }, function (err, file) {
                            if (err) {
                                console.log(err);
                                req.flash("error", "File upload failed. :(");
                                return res.redirect("/user/dashboard");
                            }

                            if (typeof file === "string") {
                                req.flash("error", file);
                                return res.redirect("/user/dashboard");
                            }
                            else {
                                return _saveAndSubscribe();
                            }
                        });
                    }
                    else {
                        return _saveAndSubscribe();
                    }
                });
            }
            else {
                req.user.internal.going = false;
                req.flash("success", "We have received your decision not to attend.");
                req.user.save(function (err) {
                    if (err) {
                        console.log(err);
                    }
                    return res.redirect("/user/dashboard");
                });
            }
        });
    });

    /**
     * @api {GET} /user/travel Provides travel information for the user
     * @apiName Travel
     * @apiGroup User
     */
    router.get("/travel", middle.requireAccepted, function (req, res, next) {
        res.render("dashboard/travel", {
            title: "Travel Information"
        });
    });

    /**
     * @api {GET} /user/travel A static travel page.
     * @apiName Travel
     * @apiGroup User
     */
    router.get("/travel", middle.requireResultsReleased, function (req, res, next) {
        res.render("dashboard/travel", {
            user: req.user,
            title: "Travel Information"
        });
    });

    // router.get("/dashboard/requestmentor", requestMentor.get);
    // router.post("/dashboard/requestmentor", requestMentor.post.bind(io));

    /**
     * @api {GET} /user/dashboard/schedule Gets a page displaying the schedule.
     * @apiName Schedule
     * @apiGroup User
     */
    router.get("/dashboard/schedule", middle.requireDayof, function (req, res) {
        res.render("dashboard/schedule", {
            title: "Schedule",
            user: req.user
        });
    });

    /**
     * @api {POST} /user/notificationshown Acknowledge receipt of a notification.
     * @apiName NotificationShown
     * @apiGroup User
     */
    router.post("/notificationshown", function (req, res) {
        Event.findOne({ _id: req.body.eventId }, function (err, event) {
            event.notificationShown = true;
            event.save(function (err) {
                if (err) {
                    return res.sendStatus(500);
                }
                else {
                    return res.sendStatus(200);
                }
            });
        });
    });

    /**
     * @api {GET} /user/logout Logout the current user and redirect to index.
     * @apiName Logout
     * @apiGroup User
     */
    router.get("/logout", function (req, res) {
        req.logout();
        res.redirect("/");
    });

    /**
     * Sorts the company list alphabetically, and then sorts the image list based on that order
     * @param callback passed in to function which takes in as parameters the sorted company list and sorted image list
     */
    function _getSortedCompanyImages(req, callback) {
        var companyImages = enums.mentor.companyimage.slice(0);
        var companyList = enums.mentor.companyname.slice(0);
        var companyToImage = {}; //dictionary with mappings from each company's name to their image
        for (var i = 0; i < companyList.length; i++) {
            companyToImage[companyList[i]] = req.protocol + "://" + req.get("host") + "/img/logos/" + companyImages[i];
        }
        var sortedCompanyList = companyList.sort();
        var sortedCompanyImages = [];
        //Create sorted company images list using dictionary of mappings from a company's name to their image
        for (var j = 0; j < sortedCompanyList.length; j++) {
            sortedCompanyImages.push(companyToImage[sortedCompanyList[j]]);

        }
        callback(sortedCompanyList, sortedCompanyImages);
    }

    /**
     * Returns true if there is any intersection between a mentor's skills (mentorSkills) and the user's
     * skills (userSkills), false otherwise
     * @param mentorSkills string array representing mentor's skills
     * @param userSkills string array representing user's skills
     * @returns boolean whether or not there is an intersection between a mentor's skills and the user's skills
     */
    function _matchingSkills(mentorSkills, userSkills) {
        for (var i = 0; i < mentorSkills.length; i++) {
            for (var j = 0; j < userSkills.length; j++) {
                //Check equality of first five characters so there is a match between skills like "mobile app dev"
                //and "mobile applications"
                if (mentorSkills[i].toLowerCase().substring(0, 5) == userSkills[j].toLowerCase().substring(0, 5)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Return distance in miles between two coordinates/points
     * @param coordinate1 [lon,lat] coordinate pair of first point
     * @param coordinate2 [lon,lat] coordinate pair of second point
     * @returns {number} represents distance in miles between the two colleges
     */
    function _distanceBetweenPointsInMiles(coordinate1, coordinate2) {
        var radius = 3958.754641; // Radius of the earth in miles
        var dLat = (Math.PI / 180) * (coordinate2[1] - coordinate1[1]);
        var dLon = (Math.PI / 180) * (coordinate2[0] - coordinate1[0]);
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((Math.PI / 180) * (coordinate1[1])) *
            Math.cos((Math.PI / 180) * (coordinate2[1])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var distance = radius * c; // Distance in miles
        return distance;
    }

    /**
     * Find the bus assigned to the user or the nearest bus within a certain threshold. Returns the bus object, or null if no bus exists
     * @param done callback (err, res)
     * @private
     */
    function _findAssignedOrNearestBus(req, done) {
        var userbus = null;
        var closestdistance = null;
        if (req.user.internal.busOverride) {
            Bus.findOne({ _id: req.user.internal.busOverride }, function (err, bus) {
                if (err) {
                    console.error(err);
                }
                else if (bus) {
                    done(null, bus);
                }
                else {
                    console.error("ERROR: Missing bus on an overridden user");
                }
            });
        }
        else {
            Bus.find({}).exec(function (err, buses) {
                if (err) {
                    console.log(err);
                }
                //todo optimize this (see if it's possible to perform this operation in a single aggregation
                async.each(buses, function (bus, callback) {
                    async.each(bus.stops, function (stop, inner_callback) {
                        College.find({ $or: [{ "_id": stop.collegeid }, { "_id": req.user.school.id }] },
                            function (err, colleges) {
                                //The case when the query returns only one college because the college of the bus's stop
                                //is the same as the user's college
                                if (colleges.length === 1) {
                                    userbus = bus;
                                    userbus.message = "a bus stops at your school:";
                                    closestdistance = 0;
                                }
                                //The other case when the query returns two colleges because the college of the bus's
                                //stop is not the same as the user's college.
                                else if (colleges.length === 2) {
                                    //find the distance between two colleges
                                    var distanceBetweenColleges = _distanceBetweenPointsInMiles(
                                        colleges[0].loc.coordinates, colleges[1].loc.coordinates);
                                    if (distanceBetweenColleges <= MAX_BUS_PROXIMITY) {
                                        if (closestdistance === null || distanceBetweenColleges < closestdistance) {
                                            userbus = bus;
                                            //properly round to two decimal points
                                            var roundedDistance = Math.round((distanceBetweenColleges + 0.00001) *
                                                100) / 100;
                                            userbus.message = `a bus stops near your school at ${stop.collegename} ` +
                                                ` (roughly ${roundedDistance} miles away):`;
                                            closestdistance = distanceBetweenColleges;
                                        }
                                    }
                                }
                                inner_callback(err);
                            });
                    }, function (err) {
                        callback(err);
                    });
                }, function (err) {
                    if (err) {
                        console.log(err);
                        done(err, userbus);
                    }
                    else {
                        done(null, userbus);
                    }
                    //temporarily disable
                    //assumptions to check: no bus exists, bus has a bus captain, bus does not have more than one bus captaion
                    //todo consider storing bus captain info in bus
                    //todo optimize, query  { role: "Bus Captain", internal.busid: xxx } instead
                    /*
                     async.each(userbus.members, function (member, finalcallback) {
                     User.findOne({_id: member.id}, function (err, user) {
                     if (err) {
                     console.log(err);
                     }
                     else if (user.role == "bus captain") {
                     userbus.buscaptain = user;
                     }
                     finalcallback();
                     });
                     }, function (err) {
                     return done(null, userbus);
                     });
                     */
                });
            });
        }
    }

    return router;
};
