/**
 * Test config variable system
 */
var chai = require('chai');
var should = chai.should();
var expect = chai.expect;

var configVars = require('../library/config_vars');

var schema = {
    "setup": {
        "_comment": "Secret api keys.",
        "key_bool": {"type": "boolean"},
        "key_string": {"type": "String"},
        "key_num": {"type": "Number"}
    }
};

describe('config.json variables', function() {
    var config;

    beforeEach(function() {
        config = {
            "setup": {
                "_comment": "Secret api keys.",
                "key_bool": true,
                "key_string": "asdf",
                "key_num": 2
            }
        };
    });

    it('should throw missing var error', function () {
        delete config.setup.key_bool;
        (function() {
            configVars.validate_against_schema(schema, config);
        }).should.throw(Error);
    });

    it('should throw boolean validation failed', function() {
        (function() {
            config.setup.key_bool = "";
            configVars.validate_against_schema(schema, config);
        }).should.throw(Error);
        (function() {
            config.setup.key_bool = 567;
            configVars.validate_against_schema(schema, config);
        }).should.throw(Error);
    });

    it('should throw string validation failed', function() {
        (function() {
            config.setup.key_string = true;
            configVars.validate_against_schema(schema, config);
        }).should.throw(Error);
        (function() {
            config.setup.key_string = 567;
            configVars.validate_against_schema(schema, config);
        }).should.throw(Error);
    });

    it('should throw number validation failed', function() {
        (function() {
            config.setup.key_num = false;
            configVars.validate_against_schema(schema, config);
        }).should.throw(Error);
        (function() {
            config.setup.key_num = "string";
            configVars.validate_against_schema(schema, config);
        }).should.throw(Error);
    });

    it('should pass validation', function() {
        (function() {
            configVars.validate_against_schema(schema,config);
        }).should.not.throw(Error);
    })
});


describe('environment variables', function() {

    beforeEach(function() {
        process.env['setup__key_bool'] = 'true';
        process.env['setup__key_string'] = 'asdf';
        process.env['setup__key_num'] = '2';
    });

    it('should throw missing var error', function () {
        delete process.env['setup__key_string'];
        (function() {
            configVars.from_environment(schema);
        }).should.throw(Error);
    });

    it('should return with boolean', function(done) {
        expect(configVars.from_environment(schema).setup.key_bool).to.be.a('boolean').and.equal(true);
        process.env['setup__key_bool'] = 'false';
        expect(configVars.from_environment(schema).setup.key_bool).to.be.a('boolean').and.equal(false);
        process.env['setup__key_bool'] = 'TruE';
        expect(configVars.from_environment(schema).setup.key_bool).to.be.a('boolean').and.equal(true);

        process.env['setup__key_bool'] = 'sdfaglkfad';
        expect(configVars.from_environment(schema).setup.key_bool).to.be.a('boolean').and.equal(false);
        process.env['setup__key_bool'] = '5';
        expect(configVars.from_environment(schema).setup.key_bool).to.be.a('boolean').and.equal(false);
        done()
    });

    it('should return with string', function(done) {
        expect(configVars.from_environment(schema).setup.key_string).to.be.a('string').and.equal('asdf');
        process.env['setup__key_string'] = 'faLse';
        expect(configVars.from_environment(schema).setup.key_string).to.be.a('string').and.equal('faLse');
        process.env['setup__key_string'] = '5';
        expect(configVars.from_environment(schema).setup.key_string).to.be.a('string').and.equal('5');
        done()
    });

    it('should return with number', function(done) {
        expect(configVars.from_environment(schema).setup.key_num).to.be.a('number').and.equal(2);
        process.env['setup__key_num'] = 'faLse';
        expect(configVars.from_environment(schema).setup.key_num).to.be.a('number').and.NaN;
        process.env['setup__key_num'] = 'hdsg';
        expect(configVars.from_environment(schema).setup.key_num).to.be.a('number').and.NaN;
        done()
    });
});
