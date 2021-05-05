"use strict";

const express = require("express");
const router = express.Router();
const validator = require("../library/validations.js");
const helper = require("../util/routes_helper");
const async = require("async");
const Announcement = require("../models/announcement.js");
const Inventory = require("../models/hardware_item.js");
const toggleVar = require("./api/apiAdmin/liveToggle.js"); // get toogle var's value from liveToggle.js
const config = require("../config.js");
const util = require("../util/util");

/**
 * @api {GET} /index BigRed//Hacks organizers homepage.
 * @apiName Index
 * @apiGroup Index
 */
router.get("/", function (req, res) {
    res.render("org", {});
});



/**
 * @api {GET} /2019 BigRed//Hacks 2019 homepage
 * @apiName Old Hackathons
 * @apiGroup Index
 */
router.get("/2019", function (req, res) {
    // let ev = req.flash();
    res.render("index2019", {
        // title: "Cornell's Ultimate Hackathon",
        // messages: ev,
        // regOpen: config.admin.reg_open
    });
});

/**
 * @api {GET} /index BigRed//Hacks organizers homepage.
 * @apiName Index
 * @apiGroup Index
 */
router.get("/org", function (req, res) {
    res.render("org", {});
});




/**
 * @api {GET} /2017 BigRed//Hacks 2017 homepage
 * @apiName Old Hackathons
 * @apiGroup Index
 */
router.get("/2017", function (req, res) {
    res.render("index2017", {});
});

/**
 * @api {GET} /subscribe subscribe a student to the mailing list
 * @apiName Subscribe
 * @apiGroup Index
 */
router.get("/subscribe", function (req, res) {
    req = validator.validate(req, ["email"]);
    let email = req.query["email"];
    if (req.validationErrors()) {
        console.log(req.validationErrors());
        res.send({ status: false, message: "Please enter a valid email" });
    }
    else {
        helper.addSubscriber(config.mailchimp.l_interested, email, "", "", "", function (err, result) {
            console.log(config.mailchimp.l_interested)
            if (err) {
                if (err.name === "List_AlreadySubscribed") {
                    res.send({ status: false, message: "You're already subscribed!" });
                }
                else {
                    console.log(err);
                    res.send({ status: false, message: "There was an error adding your email to the list." });
                }
            }
            else {
                res.send({ status: true, message: "Your email has been added to the mailing list!" });
            }
        });
    }
});

/**
 * @api {POST} /subscribe subscribe a student to the mailing list
 * @apiName Subscribe
 * @apiGroup Index
 */
router.post("/emailListAdd", function (req, res) {
    if (!req.body) {
        return res.status(500).json({
            status: false,
            message: "Bad parameters!"
        });
    }
    else if (!req.body.email || !req.body.fName || !req.body.lName) {
        return res.status(500).json({
            status: false,
            message: "Please submit all required fields, and try again!"
        });
    }
    else {
        const checkVar = (str) => typeof str === "string" && str.length > 0;

        const email = req.body.email;
        const fName = req.body.fName;
        const lName = req.body.lName;

        if (checkVar(email) && checkVar(fName) && checkVar(lName)) {
            helper.addSubscriber(config.mailchimp.l_interested, email, fName, lName, "", function (err) {
                if (err) {
                    console.log(err, "error2");
                    if (err.name === "List_AlreadySubscribed") {
                        return res.status(500).json({
                            status: false,
                            message: "You're already subscribed!"
                        });
                    }
                    else {
                        console.log(err);
                        return res.status(500).json({
                            status: false,
                            message: "There was an error adding your email to the list."
                        });
                    }
                }
                else {
                    return res.status(200).json({
                        status: true,
                        message: "Your email has been added to the mailing list!"
                    });
                }
            });
        }
        else {
            return res.status(500).json({
                status: false,
                message: "There was an error adding your email to the list."
            });
        }
    }
});

/**
 * @api {GET} /live Day-of information page.
 * @apiName DayOf
 * @apiGroup Index
 */

router.get("/live", function (req, res, next) {
    var toggle = toggleVar.toggle();
    if (toggle == "true") {
        async.parallel({
                announcements: (callback) => {
                    const PROJECTION = "message time";
                    Announcement.find({}, PROJECTION, callback);
                },
                calendar: (callback) => {
                    util.grabCalendar(callback);
                },
                inventory: (cb) => {
                    Inventory.find({}, null, { sort: { name: "asc" } }, cb);
                }
            },
            (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500);
                }
                else {
                    return res.render("live", {
                        title: "Live",
                        announcements: result.announcements,
                        calendar: result.calendar
                    });
                }
            });
    }
    else {
        res.render("liveDisabled", {
            title: "Live Page Disabled"
        });
    }
});

module.exports = router;
