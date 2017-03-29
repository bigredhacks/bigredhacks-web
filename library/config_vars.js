"use strict";
var exports = {};

function normalize_bool(string) {
    if (string.toLowerCase() == "true") {
        return true;
    }
    else if (string.toLowerCase() == "false") {
        return false;
    }
    return false;
}

function traverse_full_config(schema, eachItem) {
    for (var category in schema) { //iterate through each config category
        if (!schema.hasOwnProperty(category) || category == "_comment") continue;
        for (var key in schema[category]) { //retrieve items in each category
            if (!schema[category].hasOwnProperty(key) || key == "_comment") continue;
            eachItem(category, key);
        }
    }
}

exports.validate_against_schema = function validate_against_schema(schema, config) {
    traverse_full_config(schema, function (category, key) {
        if (!(config.hasOwnProperty(category) && config[category].hasOwnProperty(key))) throw new Error("Missing environment variable " + category + "__" + key);
        let type = schema[category][key].type || "String";
        if (!validate_type(config[category][key], type)) throw new Error("Incorrect type for " + category + "__" + key);
    });
};

exports.from_environment = function from_environment(schema) {
    var config = {};
    traverse_full_config(schema, function (category, key) {
        if (!process.env.hasOwnProperty(category + "__" + key)) throw new Error('Missing environment variable ' + category + "__" + key);
        let type = schema[category][key].type || "String";
        if (!config.hasOwnProperty(category)) {
            config[category] = {};
        }
        config[category][key] = cast_to_type(process.env[category + "__" + key], type);
    });
    return config;
};

function validate_type(variable, type) {
    type = type.toLowerCase();
    return (typeof variable == type);
}

function cast_to_type(variable, type) {
    type = type.toLowerCase();
    switch (type) {
        case "string": {
            return variable.toString();
        }
        case "boolean": {
            return normalize_bool(variable);
        }
        case "number": {
            return Number(variable);
        }
    }
}

module.exports = exports;
