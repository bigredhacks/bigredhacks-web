const async  = require("async");
const helper = require('../../util/helpers/admin');
let   User   = require('../../models/user.js');
const util   = require('../../util/util.js');

const USER_FILTER = {role: "user"};

/**
 * @api {GET} /admin/user/:pubid Search page to find applicants.
 * @apiName Search
 * @apiGroup AdminAuth
 */
function search (req, res, next) {
    let queryKeys = Object.keys(req.query);
    if (queryKeys.length === 0 || (queryKeys.length === 1 && queryKeys[0] === "render")) {
        User.find().limit(50).sort('name.first').exec((err, applicants) => {
            if (req.query.render === "table") {
                //dont need to populate for tableview
                endOfCall(err, applicants);
            }
            else {
                helper._fillTeamMembers(applicants, endOfCall);
            }
        });
        return;
    }

    helper._runQuery(req.query, (err, applicants) => {
        if (err) {
            console.log(err);
        }
        if (req.query.render === "table") {
            endOfCall(null, applicants);
        }
        else {
            helper._fillTeamMembers(applicants, endOfCall);
        }
    });

    function endOfCall(err, applicants) {
        if (err) console.error(err);
        let emailCsv = '';
        for (let app of applicants){
            emailCsv += app.email + ', ';
        }
        return res.render('admin/search/search', {
            title: 'Admin Dashboard - Search',
            applicants: applicants,
            params: req.query,
            render: req.query.render, //table, box
            emailCsv: emailCsv
        });
    }
}

/**
 * @api {GET} /admin/review Review page to review a random applicant who hasn't been reviewed yet
 * @apiName Review
 * @apiGroup AdminAuth
 */
function review (req, res, next) {
    let query = {'internal.status': "Pending"};
    query = {$and: [query, USER_FILTER]};
    User.count(query, (err, count) => {
        if (err) {
            console.log(err);
        }

        //redirect if no applicants left to review
        if (count === 0) {
            return res.redirect('/admin');
        }
        else {
            const rand = Math.floor(Math.random() * count);
            User.findOne(query).skip(rand).exec((err, user) => {
                if (err) console.error(err);

                helper._getStats(user, (err, stats) => {
                    if (err) {
                        console.error(err);
                    }
                    return res.render('admin/review', {
                        title: 'Admin Dashboard - Review',
                        currentUser: user,
                        stats: stats
                    });
                });
            });
        }
    });
}

/**
 * @api {GET} /admin/user/:pubid Get detailed view of applicant.
 * @apiName UserInfo
 * @apiGroup AdminAuth
 */
function viewApplicant (req, res, next) {
    User.where({pubid: req.params.pubid}).findOne((err, user) => {
        if (err) {
            console.log(err);
            //todo return on error
        }
        else {
            async.parallel({
                team: (callback) => {
                    helper._fillTeamMembers(user, callback);
                },
                stats: (callback) => {
                    helper._getStats(user, callback);
                },
                reimbursements: (done) => {
                    Reimbursements.find({}, done);
                }
            }, (err, info) => {
                if (err) {
                    console.error(err);
                    return res.sendStatus(500);
                }
                return res.render('admin/user', {
                    title: 'Review User',
                    currentUser: user,
                    stats: info.stats,
                    reimbursement: util.calculateReimbursement(info.reimbursements, user, false)
                });
            });
        }
    });
}

/**
 * @api {GET} /admin/team/:teamid Review entire team
 * @apiName TeamInfo
 * @apiGroup AdminAuth
 */
function viewTeam (req, res, next) {
    User.find({'internal.teamid': req.params.teamid}).exec((err, teamMembers) => {
        return res.render('admin/team', {
            title: 'Review Team',
            teamMembers: teamMembers
        });
    });
}

module.exports = {
    review:        review,
    search:        search,
    viewApplicant: viewApplicant,
    viewTeam:      viewTeam
};
