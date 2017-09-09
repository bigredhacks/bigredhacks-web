"use strict";

const async = require("async");

let ScanEvent = require("../../../models/scan_event.js");
let User      = require("../../../models/user.js");

module.exports.scanQR = (req, res) => {
    let pubid = req.body.pubid;
    let email = req.body.email;
    let scanEventId = req.body.scanEventId;

    if (!pubid && !email) {
        return res.status(500).send("missing pubid or email");
    }

    if (!scanEventId) {
        return res.status(500).send("missing scanEventId");
    }

    async.parallel({
        user: (cb) => {
            if (pubid) {
                User.findOne({ pubid: pubid }, cb);
            }
            else {
                let sanitizedEmail = email ? email.trim().toLowerCase() : email;
                User.findOne({ email: sanitizedEmail }, cb);
            }
        },
        scanEvent: (cb) => {
            ScanEvent.findOne({ name: scanEventId }, cb);
        }
    }, (err, data) => {
        if (!data.user) {
            return res.status(500).send("No such user.");
        }

        else if (!data.scanEvent) {
            return res.status(500).send(`No such event: ${scanEventId}`);
        }

        else {
            for (let i = 0; i < data.scanEvent.attendees.length; i++) {
                let person = data.scanEvent.attendees[i];
                if ((`${person.reference}`) === (`${data.user._id}`)) {
                    return res.status(200).send(`Sorry! ${data.user.name.full} is already checked in for ${data.scanEvent.name}`);
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
            data.scanEvent.save((err) => {
                if (err) {
                    return res.status(500).send(err);
                }
                else {
                    return res.status(200).send(`${data.user.name.full} is checked in for ${data.scanEvent.name}`);
                }
            });
        }
    });
};

/**
 * Makes a scanEvent.
 */
module.exports.makeEvent = (req, res) => {
    let name = req.body.name;

    //Check whether the key already exists and save it
    ScanEvent.findOneAndUpdate(
        { "name": name }, // queries to see if it exists
        { "name": name, attendees: [] }, // rewrites it if it does (does not make a new one)
        { upsert: true }, // if it doesn't exist, it makes a creates a new one
        (err) => {
            if (err) {
                console.error(err);
                req.flash("error", "An error occurred");
                return res.redirect("/admin/qrscan");
            }
            else {
                req.flash("success", "Successfully made a new event");
                return res.redirect("/admin/qrscan");
            }
        }
    );
};
