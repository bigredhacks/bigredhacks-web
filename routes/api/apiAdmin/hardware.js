"use strict";

const async  = require("async");
const email  = require("../../../util/email.js");

let HardwareItemTransaction = require("../../../models/hardware_item_transaction.js");
let Inventory               = require("../../../models/hardware_item.js");
let InventoryTransaction    = require("../../../models/hardware_item_checkout.js");
let User                    = require("../../../models/user.js");

/**
 * @api {POST} /api/admin/hardware/inventory Set our internal hardware inventory.
 * @apiname TransactHardware
 * @apigroup Admin
 *
 * TODO: This method is a bit messy. Should be refactored in the future. (#178)
 *
 * @apiParam {Number} quantity The quantity of hardware we own
 * @apiParam {String} name The unique name of the hardware
 **/
module.exports.setInventory = (req, res) => {
    let body = req.body;
    body.quantity = Number(body.quantity);
    if (!body || body.quantity === undefined || !body.name || isNaN(body.quantity)) {
        return res.status(500).send("Missing quantity or name");
    }

    if (body.quantity <= 0) {
        Inventory.find({ name: body.name }).remove((err) => {
            if (err) {
                return res.status(500).send(err);
            }
            else {
                return res.redirect("/admin/hardware");
            }
        });
    }
    else {
        Inventory.findOne({ name: body.name }, (err, item)  => {
            if (err) {
                return res.status(500).send(err);
            }
            else {
                if (!item) {
                    item = new Inventory({
                        name: body.name,
                        quantityAvailable: body.quantity,
                        quantityOwned: body.quantity
                    });
                }
                item.modifyOwnedQuantity(body.quantity, (err) => {
                    if (err) {
                        return res.status(500).send(err);
                    }
                    else {
                        return res.redirect("/admin/hardware");
                    }
                });
            }
        });
    }
};

/**
 * @api {POST} /api/admin/hardware/transaction Check in or out hardware
 * @apiname TransactHardware
 * @apigroup Admin
 *
 * @apiParam {Boolean} checkingOut true if checking out, false if checking in
 * @apiParam {String} email Email of the student for the transaction
 * @apiParam {Number} quantity The quantity of hardware to transact
 * @apiParam {String} name The unique name of the hardware being transacted
 **/
module.exports.transactHardware = (req, res) => {
    let body = req.body;
    if (!body.email || body.quantity === undefined || !body.name) {
        return res.status(500).send("Missing a parameter, check the API!");
    }

    body.checkingOut = body.checkingOut !== undefined;

    body.quantity = Number(body.quantity); // This formats as a string by default

    if (body.quantity < 1 || isNaN(body.quantity)) {
        return res.status(500).send("Please send a positive quantity");
    }

    async.waterfall([
        (cb) => {
            async.parallel({
                student: (cb) => {
                    let sanitizedEmail = body.email
                        ? body.email.trim().toLowerCase()
                        : body.email;
                    User.findOne({email: sanitizedEmail}, cb);
                },
                item: (cb) => {
                    Inventory.findOne({name: body.name}, cb);
                }
            }, function (err, result) {
                if (err) {
                    return res.status(500).send(err);
                }
                else if (!result.student) {
                    return res.status(500).send("No such user");
                }
                else if (!result.item) {
                    return res.status(500).send("No such item");
                }
                else {
                    return cb(null, result.student, result.item);
                }
            });
        },
        (student, item, cb) => {
            InventoryTransaction.findOne({
                student_id: student,
                inventory_id: item
            }, (err, transaction) => {
                return cb(err, student, item, transaction);
            });
        },
        (student, item, transaction, cb) => {
            // If checking out an item
            if (body.checkingOut) {
                checkoutItem(body, item, student, transaction, (err) => {
                    if (err) {
                        return cb(err);
                    }
                    else {
                        // Tells us what sort of success message to show
                        return cb(null, {
                            returnType: "checkout"
                        });
                    }
                });
            }
            // If we're returning an item
            else {
                returnItem(body, item, student, transaction, (err) => {
                    if (err) {
                        return cb(err);
                    }
                    else {
                        // Tells us what sort of success message to show
                        return cb(null, {
                            returnType: "return"
                        });
                    }
                });
            }
        }
    ], (err, results) => {
        if (err) {
            if (typeof err === "string") {
                return res.status(500).send(err);
            }
            else {
                console.error(err);
                return res.sendStatus(500);
            }
        }
        else {
            if (results.returnType && results.returnType === "checkout") {
                req.flash("success", `Checked out ${body.quantity} ${item.name}`);
                return res.redirect("/admin/hardware");
            }
        }
    });
};

function checkoutItem (body, item, student, transaction, cb) {
    if (item.quantityAvailable - body.quantity >= 0) {
        if (!transaction) {
            transaction = new InventoryTransaction({
                student_id:  student.id,
                inventory_id: item.id,
                quantity: 0
            });
        }

        transaction.quantity += body.quantity;

        item.addQuantity(-body.quantity, (err) => {
            if (err) {
                return res.status(500).send(err);
            }

            transaction.save(function (err) {
                if (err) {
                    return res.status(500).send("Error: could not save transaction");
                }

                email.sendHardwareEmail(
                    true,
                    body.quantity,
                    item.name,
                    student.name.first,
                    student.name.last,
                    student.email,
                    (err) => {
                        if (err) {
                            return cb("Error: could not send hardware transaction email");
                        }
                        else {
                            HardwareItemTransaction.make(item.name, student._id, body.quantity, true, (err) => {
                                if (err) {
                                    return cb("Error: Could not store hardware transaction. Please log on paper");
                                }
                                else {
                                    return cb(null);
                                }
                            });
                        }
                    });
            });
        });
    }
    else {
        return cb("Quantity exceeds availability");
    }
}

function returnItem (body, item, student, transaction, cb) {
    async.waterfall([
        (cb) => {
            if (!transaction) {
                return cb("User has no transactions for that item.");
            }
            else if (body.quantity > transaction.quantity) {
                return cb("User has not checked out that many items of that type!");
            }
            else {
                return cb(null);
            }
        },
        (cb) => {
            transaction.quantity -= body.quantity;
            item.addQuantity(body.quantity, cb);
        },
        (cb) => {
            email.sendHardwareEmail(false, body.quantity, item.name, student.name.first, student.name.last, student.email, (err) => {
                if (err) {
                    return cb("Error: could not send hardware transaction email");
                }
                if (transaction.quantity === 0) {
                    transaction.remove(cb);
                }
                else {
                    transaction.save(cb);
                }
            });
        },
        (cb) => {
            HardwareItemTransaction.make(item.name, student._id, body.quantity, false, cb);
        }
    ], cb);
}
