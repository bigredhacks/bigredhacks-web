const async                 = require("async");
let HardwareItem            = require('../../models/hardware_item.js');
let HardwareItemCheckout    = require('../../models/hardware_item_checkout.js');
let HardwareItemTransaction = require('../../models/hardware_item_transaction.js');

/**
 * @api {GET} /admin/hardware Manage hardware checkout
 * @apiName Hardware
 * @apiGroup AdminAuth
 */
module.exports = (req, res, next) => {
    async.parallel({
        inventory: (cb) => {
            HardwareItem.find({}, null, {sort: {name: 'asc'}}, cb);
        },
        checkouts: (cb) => {
            HardwareItemCheckout.find().populate('student_id inventory_id').exec(cb);
        },
        transactions: (cb) => {
            HardwareItemTransaction.find().populate('studentId').exec(cb);
        }
    }, (err, result) => {
        if (err) {
            console.error(err);
        }

        result.hardwareNameList = [];
        result.inventory.forEach((x) => {result.hardwareNameList.push(x.name)});

        return res.render('admin/hardware', result);
    });
};
