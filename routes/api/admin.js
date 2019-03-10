"use strict";

const express = require("express");
const middle  = require("../middleware");
const router  = express.Router();

// Route Imports
const announcements = require("./apiAdmin/announcements");
const bus           = require("./apiAdmin/bus");
const event         = require("./apiAdmin/event");
const hardware      = require("./apiAdmin/hardware");
const lottery       = require("./apiAdmin/lottery");
const np            = require("./apiAdmin/np");
const liveToggle    = require("./apiAdmin/liveToggle");
const reimbursement = require("./apiAdmin/reimbursement");
const rsvp          = require("./apiAdmin/rsvp");
const team          = require("./apiAdmin/team");
const user          = require("./apiAdmin/user");


// Announcement Routes
router.post("/annotate",                 announcements.annotate);
router.post("/announcements",            announcements.postAnnouncement);
router.delete("/announcements",          announcements.deleteAnnouncement);
router.post("/rollingDecision",          announcements.makeRollingAnnouncement);

// Bus Routes (hah)
router.post("/busCaptain",               bus.setBusCaptain);
router.delete("/busCaptain",             bus.deleteBusCaptain);
router.put("/busOverride",               bus.setBusOverride);
router.delete("/busOverride",            bus.deleteBusOverride);
router.post("/confirmBus",               bus.busConfirmationHandler(true));
router.delete("/confirmBus",             bus.busConfirmationHandler(false));
router.get("/csvBus",                    bus.csvBus);
router.delete("/removeBus",              bus.removeBus);
router.put("/updateBus",                 bus.updateBus);

// Event Routes
router.post("/qrScan",                   event.scanQR);
router.post("/makeEvent",                event.makeEvent);

// Hardware Routes
router.post("/hardware/transaction",     hardware.transactHardware);
router.post("/hardware/inventory",       hardware.setInventory);

// Lottery Routes
router.post("/cornellLottery",           lottery.cornellLottery);
router.post("/cornellWaitlist",          lottery.cornellWaitlist);

// No Participation Routes
router.get("/np",                        np.getNoParticipation);
router.post("/np/set",                   np.setNoParticipation);

// Live Page Toggle Routes
router.get("/liveToggle",                        liveToggle.getNoLive);
router.post("/liveToggle/set",                   liveToggle.setNoLive);

// Reimbursement Routes
router.post("/reimbursements/school",    reimbursement.schoolReimbursementsPost);
router.patch("/reimbursements/school",   reimbursement.schoolReimbursementsPatch);
router.delete("/reimbursements/school",  reimbursement.schoolReimbursementsDelete);
router.post("/reimbursements/student",   reimbursement.studentReimbursementsPost);
router.delete("/reimbursements/student", reimbursement.studentReimbursementsDelete);

// RSVP Routes
router.post("/deadlineOverride",         rsvp.rsvpDeadlineOverride);
router.patch("/user/:pubid/checkin",     middle.requireDayof, rsvp.checkInUser);
router.patch("/user/:pubid/setRSVP",     rsvp.setRSVP);
router.get("/users/checkin",             rsvp.getUsersPlanningToAttend);

// Team Routes
router.patch("/team/:teamid/setStatus",  team.setTeamStatus);

// User Routes
router.patch("/user/:pubid/setStatus",   user.setUserStatus);
router.patch("/user/:email/setRole",     user.setUserRole);
router.delete("/user/removeUser",        user.removeUser);

module.exports = router;
