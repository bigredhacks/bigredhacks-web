const async        = require("async");
let TimeAnnotation = require('../../models/time_annotation.js');
let User           = require('../../models/user.js');

/**
 * @api {GET} /admin/stats Stats page.
 * @apiName Stats
 * @apiGroup AdminAuth
 */
module.exports = (req, res, next) => {
    async.parallel({
        timeAnnotations: (callback) => {
            TimeAnnotation.find({}, (err, ann) => {
                if (err) {
                    console.error(err);
                } else {
                    callback(null, ann);
                }
            });
        },
        userRegistrationDates: (callback) => {
            const projection = 'created_at';
            User.find({}, projection, (err, users) => {
                if (err) {
                    console.error(err);
                } else {
                    callback(null, users);
                }
            });
        },
        majorDistribution: (callback) => {
            User.aggregate([
                {
                    $match: {"internal.going": true}
                },
                {
                    $group: {
                        _id: "$school.major",
                        count: {$sum: 1}
                    }
                },
                {
                    $sort: {"count" : -1}
                },
                {
                    $project: {
                        "_id": 0,
                        "major" : "$_id",
                        "count" : "$count"
                    }
                }
            ], callback);
        }
    }, (err, results) => {
        return res.render('admin/stats', {
            annotations: results.timeAnnotations,
            users: results.userRegistrationDates,
            majors: results.majorDistribution
        });
    });
};
