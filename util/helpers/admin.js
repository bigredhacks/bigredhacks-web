// Node Modules and utilities
const _ = require("underscore");
const async = require("async");
const queryBuilder = require('../search_query_builder.js');

// Mongo models
let Team = require('../../models/team.js');
let User = require('../../models/user.js');

// Variables
let helper = {};
const USER_FILTER = { role: "user" }; //filter out admin users in aggregate queries.

// Returns an object of stats related to the user
helper._getStats = function (user, callback) {
    async.parallel({
        overall: helper.aggregate.applicants.byMatch(USER_FILTER),
        school: helper.aggregate.applicants.byMatch(_.extend(_.clone(USER_FILTER), { "school.id": user.school.id })),
        bus_expl: helper.aggregate.applicants.byMatch(_.extend(_.clone(USER_FILTER), { "internal.busid": user.internal.busid })), //explicit bus assignment
        gender: helper.aggregate.applicants.gender()
    }, callback);
};

helper.objectAndDefault = function (data, defaults) {
    //make all values lowercase
    data = _.map(data, function (x) {
        return _.mapObject(x, function (val, key) {
            return (typeof val === 'string') ? val.toLowerCase() : val;
        });
    });

    //remap values to key,value pairs and fill defaults
    return _.defaults(_.object(_.map(data, _.values)), defaults);
};

/**
 * Helper function to fill team members in teammember prop
 * @param applicants Array|Object of applicants to obtain team members of
 * @param callback function that given teamMembers, renders the page
 */
helper._fillTeamMembers = function (applicants, callback) {
    //single user
    if (typeof applicants === "object" && !(applicants instanceof Array)) {
        helper._getUsersFromTeamId(applicants.internal.teamid, function (err, teamMembers) {
            applicants.team = teamMembers;
            return callback(err, applicants);
        });
    }
    //array of users
    else async.map(applicants, function (applicant, done) {
        helper._getUsersFromTeamId(applicant.internal.teamid, function (err, teamMembers) {
            applicant.team = teamMembers;
            return done(err, applicant);
        });
    }, function (err, results) {
        if (err) console.error(err);
        return callback(err, results);
    });
};

/**
 * Helper function which given a team id, provides as an argument to a callback an array of the team members as
 * User objects with that team id
 * @param teamid id of team to get members of
 * @param callback
 */
helper._getUsersFromTeamId = function (teamid, callback) {
    var teamMembers = [];
    if (teamid === null) return callback(null, teamMembers);
    Team.findOne({ _id: teamid }, function (err, team) {
        if (team === null) return callback(null, teamMembers);
        team.populate('members.id', function (err, team) {
            if (err) console.error(err);
            team.members.forEach(function (val, ind) {
                teamMembers.push(val.id);
            });
            callback(null, teamMembers);
        });
    });
};

/**
 * Helper function to perform a search query (used by applicant page search("/search") and settings page
 * search("/settings"))
 * @param queryString String representing the query parameters
 * @param callback function that performs rendering
 */
helper._runQuery = function (queryString, callback) {
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
                        return x.document;
                    }));
                }
            });
    }
    else {
        //run a simple query (because it's faster)
        User.find(query.match).sort('name.first').exec(callback);
    }
};

helper.aggregate = {
    applicants: {
        //runs simple aggregation for applicants over a match criteria
        byMatch: function (match) {
            return function (done) {
                User.aggregate([
                    { $match: match },
                    { $group: { _id: "$internal.status", total: { $sum: 1 } } }
                ], function (err, result) {
                    if (err) {
                        done(err);
                    }
                    else {
                        result = helper.objectAndDefault(result, {
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
                });
            };
        },
        applicantsCornell: function () {
            return function (done) {
                User.aggregate([
                    { $match: { "school.id": "190415" } },
                    { $group: { _id: "$internal.status", total: { $sum: 1 } } }
                ], function (err, result) {
                    if (err) {
                        done(err);
                    } else {
                        result = helper.objectAndDefault(result, {
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
                });
            }
        },
        school: function (current_user) {
            return function (done) {
                User.aggregate([
                    { $match: _.extend(USER_FILTER, { "school.id": current_user.school.id }) },
                    { $group: { _id: "$internal.status", total: { $sum: 1 } } }
                ], function (err, result) {
                    if (err) {
                        done(err);
                    }
                    else {
                        done(null, result);
                    }
                });
            };
        },
        gender: function () {
            return function (done) {
                User.count({ $and: [{ "internal.status": "Accepted" }, USER_FILTER] }, function (err, totalRes) {
                    if (err) {
                        done(err);
                    } else {
                        User.aggregate(
                            [
                                {
                                    $match: {
                                        $and: [{ "internal.status": "Accepted" }, USER_FILTER]
                                    }
                                },
                                {
                                    $group: {
                                        _id: "$gender",
                                        totalAccepted: { $sum: 1 }
                                    }
                                }
                            ], function (err, acceptedRes) {
                                if (err) {
                                    done(err);
                                } else {

                                    acceptedRes = helper.objectAndDefault(acceptedRes, {
                                        male: 0,
                                        female: 0,
                                        other: 0
                                    });

                                    const res = {
                                        male: 100.0 * acceptedRes.male / totalRes,
                                        female: 100.0 * acceptedRes.female / totalRes,
                                        other: 100.0 * acceptedRes.other / totalRes
                                    };

                                    done(null, res);
                                }
                            }
                        );
                    }
                });
            };
        }
    }
};

module.exports = helper;