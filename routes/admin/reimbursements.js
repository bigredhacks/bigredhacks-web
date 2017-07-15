const async        = require("async");
let Reimbursements = require('../../models/reimbursements.js');
let User           = require('../../models/user.js');
const util         = require('../../util/util.js');

/**
 * @api {GET} /admin/reimbursements Reimbursements page.
 * @apiName Reimbursements
 * @apiGroup AdminAuth
 */
module.exports = (req, res, next) => {
    async.parallel({
        reimbursements: (done) => {
            Reimbursements.find({}, done);
        },
        overrides: (done) => {
            User.find({"internal.reimbursement_override": {$gt: 0}})
                .select("pubid name email school.name internal.reimbursement_override")
                .sort("name.first")
                .exec(done)
        }, checkedIns: (done) => {
            User.find({'internal.checkedin' : true}).sort('school.name').exec(done);
        }
    }, (err, result) => {
        if (err) {
            console.error(err);
        }

        let easyReimbursements = [];

        result.checkedIns.forEach((user) => {
            let reimbursement = util.calculateReimbursement(result.reimbursements, user, false);
            if (reimbursement > 0) {
                easyReimbursements.push({
                    name: user.name.full,
                    email: user.email,
                    school: user.school.name,
                    reimbursement:reimbursement
                });
            }
        });

        return res.render('admin/reimbursements', {
            reimbursements: result.reimbursements,
            overrides: result.overrides,
            easyReimbursements: easyReimbursements
        });
    });
};