"use strict";

const express = require("express");
const router = express.Router();
const validator = require("../library/validations.js");
const helper = require("../util/routes_helper");
const async = require("async");
const Announcement = require("../models/announcement.js");
const Inventory = require("../models/hardware_item.js");

const config = require("../config.js");
const util = require("../util/util");

/**
 * @api {GET} /test Home page.
 * @apiName test
 * @apiGroup test
 */
router.get("/test123", function (req, res) {
  let ev = req.flash();
  res.render("test", {
    title: "THIS IS A FUCKING TEST",
    messages: ev
  });
});

/**
 * @api {GET} /subscribe subscribe a student to the mailing list
 * @apiName Subscribe
 * @apiGroup test
 */
router.get("/subscribe", function (req, res) {
  req = validator.validate(req, ["email"]);
  let email = req.query["email"];
  if (req.validationErrors()) {
    console.log(req.validationErrors());
    res.send({ status: false, message: "Please enter a valid email" });
  }
  else {
    helper.addSubscriber(config.mailchimp.l_interested, email, "", "", function (err, result) {
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
 * @apiGroup test
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
      helper.addSubscriber("9ac9a1da0e", email, fName, lName, function (err) {
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
 * @apiGroup test
 */
router.get("/live", function (req, res, next) {
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
  }, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500); // Do not expose error to users
    }
    else {
      return res.render("live", {
        title: "Live",
        announcements: result.announcements,
        calendar: result.calendar
      });
    }
  });
});

module.exports = router;
