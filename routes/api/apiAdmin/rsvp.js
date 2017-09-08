const util  = require("../../../util/util.js");

let User    = require("../../../models/User.js");

module.exports.rsvpDeadlineOverride = (req, res) => {
    if (!req.body.email || !req.body.daysToRSVP) {
        return res.status(500).send("Need email and daysToRSVP");
    }
    else if (req.body.daysToRSVP <= 0) {
        return res.status(500).send("Need positive daysToRSVP value");
    }

    let sanitizedEmail = req.body.email.trim().toLowerCase();
    User.findOne({ email: sanitizedEmail }, (err, user) => {
        if (err) {
            return res.status(500).send(err);
        }
        else if (!user) {
            return res.status(500).send("No such user");
        }

        user.internal.daysToRSVP = req.body.daysToRSVP;
        user.save(util.dbSaveCallback(res));
    });
};
