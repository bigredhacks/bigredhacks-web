const async  = require("async");
const config = require("../../../config.js");
const email  = require("../../../util/email");
const helper = require("../../../util/routes_helper.js");

let User     = require("../../../models/user.js");

module.exports.makeRollingAnnouncement = (req, res) => {
    const DAYS_TO_RSVP = Number(config.admin.days_to_rsvp);
    const WAITLIST_ID = config.mailchimp.l_cornell_waitlisted;
    const ACCEPTED_ID = config.mailchimp.l_cornell_accepted;
    User.find({
        $and: [
            { $where: "this.internal.notificationStatus != this.internal.status" },
            { "internal.status": { $ne: "Pending" } }
        ]
    }, (err, recipient) => {
        if (err) {
            console.log(err);
        }
        else {
            // Do not want to overload by doing too many requests, so this will limit the async
            const maxRequestsAtATime = 3;
            async.eachLimit(recipient, maxRequestsAtATime, (recip, callback) => {
                let config = {
                    "from_email": "info@bigredhacks.com",
                    "from_name": "BigRed//Hacks",
                    "to": {
                        "email": recip.email,
                        "name": `${recip.name.first} ${recip.name.last}`
                    }
                };

                email.sendDecisionEmail(recip.name.first, recip.internal.notificationStatus, recip.internal.status, config, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    else {
                        recip.internal.notificationStatus = recip.internal.status;
                        recip.internal.lastNotifiedAt = Date.now();
                        recip.internal.daysToRSVP = DAYS_TO_RSVP;

                        async.parallel([
                            (cb) => {
                                recip.save(cb);
                            },
                            (cb) => {
                                if (recip.internal.cornell_applicant && recip.internal.status === "Accepted") {
                                    // We can get errors for non-termination reasons, so callback will only log error
                                    helper.removeSubscriber(WAITLIST_ID, recip.email, function (err) {
                                        if (err) {
                                            console.error(err);
                                        }
                                        return cb(null);
                                    });
                                }
                                else {
                                    return cb(null);
                                }
                            },
                            (cb) => {
                                if (recip.internal.cornell_applicant && recip.internal.status === "Accepted") {
                                    // We can get errors for non-termination reasons, so callback will only log error
                                    helper.addSubscriber(ACCEPTED_ID, recip.email, recip.name.first, recip.name.last, function (err) {
                                        if (err) {
                                            console.error(err);
                                        }
                                        return cb(null);
                                    });
                                }
                                else {
                                    return cb(null);
                                }
                            }
                        ], (err) => {
                            return void callback(err); // ??????
                        });
                    }
                });
            }, (err) => {
                if (err) {
                    console.error(`An error occurred with decision emails. Decision sending was terminated. See the log for remediation: ${err}`);
                    req.flash("error", "An error occurred. Check the logs!");
                    return res.sendStatus(500);
                }
                else {
                    req.flash("success", "All transactional decision emails successfully sent!");
                    return res.redirect("/admin/dashboard");
                }
            });
        }
    });
};
