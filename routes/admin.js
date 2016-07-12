"use strict";
var express = require('express');
var router = express.Router();
var _ = require('underscore');
var async = require('async');

var validator = require('../library/validations.js');
var helper = require('../util/routes_helper');
var enums = require('../models/enum.js');
var config = require('../config.js');
var queryBuilder = require('../util/search_query_builder.js');

var User = require('../models/user.js');
var Team = require('../models/team.js');
var Bus = require('../models/bus.js');
var Reimbursements = require('../models/reimbursements.js');
var TimeAnnotation = require('../models/time_annotation.js');

//filter out admin users in aggregate queries.
var USER_FILTER = { role: "user" };

//some commonly used aggregation queries:
//todo refactor and clean this up

/**
 * Lowercases data, converts its array fields to objects, and sets defaults
 * @param data
 * @param defaults
 */
function objectAndDefault (data, defaults) {
    //make all values lowercase
    data = _.map(data, function (x) {
        return _.mapObject(x, function (val, key) {
            return (typeof val == 'string') ? val.toLowerCase() : val;
        });
    });

    //remap values to key,value pairs and fill defaults
    return _.defaults(_.object(_.map(data, _.values)), defaults);
}

var aggregate = {
    applicants: {
        //runs simple aggregation for applicants over a match criteria
        byMatch: function (match) {
            return function (done) {
                User.aggregate([
                    {$match: match},
                    {$group: {_id: "$internal.status", total: {$sum: 1}}}
                ], function (err, result) {
                    if (err) {
                        done(err);
                    }
                    else {
                        result = objectAndDefault(result, {
                            null: 0,
                            accepted: 0,
                            rejected: 0,
                            waitlisted: 0,
                            pending: 0
                        });

                        result.total = _.reduce(result, function (a, b) {
                            return a + b;
                        });

                        done(null, result);
                    }
                })
            }
        },
        school: function (current_user) {
            return function (done) {
                User.aggregate([
                    {$match: _.extend(USER_FILTER, {"school.id": current_user.school.id})},
                    {$group: {_id: "$internal.status", total: {$sum: 1}}}
                ], function (err, result) {
                    if (err) {
                        done(err);
                    }
                    else {

                    }
                })
            }
        },
        gender: function () {
            return function (done) {
                User.count( {$and: [{"internal.status" : "Accepted"}, USER_FILTER]}
                , function (err, totalRes) {
                    if (err) {
                        done(err);
                    } else {
                        User.aggregate(
                            [
                                {$match: {$and: [{"internal.status" : "Accepted"}, USER_FILTER]}},
                                {$group: {
                                    _id: "$gender",
                                    totalAccepted: {$sum: 1}
                                }}
                            ], function (err, acceptedRes) {
                                if (err) {
                                    done(err);
                                } else {

                                    acceptedRes = objectAndDefault(acceptedRes, {
                                        male: 0,
                                        female: 0
                                    });


                                    const res = {
                                        male: 100.0 * acceptedRes.male / totalRes,
                                        female: 100.0 * acceptedRes.female / totalRes,
                                    };

                                    done(null, res);
                                }
                                }
                        )
                    }
                })
            }
        }
    }
};

/**
 * @api {GET} /admin Get home page.
 * @apiName Index
 * @apiGroup AdminAuth
 */
router.get('/', function (req, res, next) {
    res.redirect('/admin/dashboard');
});


/**
 * @api {GET} /admin/dashboard Get dashboard page.
 * @apiName Dashboard
 * @apiGroup AdminAuth
 */
router.get('/dashboard', function (req, res, next) {

    async.parallel({
        applicants: aggregate.applicants.byMatch(USER_FILTER),
        schools: function (done) {
            User.aggregate([
                {$match: USER_FILTER},
                {$group: {_id: {name: "$school.name", status: "$internal.status"}, total: {$sum: 1}}},
                {
                    $project: {
                        accepted: {$cond: [{$eq: ["$_id.status", "Accepted"]}, "$total", 0]},
                        waitlisted: {$cond: [{$eq: ["$_id.status", "Waitlisted"]}, "$total", 0]},
                        rejected: {$cond: [{$eq: ["$_id.status", "Rejected"]}, "$total", 0]},
                        //$ifnull returns first argument if not null, which is truthy in this case
                        //therefore, need a conditional to check whether the second argument is returned.
                        //todo the $ifnull conditional is for backwards compatibility: consider removing in 2016 deployment
                        pending: {$cond: [{$or: [{$eq: ["$_id.status", "Pending"]}, {$cond: [{$eq: [{$ifNull: ["$_id.status", null]}, null]}, true, false]}]}, "$total", 0]}
                    }
                },
                {
                    $group: {
                        _id: {name: "$_id.name"},
                        accepted: {$sum: "$accepted"},
                        waitlisted: {$sum: "$waitlisted"},
                        rejected: {$sum: "$rejected"},
                        pending: {$sum: "$pending"}
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: "$_id.name",
                        accepted: "$accepted",
                        waitlisted: "$waitlisted",
                        rejected: "$rejected",
                        pending: "$pending",
                        total: {$add: ["$accepted", "$pending", "$waitlisted", "$rejected"]}
                    }
                },
                {$sort: {total: -1, name: 1}}

            ], function (err, res) {
                return done(err, res);
            })
        },
        rsvps: function(done) {
            User.aggregate([
                { $match: { $and: [USER_FILTER, {"internal.status" : "Accepted"}] } },
                {$group: {
                    _id: "$internal.going",
                    count: {$sum: 1}
                }}
            ], function (err, res) {
                res = objectAndDefault(res, {
                    true: 0,
                    false: 0,
                    null: 0
                });
                return done(err, res);
            })
        },
        decisionAnnounces: function(done) {
            User.count( {$and : [ { $where: "this.internal.notificationStatus != this.internal.status" }, {"internal.status": { $ne: "Pending"}}]} , function (err, resu) {
                if (err) console.log(err);
                else {
                    return done(err, resu);
                }
            });
        }
    }, function (err, result) {
        if (err) {
            console.log(err);
        }
        //console.log(result);
        res.render('admin/index', {
            title: 'Admin Dashboard',
            applicants: result.applicants,
            schools: result.schools,
            rsvps: result.rsvps,
            decisionAnnounces: result.decisionAnnounces
        })
    });

});

/**
 * @api {GET} /admin/user/:pubid Get detailed view of applicant.
 * @apiName UserInfo
 * @apiGroup AdminAuth
 */
router.get('/user/:pubid', function (req, res, next) {
    var pubid = req.params.pubid;
    User.where({pubid: pubid}).findOne(function (err, user) {
        if (err) {
            console.log(err);
            //todo return on error
        }
        else {
            _fillTeamMembers(user, function (err, user) {
                if (err) {
                    console.log(err);
                }
                res.render('admin/user', {
                    currentUser: user,
                    title: 'Review User'
                })
            });
        }
    });
});

/**
 * @api {GET} /admin/team/:teamid Review entire team
 * @apiName TeamInfo
 * @apiGroup AdminAuth
 */
router.get('/team/:teamid', function (req, res, next) {
    var teamid = req.params.teamid;
    User.find({'internal.teamid': teamid}).exec(function (err, teamMembers) {
        res.render('admin/team', {
            title: 'Review Team',
            teamMembers: teamMembers
        })
    });
});

/**
 * @api {GET} /admin/settings Settings page to set user roles.
 * @apiName UserRoles
 * @apiGroup AdminAuth
 */
router.get('/settings', function (req, res, next) {

    //todo change to {role: {$ne: "user"}} in 2016 deployment
    User.find({$and: [{role: {$ne: "user"}}, {role: {$exists: true}}]}).sort('name.first').exec(function (err, users) {
        if (err) console.log(err);

        //add config admin to beginning
        var configUser = {};
        configUser.email = config.admin.email;
        users.unshift(configUser);

        res.render('admin/settings', {
            title: 'Admin Dashboard - Settings',
            users: users,
            params: req.query
        })
    });
});

/**
 * @api {GET} /admin/user/:pubid Search page to find applicants.
 * @apiName Search
 * @apiGroup AdminAuth
 */
router.get('/search', function (req, res, next) {
    var queryKeys = Object.keys(req.query);
    if (queryKeys.length == 0 || (queryKeys.length == 1 && queryKeys[0] == "render")) {
        User.find().limit(50).sort('name.first').exec(function (err, applicants) {
            if (req.query.render == "table") //dont need to populate for tableview
                endOfCall(err, applicants);
            else _fillTeamMembers(applicants, endOfCall);
        });
        return;
    }

    _runQuery(req.query, function (err, applicants) {
        if (err) {
            console.log(err);
        }
        if (req.query.render == "table") {
            endOfCall(null, applicants);
        }
        else {
            _fillTeamMembers(applicants, endOfCall);
        }
    });

    function endOfCall(err, applicants) {
        if (err) console.error(err);
        res.render('admin/search/search', {
            title: 'Admin Dashboard - Search',
            applicants: applicants,
            params: req.query,
            render: req.query.render //table, box
        })
    }
});

/**
 * @api {GET} /admin/review Review page to review a random applicant who hasn't been reviewed yet
 * @apiName Review
 * @apiGroup AdminAuth
 */
router.get('/review', function (req, res, next) {
    var query = { 'internal.status': "Pending" };
    query = {$and: [query, USER_FILTER]};
    User.count(query, function (err, count) {
        if (err) {
            console.log(err);
        }

        //redirect if no applicants left to review
        if (count == 0) {
            return res.redirect('/admin');
        } else {
            var rand = Math.floor(Math.random() * count);
            User.findOne(query).skip(rand).exec(function (err, user) {
                if (err) console.error(err);

                async.parallel({
                    overall: aggregate.applicants.byMatch(USER_FILTER),
                    school: aggregate.applicants.byMatch(_.extend(_.clone(USER_FILTER), {"school.id": user.school.id})),
                    bus_expl: aggregate.applicants.byMatch(_.extend(_.clone(USER_FILTER), {"internal.busid": user.internal.busid})), //explicit bus assignment
                    gender: aggregate.applicants.gender(),
                }, function (err, stats) {
                    if (err) {
                        console.error(err);
                    }
                    res.render('admin/review', {
                        title: 'Admin Dashboard - Review',
                        currentUser: user,
                        stats: stats
                    })
                })

            });
        }
    });
});


/**
 * @api {GET} /admin/businfo page to see bus information
 * @apiName BusInfo
 * @apiGroup AdminAuth
 */
router.get('/businfo', function (req, res, next) {
    Bus.find().exec(function (err, buses) {
        if (err) {
            console.log(err);
        }
        var _buses = [];
        async.each(buses, function (bus, callback) {
            async.each(bus.members, function (member, callback2) {
                User.findOne({_id: member.id}, function (err, user) {
                    if (err) {
                        console.log(err);
                    }
                    else if (user.role == "bus captain") {
                        bus.buscaptain = user;
                    }
                    callback2();
                });
            }, function (err) {
                _buses.push(bus);
                callback();
            });
        }, function (err) {
            res.render('admin/businfo', {
                title: 'Admin Dashboard - Bus Information',
                buses: _buses
            });
        });
    });
});

/**
 * @api {POST} /admin/businfo add new bus to list of buses
 * @apiName BusInfo
 * @apiGroup AdminAuth
 */
router.post('/businfo', function (req, res, next) {
    //todo clean this up so that college ids and names enter coupled
    var collegeidlist = req.body.collegeidlist.split(",");
    var collegenamelist = req.body.busstops.split(",");
    var stops = [];
    if (collegeidlist.length != collegenamelist.length) {
        console.error("Invariant error: Cannont create bus route when colleges do not match!");
        console.log(collegeidlist, collegenamelist);
        return res.sendStatus(500);
    }
    for (var i = 0; i < collegeidlist.length; i++) {
        stops.push({
            collegeid: collegeidlist[i],
            collegename: collegenamelist[i]
        });
    }
    var newBus = new Bus({
        name: req.body.busname, //bus route name
        stops: stops,
        capacity: parseInt(req.body.buscapacity),
        members: []
    });
    newBus.save(function (err) {
        if (err) console.log(err);
        res.redirect('/admin/businfo');
    });
});

/**
 * @api {GET} /admin/reimbursements Reimbursements page.
 * @apiName Reimbursements
 * @apiGroup AdminAuth
 */
router.get('/reimbursements', function (req, res, next) {
    Reimbursements.find({}, function (err, reimbursements) {
        if (err) {
            console.error(err);
        }
        res.render('admin/reimbursements', {
            reimbursements: reimbursements
        });
    })
});

/**
 * @api {GET} /admin/reimbursements Sign in page for checking in people.
 * @apiName CheckIn
 * @apiGroup AdminAuth
 */
router.get('/checkin', function(req, res, next) {
    res.render('admin/checkin');
});

/**
 * @api {GET} /admin/stats Stats page.
 * @apiName Stats
 * @apiGroup AdminAuth
 */
router.get('/stats', function (req, res, next) {
    async.parallel([
        function(callback) {
            TimeAnnotation.find({}, function (err, ann) {
                if (err) {
                    console.error(err);
                } else {
                    callback(null, ann);
                }
            });
        },
        function(callback) {
            const projection = 'created_at';
            User.find({}, projection, function (err,users) {
                if (err) {
                    console.error(err);
                } else {
                    callback(null, users);
                }
            });
        }

    ], function(err, results) {
            res.render('admin/stats', {
                annotations: results[0],
                users: results[1],
            });
    }

    );

});

/**
 * Helper function to fill team members in teammember prop
 * @param applicants Array|Object of applicants to obtain team members of
 * @param callback function that given teamMembers, renders the page
 */
function _fillTeamMembers(applicants, callback) {
    //single user
    if (typeof applicants == "object" && !(applicants instanceof Array)) {
        _getUsersFromTeamId(applicants.internal.teamid, function (err, teamMembers) {
            applicants.team = teamMembers;
            return callback(err, applicants);
        })
    }
    //array of users
    else async.map(applicants, function (applicant, done) {
        _getUsersFromTeamId(applicant.internal.teamid, function (err, teamMembers) {
            applicant.team = teamMembers;
            return done(err, applicant);
        });
    }, function (err, results) {
        if (err) console.error(err);
        return callback(err, results);
    });
}

/**
 * Helper function which given a team id, provides as an argument to a callback an array of the team members as
 * User objects with that team id
 * @param teamid id of team to get members of
 * @param callback
 */
function _getUsersFromTeamId(teamid, callback) {
    var teamMembers = [];
    if (teamid == null) return callback(null, teamMembers);
    Team.findOne({_id: teamid}, function (err, team) {
        team.populate('members.id', function (err, team) {
            if (err) console.error(err);
            team.members.forEach(function (val, ind) {
                teamMembers.push(val.id);
            });
            callback(null, teamMembers);
        });
    });
}

/**
 * Helper function to perform a search query (used by applicant page search("/search") and settings page
 * search("/settings"))
 * @param queryString String representing the query parameters
 * @param callback function that performs rendering
 */
function _runQuery(queryString, callback) {
    /*
     * two types of search approaches:
     * 1. simple query (over single fields)
     * 2. aggregate query (over fields that need implicit joins)
     */

    //for a mapping of searchable fields, look at searchable.ejs
    var query = queryBuilder(queryString, "user");


    //console.log(query);
    if (_.size(query.project) > 0) {
        query.project.document = '$$ROOT'; //return the actual document
        //query.project.lastname = '$name.last'; //be able to sort by last name
        query.project.firstname = '$name.first';
        User.aggregate()
            .project(query.project)
            .match(query.match)
            .sort('firstname')
            .exec(function (err, applicants) {
                if (err) callback(err);
                else {
                    callback(null, _.map(applicants, function (x) {
                        return x.document
                    }));
                }
            });
    }
    else {
        //run a simple query (because it's faster)
        User.find(query.match)
            .sort('name.first')
            .exec(callback);
    }

}
module.exports = router;