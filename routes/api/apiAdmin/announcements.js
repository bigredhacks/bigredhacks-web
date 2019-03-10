"use strict";

const async      = require("async");
const fetch      = require("node-fetch");
const config     = require("../../../config.js");
const email      = require("../../../util/email.js");
const helper     = require("../../../util/routes_helper.js");
const OAuth      = require("oauth");
const socketutil = require("../../../util/socketutil.js");
const Twitter    = require("twitter");

let Announcement   = require("../../../models/announcement.js");
let TimeAnnotation = require("../../../models/time_annotation.js");
let User           = require("../../../models/user.js");

module.exports.annotate = (req, res) => {
    // format the date
    let newAnnotation = new TimeAnnotation({
        time: (req.body.time) ? req.body.time : Date.now(),
        info: req.body.annotation
    });

    newAnnotation.save((err) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        }
        else {
            return res.redirect("/admin/stats");
        }
    });
};

module.exports.deleteAnnouncement = (req, res) => {
    Announcement.remove({ _id: req.body._id }, (err) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        else {
            return res.sendStatus(200);
        }
    });
};

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
                            return callback(err);
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

module.exports.postAnnouncement = (req, res) => {
    async.waterfall([
        (cb) => {
            const message = req.body.message;
            let newAnnouncement = new Announcement({
                message: message
            });

            if (message.length > 140 && req.body.twitter) {
                return cb("Character length exceeds 140 and you wanted to post to Twitter.");
            }
            else {
                newAnnouncement.save().then((announcement) => {
                    return cb(null, announcement);
                });
            }
        },
        (newAnnouncement, cb) => {
            async.parallel([
                (cb) => {
                    if (req.body.web) {
                        socketutil.announceWeb(req.body.message);
                    }
                    return cb(null);
                },
                (cb) => {
                    if (req.body.twitter) {
                        let OAuth2 = OAuth.OAuth2;
                        let oauth2 = new OAuth2(
                            config.twitter.tw_consumer_key,
                            config.twitter.tw_consumer_secret,
                            "https://api.twitter.com/",
                            null,
                            "oauth2/token",
                            null
                        );
                        oauth2.getOAuthAccessToken(
                            "",
                            { "grant_type": "client_credentials" },
                            (err, access_token, refresh_token, results) => {
                                if (err) {
                                    return cb(`Twitter OAuth Error: ${err}`);
                                }
                                else {
                                    let twitter_client = new Twitter({
                                        consumer_key:        config.twitter.tw_consumer_key,
                                        consumer_secret:     config.twitter.tw_consumer_secret,
                                        access_token_key:    config.twitter.tw_access_token,
                                        access_token_secret: config.twitter.tw_token_secret
                                    });
                                    twitter_client.post("statuses/update", { status: req.body.message }, cb);
                                }
                            }
                        );
                    }
                    return cb(null);
                },
                (cb) => {
                    if (req.body.slack) {
                        fetch(config.slack.webhook_url, {
                            headers: {
                                "Content-type": "application/json"
                            },
                            body: JSON.stringify({ "text": req.body.message }),
                            method: "POST"
                        })
                            .then(response => {
                                if (!response.ok) {
                                    /* TODO
                                       If an error happens, we get UnhandledPromiseRejectionWarning: Error: Callback was already called,
                                       UnhandledPromiseRejectionWarning: Unhandled promise rejection
                                       Originates from catch statement */
                                    throw new Error(`${response.status}, ${response.statusText}`);
                                }
                            })
                            .catch(error => {
                                return cb(`Slack webhook error: ${error.message}`);
                            });
                    }
                    else {
                        return cb(null);
                    }
                }
            ], (err) => {
                if (err) {
                    console.error(err);
                    if (typeof err === "string") {
                        req.flash("error", err);
                        return res.sendStatus(500);
                    }
                    else {
                        return res.status(500).send(err);
                    }
                }
            });
            return cb(null, "success");
        }
    ], (err) => {
        if (err) {
            console.error(err);
            if (typeof err === "string") {
                req.flash("error", err);
                return res.sendStatus(500);
            }
            else {
                return res.status(500).send(err);
            }
        }
        else {
            req.flash("success", "Announcement posted!");
            return res.redirect("/admin/dashboard");
        }
    });
};
