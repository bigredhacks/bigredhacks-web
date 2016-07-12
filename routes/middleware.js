"use strict";
var config = require('../config');
var middle = {};

function _isRegistrationOpen() {
    return config.admin.reg_open;
}

function _isCornellRegistrationOpen() {
    return config.admin.cornell_reg_open;
}

function _isResultsReleased() {
    return config.admin.results_released;
}

function _isDayof() {
    return config.admin.dayof;
}

middle.requireNoAuthentication = function (req, res, next) {
    if (req.user) {
        return res.redirect('/user/dashboard')
    }
    else {
        return next();
    }
};

middle.requireAuthentication = function (req, res, next) {
    if (req.user) {
        return next();
    }
    else {
        req.flash('error', 'Please login first.');
        return res.redirect('/login');
    }
};

middle.requireAdmin = function (req, res, next) {
    if (req.user && (req.user.role === "admin" || req.user.email == config.admin.email)) {
        return next();
    }
    else {
        req.flash('error', 'Please login first.');
        return res.redirect('/login');
    }
};

middle.requireMentor = function (req, res, next) {
    if (req.user && req.user.role === "mentor") {
        return next();
    }
    else {
        req.flash('error', 'Please login first.');
        return res.redirect('/login');
    }
};

middle.allRequests = function (req, res, next) {
    res.locals.isUser = !!req.user;
    if (res.locals.isUser) {
        res.locals.userRole = req.user.role;
    }
    res.locals.currentUrl = req.url;
    next();
};

middle.requireRegistrationOpen = function (req, res, next) {
    if (_isRegistrationOpen()) {
        return next();
    }
    else {
        return res.redirect('/');
    }
};

middle.requireCornellRegistrationOpen = function (req, res, next) {
    if (_isCornellRegistrationOpen()) {
        return next();
    }
    else {
        return res.redirect('/');
    }
};

middle.requireResultsReleased = function (req, res, next) {
    if (_isResultsReleased()) {
        return next();
    }
    else {
        return res.redirect('/')
    }
};

middle.requireDayof = function (req, res, next) {
    if (_isDayof()) {
        return next();
    }
    else {
        return res.redirect('/')
    }
};

middle.requireAccepted = function (req, res, next) {
    if (req.user && req.user.internal.status === "Accepted") {
        return next();
    }
    else {
        return res.redirect('/');
    }
};

middle.helper = {
    isRegistrationOpen: _isRegistrationOpen,
    isCornellRegistrationOpen: _isCornellRegistrationOpen,
    isResultsReleased: _isResultsReleased,
    isDayof: _isDayof
};

module.exports = middle;
