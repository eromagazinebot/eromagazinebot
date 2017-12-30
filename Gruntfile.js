/*global module:false*/
module.exports = function (grunt)
{

    // Project configuration.
    grunt.initConfig(
    {
        // Task configuration.
        jshint:
        {
            options:
            {
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                unused: true,
                boss: true,
                eqnull: true,
                browser: false,
                node: true,
                globals:
                {
                    jQuery: false
                },
                reporterOutput: '',
                laxbreak: true,
                esnext: true,
                reporter: 'node_modules/jshint-stylish'
            },
            gruntfile:
            {
                src: 'Gruntfile.js'
            },
            app:
            {
                options:
                {
                    reporterOutput: ''
                },
                
                src: './app/**/*.js'
            }
        },
        run:
        {
            app:
            {
                cmd: 'node',
                args: [
                    './app/main.js'
                ]
            }
        },
        watch:
        {
            gruntfile:
            {
                files: './Gruntfile.js',
                tasks: ['jshint:gruntfile']
            },
            app:
            {
                options: { spawn: false },
                files: './app/**/*.js',
                tasks: ['jshint:app']
            }
        }
    }
    );

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-run');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task.
    grunt.registerTask('default', ['jshint', 'run', 'watch']);
};
