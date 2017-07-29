"use strict";
var express = require('express');
var router = express.Router();
var async = require('async');
var mongoose = require('mongoose');
var app = require('../../app');

const FCM = require('fcm-push');

// Mongoose Models
var Colleges = require('../../models/college.js');
var Bus = require('../../models/bus.js');
var Team = require('../../models/team.js');
var User = require('../../models/user.js');
var Reimbursements = require('../../models/reimbursements.js');
var TimeAnnotation = require('../../models/time_annotation.js');
var Announcement = require('../../models/announcement.js');
var Inventory = require('../../models/hardware_item.js');
var InventoryTransaction = require('../../models/hardware_item_checkout.js');
var HardwareItemTransaction = require('../../models/hardware_item_transaction.js');
var MentorAuthorizationKey = require('../../models/mentor_authorization_key');
var ScanEvent = require('../../models/scan_event');

var config = require('../../config.js');
var helper = require('../../util/routes_helper.js');
var middle = require('../middleware');
var email = require('../../util/email');
var socketutil = require('../../util/socketutil');
var OAuth = require('oauth');
var util = require('../../util/util.js');

var Twitter = require('twitter');

// All routes
router.patch('/user/:pubid/setStatus', setUserStatus);
router.patch('/team/:teamid/setStatus', setTeamStatus);
router.patch('/user/:email/setRole', setUserRole);

router.delete('/user/removeUser', removeUser);

router.get('/np', getNoParticipation);
router.post('/np/set', setNoParticipation);

router.delete('/removeBus', removeBus);
router.put('/updateBus', updateBus);

router.get('/csvBus', csvBus);

router.post('/busCaptain', setBusCaptain);
router.delete('/busCaptain', deleteBusCaptain);

router.post('/confirmBus', busConfirmationHandler(true));
router.delete('/confirmBus', busConfirmationHandler(false));

router.put('/busOverride', setBusOverride);
router.delete('/busOverride', deleteBusOverride);

router.post('/reimbursements/school', schoolReimbursementsPost);
router.patch('/reimbursements/school', schoolReimbursementsPatch);
router.delete('/reimbursements/school', schoolReimbursementsDelete);
router.post('/reimbursements/student', studentReimbursementsPost);
router.delete('/reimbursements/student', studentReimbursementsDelete);

router.patch('/user/:pubid/setRSVP', setRSVP);

router.patch('/user/:pubid/checkin', middle.requireDayof, checkInUser);
router.get('/users/checkin', getUsersPlanningToAttend);

router.post('/annotate', annotate);

router.post('/announcements', postAnnouncement);
router.delete('/announcements', deleteAnnouncement);

router.post('/rollingDecision', makeRollingAnnouncement);

router.post('/deadlineOverride', rsvpDeadlineOverride);

router.post('/hardware/transaction', transactHardware);
router.post('/hardware/inventory', setInventory);

router.post('/cornellLottery', cornellLottery);
router.post('/cornellWaitlist', cornellWaitlist);

router.post('/makeKey', makeKey);

router.post('/qrScan', scanQR);
router.post('/makeEvent', makeEvent);

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
            user.internal.status = req.body.status;

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
 * @api {DELETE} /api/admin/user/removeUser Remove a single user from database.
 *
 * @apiName RemoveUser
 * @apiGroup Admin
 *
 * @apiParam {String} pubid
 */
function removeUser(req, res, next) {
    User.findOne({pubid: req.body.pubid}, function (err, user) {
        if (err) {
            console.error(err);
            req.flash('error', 'An error occurred while finding the user');
            return res.status(500).send(err);
        }
        if (!user) {
            req.flash('error', 'Cannot find user with this pubid');
            return res.status(500).send('User not found! ');
        }
        else {
            user.remove({'pubid': req.body.pubid}, function (err) {
                if (err) {
                    console.error('Remove error: ' + err);
                    return res.sendStatus(500);
                }
                else {
                    console.log('Success: removed user ' + req.body.pubid);
                    req.flash('success', 'Successfully removed user '+ req.body.pubid);
                    res.sendStatus(200);
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
    const DAYS_TO_RSVP = Number(config.admin.days_to_rsvp);
    const WAITLIST_ID = config.mailchimp.l_cornell_waitlisted;
    const ACCEPTED_ID = config.mailchimp.l_cornell_accepted;
    User.find({$and: [{$where: "this.internal.notificationStatus != this.internal.status"}, {"internal.status": {$ne: "Pending"}}]}, function (err, recipient) {
        if (err) console.log(err);
        else {
            // Do not want to overload by doing too many requests, so this will limit the async
            const maxRequestsAtATime = 3;
            async.eachLimit(recipient, maxRequestsAtATime, function (recip, callback) {
                var config = {
                    "from_email": "info@bigredhacks.com",
                    "from_name": "BigRed//Hacks",
                    "to": {
                        "email": recip.email,
                        "name": recip.name.first + " " + recip.name.last
                    }
                };

                email.sendDecisionEmail(recip.name.first, recip.internal.notificationStatus, recip.internal.status, config, function (err) {
                    if (err) {
                        return callback(err);
                    } else {
                        recip.internal.notificationStatus = recip.internal.status;
                        recip.internal.lastNotifiedAt = Date.now();
                        recip.internal.daysToRSVP = DAYS_TO_RSVP;

                        async.parallel([
                            function saveUser(cb) {
                                recip.save(cb);
                            },
                            function offWaitlist(cb) {
                                if (recip.internal.cornell_applicant && recip.internal.status == 'Accepted') {
                                    // We can get errors for non-termination reasons, so callback will only log error
                                    helper.removeSubscriber(WAITLIST_ID, recip.email, function (err) {
                                        if (err) {
                                            console.error(err);
                                        }
                                        cb();
                                    });
                                } else {
                                    cb();
                                }
                            },
                            function onAcceptedList(cb) {
                                if (recip.internal.cornell_applicant && recip.internal.status == 'Accepted') {
                                    // We can get errors for non-termination reasons, so callback will only log error
                                    helper.addSubscriber(ACCEPTED_ID, recip.email, recip.name.first, recip.name.last, function (err) {
                                        if (err) {
                                            console.error(err);
                                        }
                                        cb();
                                    });
                                } else {
                                    cb();
                                }
                            }
                        ], function (err) {
                            return void callback(err);
                        });
                    }
                })
            }, function (err) {
                if (err) {
                    console.error('An error occurred with decision emails. Decision sending was terminated. See the log for remediation: ' + err);
                    req.flash('error', 'An error occurred. Check the logs!');
                    res.sendStatus(500);
                } else {
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
 * @api {POST} /api/admin/confirmBus Set a route to confirmed.
 * @apiName ConfirmBus
 * @apiGroup Admin
 *
 * @apiParam {String} busid
 * @apiError (500) BusDoesntExist
 *
 * @api {DELETE} /api/admin/confirmBus Set a route back to tentative.
 * @apiName UnconfirmBus
 * @apiGroup Admin
 *
 * @apiParam {String} busid
 * @apiError (500) BusDoesntExist
 */
function busConfirmationHandler(confirm) {
    return function (req, res, next) {
        Bus.findOne({_id: req.body.busid}, function (err, bus) {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!bus) {
                return res.status(500).send('Bus not found!');
            }

            bus.confirmed = confirm;
            bus.save(util.dbSaveCallback(res));
        });
    };
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
        bus.customMessage = req.body.customMessage;
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
 * @api {POST} /api/admin/busCaptain Set the captain of a bus.
 * @apiName SetBusCaptain
 * @apiGroup Admin
 *
 * @apiParam {String} email The email of the captain.
 * @apiParam {String} routeName The name of the bus route.
 */
function setBusCaptain(req, res, next) {
    const email = req.body.email;
    const routeName = req.body.routeName;

    if (!email || !routeName) {
        return res.sendStatus(500);
    }

    async.series({
        captain: function (callback) {
            User.findOne({"email": email}, callback);
        },
        bus: function (callback) {
            Bus.findOne({"name": routeName}, callback);
        }
    }, function assignCaptain(err, results) {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }

        let captain = results.captain;
        let bus = results.bus;

        if (bus.captain.name) {
            res.status(500).send('Bus already has a captain');
        } else if (captain && captain.internal.busid != bus.id) {
            res.status(500).send('User has not signed up for that bus');
        } else {
            bus.captain.name = captain.name.first + " " + captain.name.last;
            bus.captain.email = captain.email;
            bus.captain.college = captain.school.name;
            bus.captain.id = captain.id;

            captain.internal.busCaptain = true;

            bus.save(function (err) {
                if (err) {
                    console.error(err);
                    res.sendStatus(500);
                } else {
                    captain.save(function (err) {
                        if (err) {
                            console.error(err);
                            res.sendStatus(500);
                        } else {
                            res.redirect('/admin/businfo');
                        }
                    });
                }
            });
        }
    });
}

/**
 * @api {DELETE} /api/admin/busCaptain Unset the captain of a bus.
 * @apiName UnsetBusCaptain
 * @apiGroup Admin
 *
 * @apiParam {String} email The email of the captain.
 */
function deleteBusCaptain(req, res, next) {
    const email = req.body.email;

    if (!email) {
        return res.status(500).send('Missing email');
    }

    async.series({
        captain: function (callback) {
            User.findOne({"email": email}, callback);
        },
        bus: function (callback) {
            Bus.findOne({"captain.email": email}, callback);
        }
    }, function removeCaptain(err, results) {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }

        if (!results.bus || !results.captain) {
            return res.status(500).send('Could not find bus or captain');
        }

        var captain = results.captain;
        var bus = results.bus;

        bus.captain.name = null;
        bus.captain.email = null;
        bus.captain.college = null;
        bus.captain.id = null;

        captain.internal.busCaptain = false;

        bus.save(function (err) {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else {
                captain.save(function (err) {
                    if (err) {
                        console.error(err);
                        return res.sendStatus(500);
                    } else {
                        return res.sendStatus(200);
                    }
                });
            }
        });
    });
}

/**
 * @api {PUT} /api/admin/busOverride Override the bus associated with a rider. If the rider is already signed up for a bus,
 *                                   this will remove the rider from that bus in the process.
 * @apiName SetBusOverride
 * @apiGroup Admin
 *
 * @apiParam {String} email The email of the rider.
 * @apiParam {String} routeName The name of the new route for the user
 */
function setBusOverride(req, res, next) {
    const email = req.body.email;
    const routeName = req.body.routeName;

    if (!email || !routeName) {
        return res.status(500).send('Missing email or route name');
    }

    User.findOne({"email": email}, function (err, user) {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        } else if (!user) {
            return res.status(500).send('No such user');
        }

        if (user.internal.busid) {
            // User has already RSVP'd for a bus, undo this
            var fakeRes = {};
            fakeRes.sendStatus = function (status) {
            }; // FIXME: Refactor to not use a void function
            util.removeUserFromBus(Bus, req, fakeRes, user);
        }

        // Confirm bus exists
        Bus.findOne({name: req.body.routeName}, function (err, bus) {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!bus) {
                return res.status(500).send('No such bus route');
            }

            user.internal.busOverride = bus._id;
            user.save(util.dbSaveCallback(res));
        });
    });
}

/**
 * @api {DELETE} /api/admin/busOverride Unset the override for a bus rider. If the rider is already signed up for a bus,
 *                                      this will remove the rider from that bus in the process.
 *
 * @apiName UnsetBusOverride
 * @apiGroup Admin
 *
 * @apiParam {String} email The email of the rider.
 */
function deleteBusOverride(req, res, next) {
    const email = req.body.email;

    if (!email) {
        return res.status(500).send('Missing email');
    }

    User.findOne({"email": email}, function (err, user) {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        } else if (!user) {
            return res.status(500).send('No such user');
        }

        if (user.internal.busid) {
            // User has already RSVP'd for a bus, undo this
            var fakeRes = {};
            fakeRes.sendStatus = function (status) {
            }; // FIXME: Refactor to not use a void function
            util.removeUserFromBus(Bus, req, fakeRes, user);
        }

        user.internal.busOverride = null;
        user.save(util.dbSaveCallback(res));
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
    User.find({$or: [{"internal.status": {$ne: "Rejected"}}, {"internal.going": {$ne: false}},{"internal.cornell_applicant": true}]}).select(project).exec(function (err, users) {
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
 * @apiParam web post to web
 * @apiParam mobile post to mobile
 * @apiParam facebook post to facebook
 * @apiParam twitter post to twitter
 */
function postAnnouncement(req, res, next) {
    const message = req.body.message;

    var newAnnouncement = new Announcement({
        message: message
    });

    if (message.length > 140 && req.body.twitter) {
        console.log('Did not post: character length exceeded 140 and twitter was enabled');
        req.flash('error', 'Character length exceeds 140 and you wanted to post to Twitter.');
        return res.redirect('/admin/dashboard');
    }

    newAnnouncement.save(function (err, doc) {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        }
        else {
            // Broadcast announcement
            if (req.body.web) {
                socketutil.announceWeb(req.body.message);
            }

            if (req.body.mobile) {
                var serverkey = config.firebase.key;
                var fcm = new FCM(serverkey);

                var message = {
                    to : '/topics/cats',
                    notification : {
                        title : req.body.message
                    }
                };

                fcm.send(message, function(err,response){
                });
            }

            if (req.body.twitter) {
                var OAuth2 = OAuth.OAuth2;
                var oauth2 = new OAuth2(config.twitter.tw_consumer_key,
                    config.twitter.tw_consumer_secret,
                    'https://api.twitter.com/',
                    null,
                    'oauth2/token',
                    null);
                oauth2.getOAuthAccessToken(
                    '',
                    {'grant_type': 'client_credentials'},
                    function (e, access_token, refresh_token, results) {
                        if (e) {
                            console.log('Twitter OAuth Error: ' + e);
                        } else {
                            var twitter_client = new Twitter({
                                consumer_key: config.twitter.tw_consumer_key,
                                consumer_secret: config.twitter.tw_consumer_secret,
                                access_token_key: config.twitter.tw_access_token,
                                access_token_secret: config.twitter.tw_token_secret
                            });
                            twitter_client.post('statuses/update', {status: req.body.message}, function (error, tweet, response) {
                                if (error) {
                                    console.log('Tweeting error: ' + error);
                                    console.log(tweet);
                                    console.log(response);
                                }
                            });
                        }
                    });
            }

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
    // format the date
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
 * @api {POST} /api/admin/reimbursements/student Update or set a student reimbursement
 * @apiName PostReimbursement
 * @apiGroup Admin
 *
 * @apiParam {String} email
 * @apiParam {Number} amount
 */
function studentReimbursementsPost(req, res, next) {
    User.findOne({email: req.body.email}, function (err, user) {
        if (err) {
            console.log('Reimbursement Error: ' + err); // If null, check amount
            res.status(500).send('Reimbursement Error: ' + err);
        } else if (!req.body.amount || req.body.amount < 0) {
            res.status(500).send("Missing amount or amount is less than zero");
        } else if (!user) {
            res.status(500).send("No such user");
        } else {
            user.internal.reimbursement_override = req.body.amount;
            user.save(function (err) {
                if (err) {
                    console.log(err);
                    res.status(500).send("Could not save user");
                } else {
                    res.sendStatus(200);
                }
            });
        }
    });
}

/**
 * @api {DELETE} /api/admin/reimbursements/student Reset a student reimbursement to school default
 * @apiName DeleteReimbursement
 * @apiGroup Admin
 *
 * @apiParam {String} email
 */
function studentReimbursementsDelete(req, res, next) {
    if (!req.body.email) {
        return res.status(500).send("Email required");
    }

    User.findOne({email: req.body.email}, function (err, user) {
        if (err) {
            console.log('ERROR on delete: ' + err);
            res.status(500).send("Error on delete: " + err)
        } else if (!user) {
            res.status(500).send("No such user");
        } else {
            user.internal.reimbursement_override = 0;
            user.save(function (err) {
                if (err) {
                    console.log('Error saving user: ' + err);
                    res.status(500).send('Error saving user: ' + err);
                } else {
                    res.sendStatus(200);
                }
            });
        }
    });
}

/**
 * @api {POST} /api/admin/rsvpDeadlineOverride Override the RSVP deadline of the given user
 * @apiname DeadlineOverride
 * @apigroup Admin
 *
 * @apiParam {String} email
 * @apiParam {Number} daysToRSVP
 **/
function rsvpDeadlineOverride(req, res, next) {
    if (!req.body.email || !req.body.daysToRSVP) {
        return res.status(500).send('Need email and daysToRSVP');
    } else if (req.body.daysToRSVP <= 0) {
        return res.status(500).send('Need positive daysToRSVP value');
    }

    User.findOne({email: req.body.email}, function (err, user) {
        if (err) {
            return res.status(500).send(err);
        } else if (!user) {
            return res.status(500).send('No such user');
        }

        user.internal.daysToRSVP = req.body.daysToRSVP;
        user.save(util.dbSaveCallback(res));
    });
}

/**
 * @api {POST} /api/admin/hardware/inventory Set our internal hardware inventory.
 * @apiname TransactHardware
 * @apigroup Admin
 *
 * TODO: This method is a bit messy. Should be refactored in the future. (#178)
 *
 * @apiParam {Number} quantity The quantity of hardware we own
 * @apiParam {String} name The unique name of the hardware
 **/
function setInventory(req, res, next) {
    let body = req.body;
    body.quantity = Number(body.quantity);
    if (!body || body.quantity === undefined || !body.name || isNaN(body.quantity)) {
        return res.status(500).send('Missing quantity or name');
    }

    if (body.quantity <= 0) {
        Inventory.find({name: body.name}).remove(function (err, result) {
            if (err) {
                return res.status(500).send(err);
            }

            return res.redirect('/admin/hardware');
        });
    } else {
        Inventory.findOne({name: body.name}, function (err, item) {
            if (err) {
                return res.status(500).send(err);
            }

            if (!item) {
                item = new Inventory({
                    name: body.name,
                    quantityAvailable: body.quantity,
                    quantityOwned: body.quantity
                });
            }

            item.modifyOwnedQuantity(body.quantity, function (err) {
                if (err) {
                    return res.status(500).send(err);
                }

                return res.redirect('/admin/hardware');
            });
        });
    }
}

/**
 * @api {POST} /api/admin/hardware/transaction Check in or out hardware
 * @apiname TransactHardware
 * @apigroup Admin
 *
 * @apiParam {Boolean} checkingOut true if checking out, false if checking in
 * @apiParam {String} email Email of the student for the transaction
 * @apiParam {Number} quantity The quantity of hardware to transact
 * @apiParam {String} name The unique name of the hardware being transacted
 **/
function transactHardware(req, res, next) {
    var body = req.body;
    if (!body.email || body.quantity === undefined || !body.name) {
        return res.status(500).send('Missing a parameter, check the API!');
    }

    body.checkingOut = body.checkingOut !== undefined;

    body.quantity = Number(body.quantity); // This formats as a string by default

    if (body.quantity < 1 || isNaN(body.quantity)) {
        return res.status(500).send('Please send a positive quantity');
    }

    async.parallel({
        student: function (cb) {
            User.findOne({email: body.email}, cb);
        },
        item: function (cb) {
            Inventory.findOne({name: body.name}, cb);
        }
    }, function (err, result) {
        if (err) {
            return res.status(500).send(err);
        } else if (!result.student) {
            return res.status(500).send('No such user');
        } else if (!result.item) {
            return res.status(500).send('No such item');
        }

        InventoryTransaction.findOne({
            student_id: result.student.id,
            inventory_id: result.item.id
        }, function (err, transaction) {
            if (err) {
                return res.status(500).send(err);
            }

            if (body.checkingOut) {
                if (result.item.quantityAvailable - body.quantity >= 0) {
                    if (!transaction) {
                        transaction = new InventoryTransaction({
                            student_id: result.student.id,
                            inventory_id: result.item.id,
                            quantity: 0
                        });
                    }

                    transaction.quantity += body.quantity;

                    result.item.addQuantity(-body.quantity, function (err) {
                        if (err) {
                            return res.status(500).send(err);
                        }

                        transaction.save(function (err) {
                            if (err) {
                                return res.status(500).send('Error: could not save transaction');
                            }

                            email.sendHardwareEmail(
                                true,
                                body.quantity,
                                result.item.name,
                                result.student.name.first,
                                result.student.name.last,
                                result.student.email,
                                function (err) {
                                    if (err) {
                                        return res.status(500).send('Error: could not send hardware transaction email');
                                    }

                                    HardwareItemTransaction.make(result.item.name, result.student._id, body.quantity, true, function (err) {
                                        if (err) {
                                            return res.status(500).send('Error: Could not store hardware transaction. Please log on paper');
                                        }

                                        req.flash('success', 'Checked out ' + body.quantity + ' ' + result.item.name);
                                        return res.redirect('/admin/hardware');
                                    });
                                });
                        });
                    });
                } else {
                    return res.status(500).send('Quantity exceeds availability');
                }
            } else {
                if (!transaction) {
                    return res.status(500).send('User has no transactions for that item.');
                } else if (body.quantity > transaction.quantity) {
                    return res.status(500).send('User has not checked out that many items of that type!');
                }

                transaction.quantity -= body.quantity;

                result.item.addQuantity(body.quantity, function (err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Could not save item');
                    }
                    email.sendHardwareEmail(
                        false,
                        body.quantity,
                        result.item.name,
                        result.student.name.first,
                        result.student.name.last,
                        result.student.email,
                        function (err) {
                            if (err) {
                                return res.status(500).send('Error: could not send hardware transaction email');
                            }

                            if (transaction.quantity == 0) {
                                transaction.remove(function (err) {
                                    if (err) {
                                        return res.status(500).send('Error: could not remove transaction');
                                    }

                                    HardwareItemTransaction.make(result.item.name, result.student._id, body.quantity, false, function (err) {
                                        if (err) {
                                            return res.status(500).send('Error: Could not store hardware transaction. Please log on paper');
                                        }

                                        req.flash('success', 'Returned ' + body.quantity + ' ' + result.item.name);
                                        return res.redirect('/admin/hardware');
                                    });
                                });
                            } else {
                                transaction.save(function (err) {
                                    if (err) {
                                        return res.status(500).send('Error: could not save transaction');
                                    }

                                    HardwareItemTransaction.make(result.item.name, result.student._id, body.quantity, false, function (err) {
                                        if (err) {
                                            return res.status(500).send('Error: Could not store hardware transaction. Please log on paper');
                                        }

                                        req.flash('success', 'Returned ' + body.quantity + ' ' + result.item.name);
                                        return res.redirect('/admin/hardware');
                                    });
                                });
                            }
                        });
                });
            }
        });
    });
}

/**
 * @api {POST} /api/admin/cornellLottery Executes a gender-balanced (50-50) lottery for Cornell students, but does not send decision emails.
 *              If, by some chance, the lottery runs out of a gender to accept, it falls back to accepting other genders.
 *              Non-male-or-female genders are grouped under male for the purpose of preventing system-gaming and stats-ruining.
 *              All non-accepted students are moved to waitlist.
 * @apiname CornellLottery
 * @apigroup Admin
 *
 * @apiParam {Number} numberToAccept
 **/
function cornellLottery(req, res, next) {
    if (!req.body.numberToAccept || req.body.numberToAccept < 0) {
        return res.status(500).send('Please provide a numberToAccept >= 0');
    }
    // Find all non-accepted Cornell students
    User.find({
        $and: [
            {'internal.cornell_applicant': true},
            {'internal.status': {$ne: 'Accepted'}},
            {'internal.status': {$ne: 'Rejected'}}
        ]
    }, function (err, pendings) {
        if (err) {
            console.error(err);
            return res.status(500).send(err);
        }

        // Filter into sets for making decisions
        let notFemale = [];
        let female = [];
        pendings.forEach(function (user) {
            if (user.gender == "Female") {
                female.push(user);
            } else {
                notFemale.push(user);
            }
        });

        let accepted = [];
        while (accepted.length < req.body.numberToAccept && (female.length || notFemale.length)) {
            let _drawLottery = function _drawLottery(pool) {
                if (pool.length > 0) {
                    let randomIndex = Math.floor((Math.random() * pool.length));
                    let winner = pool[randomIndex];
                    accepted.push(winner);
                    pool.splice(randomIndex, 1);
                }
            };

            _drawLottery(female);
            if (accepted.length >= req.body.numberToAccept) break;
            _drawLottery(notFemale);
        }

        // Save decisions
        accepted.forEach(function (x) {
            x.internal.status = 'Accepted'
        });
        notFemale.forEach(function (x) {
            x.internal.status = 'Waitlisted'
        });
        female.forEach(function (x) {
            x.internal.status = 'Waitlisted'
        });

        async.parallel([
            function (cb) {
                async.each(accepted, function (user, callback) {
                    user.save(callback)
                }, cb);
            },
            function (cb) {
                async.each(notFemale, function (user, callback) {
                    user.save(callback)
                }, cb);
            },
            function (cb) {
                async.each(female, function (user, callback) {
                    user.save(callback)
                }, cb);
            }
        ], function (err) {
            if (err) {
                console.error('ERROR in lottery: ' + err);
                req.flash('error', 'Error in lottery');
                return res.redirect('/admin/dashboard');
            }

            req.flash('success', 'Lottery successfully performed. ' + accepted.length + ' have been accepted.');
            return res.redirect('/admin/dashboard');
        });
    });
}

/**
 * @api {POST} /api/admin/cornellWaitlist Moves numberToAccept Cornell students out of waitlist and into accepted pool in app date order.
 * @apiname CornellWaitlist
 * @apigroup Admin
 *
 * @apiParam {Number} numberToAccept
 **/
function cornellWaitlist(req, res, next) {
    // Find all non-accepted Cornell students
    if (!req.body.numberToAccept || req.body.numberToAccept <= 0) {
        return res.status(500).send('Need a positive numberToAccept');
    }

    User.find({
        $and: [
            {'internal.cornell_applicant': true},
            {'internal.status': {$ne: 'Accepted'}},
            {'internal.status': {$ne: 'Rejected'}}
        ]
    }).sort({'created_at': 'asc'}).exec(function (err, pendings) {
        let numAccepted = 0;
        pendings.forEach(function (student) {
            if (numAccepted < req.body.numberToAccept) {
                student.internal.status = 'Accepted';
                numAccepted++;
            }
        });

        async.each(pendings, function (student, cb) {
            student.save(cb)
        }, function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).send(err);
            }

            req.flash('success', 'Successfully moved ' + numAccepted + ' students off the waitlist!');
            return res.redirect('/admin/dashboard');
        });
    });
}

/**
 * @api {GET} /api/admin/CsvBus Returns a csv of emails along bus routes for accepted students
 * @apiname CornellWaitlist
 * @apigroup Admin
 *
 * @apiParam {Boolean} optInOnly Only grab emails of those opted in
 * @apiParam {Boolean} rsvpOnly Only grab emails of those RSVP'd
 **/
function csvBus(req, res, next) {
    let query = [
        {'internal.status': 'Accepted'},
        {'internal.cornell_applicant': false}
    ];

    if (req.body.optInOnly) {
        query.push({'internal.busid': {$ne: null}});
    }

    if (req.body.rsvpOnly) {
        query.push({'internal.going': true});
    }

    async.parallel({
        students: function students(cb) {
            User.find({$and: query}, cb);
        },
        buses: function bus(cb) {
            Bus.find({}, cb);
        },
        colleges: function colleges(cb) {
            Colleges.find({}, cb);
        }
    }, function (err, result) {
        if (err) {
            return console.error(err);
        }

        let students = result.students;
        let buses = result.buses;
        let colleges = result.colleges;

        const MAX_BUS_PROXIMITY = 50; // TODO: Reuse this from routes/user.js
        let emailLists = {};
        for (let bus of buses) {
            emailLists[bus.name] = {
                name: bus.name,
                emails: []
            };
        }

        // Convert college list to college map
        let collegeMap = {};
        for (let college of colleges) {
            collegeMap[college._id] = college;
        }

        // Perform expensive computation to map students to closest route.
        for (let bus of buses) {
            for (let stop of bus.stops) {
                for (let student of students) {
                    let stopCollege = collegeMap[stop.collegeid];
                    let studentCollege = collegeMap[student.school.id];
                    let dist = util.distanceBetweenPointsInMiles(stopCollege.loc.coordinates, studentCollege.loc.coordinates);
                    if (dist < MAX_BUS_PROXIMITY) {
                        if (!student.tempDist || student.tempDist > dist) {
                            student.tempDist = dist;
                            student.tempRoute = bus;
                        }
                    }
                }
            }
        }

        // Populate emails
        for (let student of students) {
            if (student.tempRoute) {
                emailLists[student.tempRoute.name].emails.push(student.email);
            }
        }

        let csv = '';
        // Populate csv
        for (let z in emailLists) {
            if (emailLists.hasOwnProperty(z)) {
                let bus = emailLists[z];
                csv += bus.name;
                csv += '\n';
                bus.emails.forEach(function (x) {
                    csv += x + ',\n'
                });
            }
        }

        return res.status(200).send(csv);
    });
}

/**
 * Makes a valid key for mentors to enter on their end
 */
function makeKey(req, res, next) {
    var key = req.body.mentorKey;

    //Check whether the key already exists and save it
    MentorAuthorizationKey.findOneAndUpdate(
        {'key': key}, //queries to see if it exists
        {'key': key}, //rewrites it if it does (does not make a new one)
        {upsert: true}, //if it doesn't exist, it makes a creates a new one
        function(err){
            if(err){
                req.flash('error', 'An error occurred');
                return res.redirect('/admin/dashboard');
            }

            req.flash('success', 'Successfully made a new key');
            return res.redirect('/admin/dashboard');
        }
    );
}

/**
 * A qr scan (or manual entry) for checkin-based events.
 */
function scanQR(req, res, next) {
  let pubid = req.body.pubid;
  let email = req.body.email;
  let scanEventId = req.body.scanEventId;

  if (!pubid && !email) {
      return res.status(500).send('missing pubid or email');
  }

  if (!scanEventId) {
    return res.status(500).send('missing scanEventId');
  }

  async.parallel({
    user: function(cb) {
        if (pubid) {
          User.findOne({pubid:pubid},cb);
        } else {
          User.findOne({email:email},cb);
        }
    },
    scanEvent: function(cb) {
        ScanEvent.findOne({name: scanEventId}, cb);
    }
  }, function(err,data) {
    if (!data.user) {
      return res.status(500).send('No such user.');
    }

    if (!data.scanEvent) {
      return res.status(500).send('No such event: ' + scanEventId);
    }

    for (let i = 0; i < data.scanEvent.attendees.length; i++) {
        let person = data.scanEvent.attendees[i];
        if ( (person.reference + "") == (data.user._id + "")) {
            return res.status(200).send('Sorry! ' + data.user.name.full + ' is already checked in for ' + data.scanEvent.name);
        }
    }

    data.scanEvent.attendees.push({
        name: {
            first: data.user.name.first,
            last: data.user.name.last
        },
        email: data.user.email,
        reference: data.user.id
    });
    data.scanEvent.save(function(err) {
        if (err) {
          return res.status(500).send(err);
        }

        return res.status(200).send(data.user.name.full + ' is checked in for ' + data.scanEvent.name);
    });
  });
}

/**
 * Makes a scanEvent.
 */
function makeEvent(req, res, next) {
  var name = req.body.name;

  //Check whether the key already exists and save it
  ScanEvent.findOneAndUpdate(
    {'name': name}, //queries to see if it exists
    {'name': name, attendees: []}, //rewrites it if it does (does not make a new one)
    {upsert: true}, //if it doesn't exist, it makes a creates a new one
    function(err){
      if(err){
        req.flash('error', 'An error occurred');
        return res.redirect('/admin/qrscan');
      }

      req.flash('success', 'Successfully made a new event');
      return res.redirect('/admin/qrscan');
    }
  );
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
