"use strict";
var searchable = require("../models/searchable");
var _ = require("underscore");

/**
 * Builds an aggregate or simple query
 * @param query Object Raw req.query input
 * @param schema Searchable fields as defined in searchable.js
 *          a string corresponding to the search must be passed in.
 * @return Object out
 *              out.match: object to match
 *              out.project: object to project if aggregation query
 */
var builder = function queryBuilder(query, schema) {
    var project = {};
    var match = {};
    /*
     * 1. omit unsearchable fields
     * 2a. extract path, fuzzysearch
     * 2b. generate projection if space delimited path
     * 2c. generate match
     */
    var searchSchema = searchable[schema];
    if (typeof searchSchema == "undefined") {
        console.error("Invalid schema used for queryBuilder.");
        return;
    }
    _.each(_.omit(query, function (v, k) {
            return (_.findWhere(searchSchema, {alias: k}) == undefined) || v == '';
        }), function (v, k) {
            //get path as array
            var searchItem = _.findWhere(searchSchema, {alias: k});

            //implicit path definition
            var path;
            if (typeof searchItem.path == "undefined") {
                path = searchItem.alias;
            } else  {
                path = searchItem.path;
            }
            path = path.split(" "); //path must be array

            // fix this later
            // var valToMatch;
            // if (searchItem.fuzzytext) { // Convert to tokens by word (fuzzy search)
            //     valToMatch = _toTextMatch(v.trim().split(" "));
            // }
            // else {
            //     // Convert string to bool, only possible when not fuzzy
            //     valToMatch = normalize_bool(v);
            // }

            var valToMatch = normalize_bool(v);

            //generate projection
            if (path.length > 1) {

                // ex: {fullName: {$concat: ['$firstName', ' ', '$lastName']}}
                //convert to projection notation and add space between elements
                path = _.flatten(_.map(path, function (e) {
                    return ["$" + e, " "];
                }));
                path.pop();//pop() last " " element resulting from map

                project[k] = {'$concat': path};
                match[k] = valToMatch;
            }
            else {
                project[k] = "$" + path;
                match[k] = valToMatch;
            }
        }
    );

    return {
        project: project,
        match: match
    };
};


/**
 * convert an array of items to a text match regex
 * @param terms tokenized terms to alternate
 * @return regex with alternations between terms
 *          Ex: John Smith => /(John|Smith)/ig
 */

var _toTextMatch = function _toTextMatch(terms) {
    var regexString = "";

    for (var i = 0; i < terms.length; i++) {
        regexString += terms[i];
        if (i < terms.length - 1) regexString += '|';
    }

    return new RegExp(regexString, 'ig');
};

/**
 * convert a string to bool
 * @param string
 * @returns {*}
 */
function normalize_bool(str) {
    return (str.toString().toLowerCase() == "true") ? true : false;
}
module.exports = builder;