"use strict";

var toggle;

module.exports.getNoLive = (req, res) => {
    toggle = req.session.liveToggle;
    return res.send(toggle);
};

module.exports.setNoLive = (req, res) => {
    toggle = req.body.state;
    req.session.liveToggle = toggle;
    return res.sendStatus(200);
};

module.exports.toggle = function() {
    return toggle;
};
