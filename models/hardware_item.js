"use strict";
/**
 * Holds inventory information for a hardware item
 */

var mongoose = require("mongoose");

var hardwareItemSchema = new mongoose.Schema({
    name: {type: String, required: true, index: true},
    quantityAvailable: {type: Number, default: 0, required: true},
    quantityOwned: {type: Number, default: 0, required: true}
});

// Methods
hardwareItemSchema.methods.modifyOwnedQuantity = function modifyOwnedQuantity(newQuantity, callback) {
    let itemsOut = this.quantityOwned - this.quantityAvailable;
    this.quantityOwned = newQuantity;
    this.quantityAvailable = this.quantityOwned - itemsOut;

    if (this.quantityOwned < this.quantityAvailable) {
        return callback("Quantity available exceeds quantity owned!");
    }
    this.save(callback);
};

hardwareItemSchema.methods.addQuantity = function changeQuantity(changeInQuantity, callback) {
    this.quantityAvailable += changeInQuantity;
    if (this.quantityAvailable > this.quantityOwned) {
        return callback("Quantity available exceeds quantity owned!");
    }
    else if (this.quantityAvailable < 0) {
        return callback("Negative quantity available!");
    }

    this.save(callback);
};

// Hooks
hardwareItemSchema.pre("save", function checkQuantityInvariant(next) {
    if (this.quantityAvailable > this.quantityOwned) {
        return next(new Error("Quantity Available Exceeds Quantity Owned"));
    }

    return next();
});

module.exports = mongoose.model("HardwareItem", hardwareItemSchema);