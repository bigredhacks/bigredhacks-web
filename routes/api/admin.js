"use strict";
var express = require('express');
var router = express.Router();
var async = require('async');
var mongoose = require('mongoose');
var app = require('../../app');

// Mongoose Models
var Colleges = require('../../models/college.js');
var Bus = require('../../models/bus.js');
var Team = require('../../models/team.js');
var User = require('../../models/user.js');
var Reimbursements = require('../../models/reimbursements.js');
var TimeAnnotation = require('../../models/time_annotation.js');
var Announcement = require('../../models/announcement.js');

var config = require('../../config.js');
var helper = require('../../util/routes_helper.js');
var middle = require('../middleware');
var email = require('../../util/email');

// All routes
router.patch('/user/:pubid/setStatus', setUserStatus);
router.patch('/team/:teamid/setStatus', setTeamStatus);
router.patch('/user/:email/setRole', setUserRole);

router.get('/np', getNoParticipation);
router.post('/np/set', setNoParticipation);

router.delete('/removeBus', removeBus);
router.put('/updateBus', updateBus);

router.post('/reimbursements/school', schoolReimbursementsPost);
router.patch('/reimbursements/school', schoolReimbursementsPatch);
router.delete('/reimbursements/school', schoolReimbursementsDelete);

router.patch('/user/:pubid/setRSVP', setRSVP);

router.patch('/user/:pubid/checkin', middle.requireDayof, checkInUser);
router.get('/users/checkin', getUsersPlanningToAttend);

router.post('/annotate', annotate);

router.post('/announcements', postAnnouncement);
router.delete('/announcements', deleteAnnouncement);

router.post('/rollingDecision', makeRollingAnnouncement);
router.get('/rollingDecision', getRollingAnnouncement);


/**
 * @api {PATCH} /api/admin/user/:pubid/setStatus Set status of a single user. Will also send an email to the user if their status changes from "Waitlisted" to "Accepted" and releaseDecisions is true
 * @apiname SetStatus
 * @apigroup Admin
 *
 * @apiParam {string="Rejected","Waitlisted","Accepted"} status New status to set
 * */
function setUserStatus(req, res, next) {
    User.findOne({pubid: req.params.pubid}, function (err, user) {
        if (err || !user) {
            console.log('Error: ' + err);
            return res.sendStatus(500);
        }
        else {
            user.internal.status =  req.body.status;

            // Redirect to home page
            user.save(function (err) {
                if (err) {
                    console.log(err);
                    return res.sendStatus(500);
                } else {
                    return res.sendStatus(200);
                }
            });

        }
    });
}

/**
 * @api {PATCH} /api/admin/team/:teamid/setStatus Set status of entire team
 * @apiname SetStatus
 * @apigroup Admin
 *
 * @apiParam {string="Rejected","Waitlisted","Accepted"} status New status to set
 * */
function setTeamStatus(req, res, next) {
    var id = mongoose.Types.ObjectId(req.params.teamid);
    Team.findById(id, function (err, team) {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        if (!team) {
            console.log("No such team found.");
            return res.sendStatus(500);
        }
        else {
            team.populate('members.id', function (err, team) {
                if (err) {
                    console.log(err);
                    return res.sendStatus(500);
                }
                else {
                    async.each(team.members, function (user, callback) {
                        user = user.id;
                        user.internal.status = req.body.status;
                        user.save(function (err) {
                            callback(err);
                        });
                    }, function (err) {
                        if (err) {
                            console.log(err);
                            return res.sendStatus(500);
                        }
                        else return res.sendStatus(200);
                    });

                }
            })
        }
    });
}

/**
 * @api {POST} /api/admin/user/:email/setRole Set role of a single user
 * @apiname setrole
 * @apigroup Admin
 *
 * @apiParam {string="user","admin"} role New role to set
 * */
function setUserRole(req, res, next) {
    User.findOne({email: req.params.email}, function (err, user) {
        if (err || !user) {
            return res.sendStatus(500);
        }
        else {
            user.role = req.body.role.toLowerCase();
            user.save(function (err) {
                if (err) return res.sendStatus(500);
                else return res.sendStatus(200);
            });
        }
    });
}

/**
 * @api {PATCH} /api/admin/rollingDecision Publish decisions to all who have had one made and not received it yet.
 */
function makeRollingAnnouncement(req, res, next) {
    User.find( {$and : [ { $where: "this.internal.notificationStatus != this.internal.status" }, {"internal.status": { $ne: "Pending"}}]} , function (err, recipient) {
        if (err) console.log(err);
        else {
            async.each(recipient, function(recip, callback) {
                var config = {
                    "from_email": "info@bigredhacks.com",
                    "from_name": "BigRed//Hacks",
                    "to": {
                        "email": recip.email,
                        "name": recip.name.first + " " + recip.name.last
                    }
                };

                email.sendDecisionEmail(recip.name.first, recip.internal.notificationStatus, recip.internal.status, config, function(err) {
                    if (err)  {
                        console.log(err);
                        callback(err);
                    } else {
                        recip.internal.notificationStatus = recip.internal.status;
                        recip.internal.lastNotifiedAt = Date.now();
                        recip.save(function(err) {
                            if (err) {
                                console.log(err);
                                console.log("ERROR: User with email " + recip.email + " has been informed of their new status, but that was not saved in the database!");
                            } else {
                                console.log('sent and saved');
                            }
                        });
                        callback();
                    }
                })
            }, function(err) {
                if (err) {
                    console.log(err);
                    res.sendStatus(500);
                } else {
                    console.log('All transactional decision emails successfully sent!');
                    req.flash('success', 'All transactional decision emails successfully sent!');
                    return res.redirect('/admin/dashboard');
                }
            });
        }
    });
}

/**
 * @api {GET} /api/np Checks whether a user is in no-participation mode
 * @apiName CheckNP
 * @apiGroup Admin
 *
 * @apiSuccess (200) {Boolean} true
 * @apiError (200) {Boolean} false
 */
function getNoParticipation(req, res, next) {
    res.send(req.session.np);
}

/**
 * @api {POST} /api/admin/np/set Enable/disable no participation mode
 * @apiName SetNP
 * @apiGroup Admin
 *
 * @apiParam {boolean} state New np state to set
 *
 */
function setNoParticipation(req, res, next) {
    req.session.np = req.body.state;
    res.sendStatus(200);
}

/**
 * @api {DELETE} /api/admin/removeBus Remove bus from list of buses.
 * @apiName RemoveBus
 * @apiGroup Admin
 *
 * @apiError (500) BusDoesntExist
 */
function removeBus(req, res, next) {
    Bus.remove({_id: req.body.busid}, function (err) {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        else return res.sendStatus(200);
    });
}

/**
 * @api {POST} /api/admin/updateBus update bus in list of buses.
 * @apiName UpdateBus
 * @apiGroup Admin
 *
 * @apiError DBError
 * @apiError BusNotFound
 */
function updateBus(req, res, next) {
    Bus.findOne({_id: req.body.busid}, function (err, bus) {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }

        bus.name = req.body.busname; //bus route name
        bus.stops = req.body.stops;
        bus.capacity = parseInt(req.body.buscapacity);
        bus.save(function (err) {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            }
            else return res.sendStatus(200);
        });
    });
}

/**
 * @api {POST} /api/admin/reimbursements/school Sets a reimbursement for the school.
 * @apiName ReimbursementSchool
 * @apiGroup Admin
 *
 * @apiParam {Number} collegeid A number matching our internal collegeId mappings.
 * @apiParam {Number} amount How much to reimburse.
 * @apiParam {String} college Name of the college.
 * @apiParam travel Medium of travel.
 *
 * @apiError (500) EntryAlreadyExists
 * @apiError (500) FailureToSave
 */
function schoolReimbursementsPost(req, res) {
    Reimbursements.findOne({'college.id': req.body.collegeid}, function (err, rem) {
        console.log(req.body);
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }

        if (rem) {
            console.log("Entry already exists.");
            return res.sendStatus(500);
        }
        else {
            //todo couple these
            var newRem = new Reimbursements({
                college: {
                    id: req.body.collegeid,
                    name: req.body.college
                },
                mode: req.body.travel,
                amount: req.body.amount
            });
            newRem.save(function (err) {
                if (err) {
                    console.log(err);
                    return res.sendStatus(500);
                }
                else return res.sendStatus(200);
            })
        }
    })
}

/**
 * @api {PATCH} /api/admin/reimbursements/school Sets a reimbursement for the school.
 * @apiName ReimbursementSchool
 * @apiGroup Admin
 *
 * @apiParam {Number} collegeid A number matching our internal collegeId mappings.
 * @apiParam {Number} amount How much to reimburse.
 * @apiParam travel Medium of travel.
 *
 * @apiError (500) EntryAlreadyExists
 * @apiError (404) NoInfoInRequestBody
 */
function schoolReimbursementsPatch(req, res) {
    Reimbursements.findOne({"college.id": req.body.collegeid}, function (err, rem) {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        if (res == null) {
            return res.sendStatus(404);
        }
        rem.mode = req.body.travel;
        rem.amount = req.body.amount;
        rem.save(function (err, rem) {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            }
            else {
                return res.sendStatus(200);
            }
        });

    })
}

/**
 * @api {DELETE} /api/admin/reimbursements/school Delete reimbursements for a school
 * @apiName ReimbursementSchool
 * @apiGroup Admin
 *
 * @apiParam {Number} collegeid A number matching our internal collegeId mappings.
 *
 * @apiError (500) CouldNotFind
 */
function schoolReimbursementsDelete(req, res) {
    Reimbursements.remove({'college.id': req.body.collegeid}, function (err, rem) {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        return res.sendStatus(200);
    })
}

/**
 * @api {PATCH} /api/admin/user/:pubid/setRSVP Sets the RSVP status of the user in params.pubid to body.going.
 * @apiName SetRSVP
 * @apiGroup Admin
 *
 * @apiParam {Boolean} going Decision of user.
 */
function setRSVP(req, res) {
    var going = normalize_bool(req.body.going);
    if (going === "") {
        going = null;
    }

    //todo only allow changing if user is accepted
    User.findOne({pubid: req.params.pubid}, function (err, user) {
        if (err || !user) {
            return res.sendStatus(500);
        }
        else {
            user.internal.going = going;
            user.save(function (err) {
                if (err) return res.sendStatus(500);
                else return res.sendStatus(200);
            });
        }
    });
}

/**
 * @api {PATCH} /api/admin/user/:pubid/checkin Sets params.pubid as to body.checkedin. Can be used to check a user in (for 2016 TODO).
 * @apiName CheckInUser
 * @apiGroup Admin
 *
 * @apiParam checkedIn True if user has checked into the hackathon.
 */
function checkInUser(req, res, next) {
    User.findOne({pubid: req.params.pubid}, function (err, user) {
        if (err || !user) {
            return res.sendStatus(500);
        }
        else {
            user.internal.checkedin = normalize_bool(req.body.checkedin);
            user.internal.going = true;
            console.log(user.internal.checkedin);
            user.save(function (err) {
                if (err) return res.sendStatus(500);
                else return res.sendStatus(200);
            });
        }
    });
}

/**
 * @api {GET} /api/admin/users/checkin Finds all users who are eligible to be checked in (either planned on going or are from Cornell)
 * @apiName GetUsersPlanningToAttend
 * @apiGroup Admin
 *
 * @apiSuccess Users All users who match the criteria with name, pubid, email, school, and internal.checkedin
 */
function getUsersPlanningToAttend(req, res, next) {
    var project = "name pubid email school internal.checkedin";
    User.find({$or: [{"internal.going": true}, {"internal.cornell_applicant": true}]}).select(project).exec(function (err, users) {
        if (err) {
            res.status(500).send(null);
        }
        else {
            res.send(users);
        }
    })
}


/**
 * @api {POST} /api/admin/announcements Create a new announcement and posts it to (TODO) website, mobile, facebook, and twitter
 * @apiName POSTAnnouncements
 * @apiGroup Announcements
 *
 * @apiParam {String} message Body of the message
 */
function postAnnouncement(req, res, next) {
    console.log(req.body);
    var newAnnouncement = new Announcement({
        message: req.body.message
    });
    newAnnouncement.save(function (err, doc) {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        }
        else {
            // Broadcast announcement
            var io = require('../../app').io;
            io.emit('announcement', req.body.message);
            req.flash('success','Announcement made!');
            return res.redirect('/admin/dashboard');
        }
    });
}


/**
 * @api {DELETE} /api/admin/announcements Delete an announcement
 * @apiName DELETEAnnouncements
 * @apiGroup Announcements
 *
 * @apiParam {String} _id The unique mongo id for the announcement
 */
function deleteAnnouncement(req, res, next) {
    Announcement.remove({_id: req.body._id}, function (err) {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        else return res.sendStatus(200);
    });
}


/**
 * @api {POST} /api/admin/annotate Add an annotation to the timeline
 * @apiName Annotate
 * @apiGroup Admin
 *
 * @apiParam {String} annotation The message for the annotation
 * @apiParam {Date} time (Optional) time of annotation
 *
 */
function annotate(req, res, next) {
    var newAnnotation = new TimeAnnotation({
        time: (req.body.time) ? req.body.time : Date.now(),
        info: req.body.annotation
    });

    newAnnotation.save(function (err, doc) {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        }
        else {
            return res.redirect('/admin/stats');
        }
    });
}


/**
 * Converts a bool/string to a bool. Otherwise returns the original var.
 */
function normalize_bool(string) {
    if (typeof string === "boolean") return string;
    if (string.toLowerCase() == "true") {
        return true;
    }
    else if (string.toLowerCase() == "false") {
        return false;
    }
    return string;
}

module.exports = router;
