var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglifyjs');
var watch = require('gulp-watch');

var version = require('./package.json').version;

gulp.task('build', function() {

    return gulp.src('src/**/*.js').
        pipe(uglify(
            'hkml-' + version +'.js',
            {
                enclose : {
                    'this': 'root'
                },
                mangle : false,
                compress : false,
                output : {
                    beautify : true
                }
            }
        )
    ).pipe(gulp.dest('build/'));
});

gulp.task('build-min', function() {
    return gulp.src('src/**/*.js').
        pipe(uglify(
                'hkml-' + version +'.min.js',
                {
                    enclose : '$'
                }
            )
        ).
        pipe(gulp.dest('build/'));
});

gulp.task('example-js', function(){
    return gulp.src('build/**/*.js').pipe(gulp.dest('example/js'));
});