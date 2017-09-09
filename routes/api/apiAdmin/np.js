"use strict";

module.exports.getNoParticipation = (req, res) => {
    return res.send(req.session.np);
};

module.exports.setNoParticipation = (req, res) => {
    req.session.np = req.body.state;
    return res.sendStatus(200);
};
