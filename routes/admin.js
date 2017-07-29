"use strict";

// Node Modules & other utilities
const express = require("express");
let router    = express.Router();

// Routes
const applications   = require("./admin/applications");
const busInfo        = require("./admin/busInfo");
const checkin        = require("./admin/checkin");
const dashboard      = require("./admin/dashboard");
const hardware       = require("./admin/hardware");
const homeRedirect   = require("./admin/home");
const qrscan         = require("./admin/qrscan");
const reimbursements = require("./admin/reimbursements");
const settings       = require("./admin/settings");
const sponsors       = require("./admin/sponsors");
const stats          = require("./admin/stats");

// Home
router.get("/", homeRedirect);

// Applications
router.get("/review",         applications.review);
router.get("/search",         applications.search);
router.get("/user/:pubid",    applications.viewApplicant);
router.get("/team/:teamid",   applications.viewTeam);

// Bus Info
router.get("/businfo",        busInfo.busInfoGet);
router.post("/businfo",       busInfo.busInfoPost);

// Checkin
router.get("/checkin",        checkin);

// Dashboard
router.get("/dashboard",      dashboard);

// Hardware
router.get("/hardware",       hardware);

// QR Scan
router.get("/qrscan",         qrscan);

// Reimbursements
router.get("/reimbursements", reimbursements);

// Sponsors
router.get("/sponsors",       sponsors);

// Settings
router.get("/settings",       settings);

// Stats
router.get("/stats",          stats);

module.exports = router;