const async   = require("async");
let ScanEvent = require('../../models/scan_event');

/**
 * @api {GET} /admin/qrscan The scanEvent checkin page
 * @apiName QRScan
 * @apiGroup AdminAuth
 */
module.exports = (req, res, next) => {
    async.parallel({
        scanEvents: (cb) => {
            ScanEvent.find({}, cb).populate('attendees');
        }
    }, (err, result) => {
        if (err) {
            console.error(err);
        }

        return res.render('admin/qrscan', {
            scanEvents: result.scanEvents
        });
    });
};