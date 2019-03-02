"use strict";

var toggle;

module.exports.getNoLive = (req, res) => {
		toggle = req.session.np2;
    return res.send(toggle);
};

module.exports.setNoLive = (req, res) => {
		toggle = req.body.state;
    req.session.np2 = toggle;
    return res.sendStatus(200);
};

// module.exports.toggle = toggle;
// global.golbalString = toogle;
