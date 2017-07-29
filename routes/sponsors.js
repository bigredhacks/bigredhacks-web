"use strict";
const express = require('express');

module.exports = function (io) {

    var router = express.Router();

    /**
     * @api {GET} /sponsors Redirects to /sponsors/resources
     * @apiName Sponsors
     * @apiGroup Sponsors
     */
    router.get('/', function(req,res,next) {
        res.redirect('sponsors/resources');
    });

    router.get('/resources', function(req, res, next){
        res.render('sponsors/resources');
    });

    return router;
};