const async = require("async");
const helper = require("../../util/helpers/admin");
let Mentor = require("../../models/mentor");
let Reimbursements = require("../../models/reimbursements.js");
let User = require("../../models/user.js");
const util = require("../../util/util.js");

const USER_FILTER = { role: "user" };

/**
 * @api {GET} /admin/dashboard Get dashboard page.
 * @apiName Dashboard
 * @apiGroup AdminAuth
 */
module.exports = (req, res, next) => {
    async.parallel({
        applicants: helper.aggregate.applicants.byMatch(USER_FILTER),
        schools: (done) => {
            User.aggregate([
                {
                    $match: USER_FILTER
                },
                {
                    $group: {
                        _id: { name: "$school.name", collegeid: "$school.id", status: "$internal.status", going: "$internal.going" },
                        total: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        going: { $cond: [{ $eq: ["$_id.going", true] }, "$total", 0] },
                        notGoing: { $cond: [{ $eq: ["$_id.going", false] }, "$total", 0] },
                        accepted: { $cond: [{ $eq: ["$_id.status", "Accepted"] }, "$total", 0] },
                        waitlisted: { $cond: [{ $eq: ["$_id.status", "Waitlisted"] }, "$total", 0] },
                        rejected: { $cond: [{ $eq: ["$_id.status", "Rejected"] }, "$total", 0] },
                        //$ifnull returns first argument if not null, which is truthy in this case
                        //therefore, need a conditional to check whether the second argument is returned.
                        //todo the $ifnull conditional is for backwards compatibility: consider removing in 2016 deployment
                        pending: { $cond: [{ $or: [{ $eq: ["$_id.status", "Pending"] }, { $cond: [{ $eq: [{ $ifNull: ["$_id.status", null] }, null] }, true, false] }] }, "$total", 0] }
                    }
                },
                {
                    $group: {
                        _id: { name: "$_id.name", collegeid: "$_id.collegeid" },
                        going: { $sum: "$going" },
                        notGoing: { $sum: "$notGoing" },
                        accepted: { $sum: "$accepted" },
                        waitlisted: { $sum: "$waitlisted" },
                        rejected: { $sum: "$rejected" },
                        pending: { $sum: "$pending" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: "$_id.name",
                        collegeid: "$_id.collegeid",
                        going: "$going",
                        notGoing: "$notGoing",
                        accepted: "$accepted",
                        waitlisted: "$waitlisted",
                        rejected: "$rejected",
                        pending: "$pending",
                        total: { $add: ["$accepted", "$pending", "$waitlisted", "$rejected"] }
                    }
                },
                { $sort: { total: -1, name: 1 } }

            ], (err, res) => {
                return done(err, res);
            });
        },
        rsvps: (done) => {
            User.aggregate(
                [
                    { $match: { $and: [USER_FILTER, { "internal.status": "Accepted" }] } },
                    { $group: { _id: "$internal.going", count: { $sum: 1 } } }
                ],
                (err, res) => {
                    res = helper.objectAndDefault(res, {
                        true: 0,
                        false: 0,
                        null: 0
                    });
                    return done(err, res);
                }
            );
        },
        // { $match: { $and: [USER_FILTER, { "internal.going": true }] } },
        logisticsDietary: (done) => {
            User.aggregate([
                { $match: { $and: [USER_FILTER, { "internal.going": true }] } },
                { $group: { _id: "$logistics.dietary", total: { $sum: 1 } } },
            ],
                (err, res) => {
                    if (err) {
                        done(err);
                    } else {
                        result = helper.objectAndDefault(res, {
                            none: 0,
                            vegetarian: 0,
                            "gluten-free": 0
                        });
                        done(null, result);
                    }
                }
            );
        },
        logisticsTshirt: (done) => {
            User.aggregate([
                { $match: { $and: [USER_FILTER, { "internal.going": true }] } },
                { $group: { _id: "$logistics.tshirt", total: { $sum: 1 } } },
            ], (err, res) => {
                if (err) {
                    done(err);
                } else {
                    result = helper.objectAndDefault(res, {
                        xs: 0,
                        s: 0,
                        m: 0,
                        l: 0,
                        xl: 0
                    });
                    done(null, result);
                }
            });
        },
        decisionAnnounces: (done) => {
            User.aggregate([
                {
                    $project: {
                        notified: { $strcasecmp: ["$internal.notificationStatus", "$internal.status"] },
                        school: {
                            name: 1,
                            id: 1
                        },
                        "internal.status": 1
                    }
                },
                { $match: { $and: [{ "notified": { $ne: 0 } }, { "internal.status": { $ne: "Pending" } }] } },
                {
                    $group: {
                        _id: { name: "$school.name", collegeid: "$school.id", status: "$internal.status" },
                        total: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        accepted: { $cond: [{ $eq: ["$_id.status", "Accepted"] }, "$total", 0] },
                        waitlisted: { $cond: [{ $eq: ["$_id.status", "Waitlisted"] }, "$total", 0] },
                        rejected: { $cond: [{ $eq: ["$_id.status", "Rejected"] }, "$total", 0] }
                    }
                },
                {
                    $group: {
                        _id: { name: "$_id.name", collegeid: "$_id.collegeid" },
                        accepted: { $sum: "$accepted" },
                        waitlisted: { $sum: "$waitlisted" },
                        rejected: { $sum: "$rejected" },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: "$_id.name",
                        collegeid: "$_id.collegeid",
                        accepted: "$accepted",
                        waitlisted: "$waitlisted",
                        rejected: "$rejected",
                        total: { $add: ["$accepted", "$waitlisted", "$rejected"] }
                    }
                },
                { $sort: { total: -1, name: 1 } }
            ], done);
        },
        reimbursements: (done) => {
            Reimbursements.find({}, done);
        },
        accepted: (done) => {
            User.find({ "internal.status": "Accepted" })
                .select("pubid name email school.name school.id internal.reimbursement_override internal.status internal.going")
                .exec(done);
        },
        mentors: (done) => {
            Mentor.find({}, done);
        }

    }, (err, result) => {
        if (err) {
            console.log(err);
        }
        let currentMax = 0, potentialMax = 0, reimburse = 0;
        if (result) {
            // Assumes charterbus reimbursements have been set
            currentMax = result.accepted.reduce((acc, user) => acc + util.calculateReimbursement(result.reimbursements, user, true), 0);
            potentialMax = result.accepted.reduce((acc, user) => acc + util.calculateReimbursement(result.reimbursements, user, false), 0);
            reimburse = { currentMax, potentialMax };
        }
        return res.render("admin/index", {
            title: "Admin Dashboard",
            applicants: result.applicants,
            schools: result.schools,
            rsvps: result.rsvps,
            logistics: {
                dietary: result.logisticsDietary,
                tshirt: result.logisticsTshirt
            },
            decisionAnnounces: result.decisionAnnounces,
            reimburse,
            mentors: result.mentors
        });


    });
};
