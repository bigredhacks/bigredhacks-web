"use strict";
var express = require('express');
var async = require('async');
var User = require('../models/user.js');
var enums = require('../models/enum.js');
var MentorRequest = require('../models/mentor_request');

module.exports = function (io) {
    var router = express.Router();

    /**
     * @api {GET} /mentor Mentor dashboard.
     * @apiName Mentor
     * @apiGroup Mentor
     */
    router.get('/', function (req, res, next) {
        return res.redirect('/mentor/dashboard');
    });

    /**
     * @api {GET} /mentor/dashboard Dashboard of logged in mentor.
     * @apiName Mentor
     * @apiGroup Mentor
     */
    router.get('/dashboard', function (req, res, next) {
        res.render('mentor/index', {
            user: req.user,
            enums: enums,
            error: req.flash('error'),
            title: "Dashboard Home"
        });
    });

    /**
     * @api {POST} /mentor/updateinformation Update mentor's info
     * @apiName UpdateInformation
     * @apiGroup Mentor
     */
    router.post('/updateinformation', function (req, res) {
        var user = req.user;

        var splitSkills = req.body.skills.split(",");
        var skillList = [];
        for (var i = 0; i < splitSkills.length; i++) {
            if (splitSkills[i].trim() != "") {
                skillList.push(splitSkills[i].trim());
            }
        }
        user.mentorinfo.skills = skillList;
        user.mentorinfo.bio = req.body.bio;
        user.save(function(err) {
            if (err) {
                console.error(err);
                req.flash("error", "An error occurred. Try updating again in a bit.");
            }
            else {
                //redirect to dashboard home
                req.flash("success", "Information updated successfully.");
            }
            MentorRequest.find({}).exec(function (err, mentorRequests) {
                User.find({role: "mentor"}).exec(function (err, mentors) {
                    async.each(mentorRequests, function (mentorRequest, callback) {
                        var numMatchingMentors = 0;
                        async.each(mentors, function (mentor, callback2) {
                            if (_matchingSkills(mentor.mentorinfo.skills, mentorRequest.skills)) {
                                numMatchingMentors = numMatchingMentors + 1;
                            }
                            callback2();
                        }, function (err) {
                            if (err) console.error(err);
                            else {
                                mentorRequest.nummatchingmentors = numMatchingMentors;
                                mentorRequest.save(function (err) {
                                    if (err) console.error(err);
                                    else {
                                        User.findOne({_id: mentorRequest.user.id}, function (err, user) {
                                            if (err) console.error(err);
                                            else {
                                                var currentMentorRequest = {
                                                    mentorRequestPubid: mentorRequest.pubid,
                                                    nummatchingmentors: numMatchingMentors
                                                };
                                                io.sockets.emit("new number of mentors " + user.pubid, currentMentorRequest);
                                                callback();
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }, function (err) {
                        if (err) console.error(err);
                        res.redirect('/mentor/dashboard');
                    });
                });
            });
        });
    });

    /**
     * @api {GET} /mentor/requestsqueue See requests queue of mentor.
     * @apiName RequestQueue
     * @apiGroup Mentor
     */
    router.get('/dashboard/requestsqueue', function (req, res) {
        var user = req.user;
        MentorRequest.find({}).exec(function(err, mentorRequests) {
            var allRequests = [];
            async.each(mentorRequests, function(mentorRequest, callback) {
                mentorRequest.match = "no";
                if(_matchingSkills(user.mentorinfo.skills, mentorRequest.skills)) {
                    mentorRequest.match = "yes";
                }
                allRequests.push(mentorRequest);
                callback();
            }, function(err) {
                if (err) console.error(err);
                else {
                    res.render('mentor/requests_queue', {
                        user: user,
                        mentorRequests: allRequests,
                        title: "Requests Queue"
                    });
                }
            });
        });
    });

    /* Handles a mentor-triggered event */
    io.on('connection', function (socket) {
        //receive event of a mentor claiming or unclaiming a user request
        socket.on('set request status', function (setRequestStatus) {
            MentorRequest.findOne({pubid: setRequestStatus.mentorRequestPubid}, function (err, mentorRequest) {
                if (err) console.error(err);
                else {
                    User.findOne({pubid: setRequestStatus.mentorPubid}, function (err, mentorOfRequest) {
                        if (setRequestStatus.newStatus == "Claimed") {
                            mentorRequest.mentor.name = mentorOfRequest.name.first + " " + mentorOfRequest.name.last;
                            mentorRequest.mentor.company = mentorOfRequest.mentorinfo.company;
                            mentorRequest.mentor.id = mentorOfRequest.id;
                            mentorRequest.requeststatus = "Claimed";
                        } else if (setRequestStatus.newStatus == "Unclaimed") {
                            mentorRequest.mentor.name = null;
                            mentorRequest.mentor.company = null;
                            mentorRequest.mentor.id = null;
                            mentorRequest.requeststatus = "Unclaimed";
                        }
                        mentorRequest.save(function (err) {
                            if (err) console.error(err);
                            else {
                                var requestStatus = {
                                    mentorRequestPubid: setRequestStatus.mentorRequestPubid,
                                    mentorPubid: setRequestStatus.mentorPubid,
                                    newStatus: setRequestStatus.newStatus,
                                    nummatchingmentors: mentorRequest.nummatchingmentors,
                                    mentorInfo: {
                                        name: mentorOfRequest.name.first + " " + mentorOfRequest.name.last,
                                        company: mentorOfRequest.mentorinfo.company,
                                        companyImage: _getCompanyImage(mentorOfRequest.mentorinfo.company)
                                    }
                                };
                                User.findOne({_id: mentorRequest.user.id}, function (err, user) {
                                    if (err) console.error(err);
                                    else {
                                        User.find({role: 'mentor'}).exec(function (err, mentors) {
                                            if (err) console.error(err);
                                            else {
                                                async.each(mentors, function (mentor, callback) {
                                                    io.emit('new request status ' + mentor.pubid, requestStatus);
                                                    callback();
                                                }, function (err) {
                                                    if (err) console.error(err);
                                                    else {
                                                        io.emit('new request status ' + user.pubid, requestStatus);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    });
                }
            });
        });
    });

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
                if (mentorSkills[i].toLowerCase().substring(0, 5) == userSkills[j].toLowerCase().substring(0,5)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Returns the string representing the image url of a company (ex: img/logos/uber.png for Uber) given a company name
     * @param mentorCompany string representing company of a mentor
     * @returns string representing image url of company
     */
    function _getCompanyImage(mentorCompany) {
        var companyNameList = enums.mentor.companyname;
        var companyImageList = enums.mentor.companyimage;
        for (var i = 0; i < companyNameList.length; i++) {
            if (companyNameList[i] == mentorCompany) {
                return "/img/logos/" + companyImageList[i];
            }
        }
    }

    /**
     * @api {GET} /mentor/logout Logout the current mentor
     * @apiName Logout
     * @apiGroup Mentor
     */
    router.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    return router;
};