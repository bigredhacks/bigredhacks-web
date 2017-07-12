module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            dist: {
                files: [{
                    cwd: 'buildES6/js/',
                    src: '**/*.js',
                    dest: './build/js',
                    ext: '.js',
                    expand: true
                }]
            }
        },
        mochaTest: {
            all: {
                src: ['tests/**/*.js']
            },
            options: {
                reporter: 'spec',
                quiet: false,
                clearRequireCache: false
            }
        },
        babel: {
            options: {
                sourceMap: false
            },
            dist: {
                files: [{
                    cwd: 'public/js/',
                    src: '**/*.js',
                    dest: './buildES6/js',
                    ext: '.js',
                    expand: true
                }]
            }
        }
    });

    // Load plugins
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-babel');

    // Default task(s).
    grunt.registerTask('heroku', ['babel', 'uglify']);
    grunt.registerTask('test', ['mochaTest']);

};