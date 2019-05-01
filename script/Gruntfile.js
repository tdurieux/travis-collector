module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        bower: {
            dev: {
                dest: 'static/',
                js_dest: 'static/bower/js',
                css_dest: 'static/bower/css',
                options: {
                    packageSpecific: {
                        bootstrap: {
                            files: [
                                "dist/css/bootstrap.css",
                                "dist/css/bootstrap-grid.css",
                                "dist/css/bootstrap-reboot.css",
                            ]
                        }
                    }
                }
            }
        },
        uglify: {
            options: {
                mangle: false,
                compress: false
            },
            my_target: {
                files: {
                    'dist/js/angular.js': [
                        'static/bower/js/angular.js',
                        'static/bower/js/angular-route.js',
                        'static/bower/js/ui-bootstrap-tpls.js'
                    ],
                    'dist/js/jquery.js': ['static/bower/js/dist/jquery.js'],
                    'dist/js/underscore.js': ['static/bower/js/underscore.js'],
                    'dist/js/require.js': ['static/bower/js/require.js'],
                    'dist/js/script.js': ['static/js/script.js'],
                    'dist/js/rain.js': ['static/js/rain.js']
                }
            }
        },
        cssmin: {
            options: {
                mergeIntoShorthands: false,
                roundingPrecision: -1
            },
            target: {
                files: {
                    'dist/css/style.css': [
                        'static/bower/css/dist/css/bootstrap.css',
                        'static/bower/css/dist/css/bootstrap-grid.css',
                        'static/bower/css/dist/css/bootstrap-reboot.css',
                        'static/css/style.css'
                    ],
                    'dist/css/rain.css': [
                        'static/css/rain.css'
                    ]
                }
            }
        },
        htmlmin: {
            dist: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true
                },
                files: {
                    'dist/index.html': 'static/index.html',
                    'dist/rain.html': 'static/rain.html',
                    'dist/stat.html': 'static/stat.html'
                }
            }
        },
        copy: {
            dist: {
                files: [{ 
                    expand: true,
                    cwd: 'static/images/', 
                    src: ['**/*.{png,jpg,svg}'], 
                    dest:'dist/images/' 
                }]
            }
        },
        watch: {
            configFiles: {
                files: [ 'Gruntfile.js', 'config/*.js' ],
                options: {
                    reload: true
                }
            },
            scripts: {
                files: ['static/**/*.js'],
                tasks: ['uglify']
            },
            css: {
                files: ['static/**/*.css'],
                tasks: ['cssmin']
            },
            html: {
                files: ['static/**/*.html'],
                tasks: ['htmlmin']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-bower');

    grunt.registerTask('default', ['bower', 'uglify', 'cssmin', 'htmlmin', 'copy']);

    grunt.registerTask('dev', ['watch']);

};