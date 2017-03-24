"use strict";

/**
 * searchable is a basic schema which maps searchable fields in the front end to their representations in the backend.
 *
 * IMPORTANT: Derivative parsers should adhere to the following properties:
 * @name searchable Array
 *          Schema describing property searchability.
 * @prop alias String
 *          Front end name of the property.
 * @prop path String
 *          Either a single path (in dot notation) or a space separated list of paths to the property in the model schema.
 *          If a path is excluded, it will default to the alias.
 * @prop fuzzytext Boolean
 *          Whether to perform fuzzy matching on the field.
 *
 * There are 2 main approaches to searching
 * 1. Single path - Single mongoose query
 * 2. Multiple path - Aggregate query over multi-path fields, then filter.
 *
 */
var searchable = {};

searchable.user = [
    {
        alias: "email",
        fuzzytext: true
    },
    {
        alias: "name",
        path: "name.first name.last",
        fuzzytext: true
    },
    {
        alias: "gender"
    },
    {
        alias: "collegeid",
        path: "school.id"
    },
    {
        alias: "pubid"
    },
    {
        alias: "status",
        path: "internal.status"
    },
    {
        alias: "notificationStatus",
        path: "internal.notificationStatus"
    },
    {
        alias: "role"
    },
    {
        alias: "teamwithcornell",
        path: "internal.teamwithcornell"
    },
    {
        alias: "going",
        path: "internal.going"
    },
    {
        alias: "notgoing",
        path: "internal.not_interested" //waitlisted - if true, they forfeit their spot
    }
];

module.exports = searchable;