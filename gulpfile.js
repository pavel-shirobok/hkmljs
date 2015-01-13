var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglifyjs');
var watch = require('gulp-watch');

gulp.task('build', function() {
    var version = require('./package.json').version;
    return gulp.src('src/**/*.js').
        pipe(uglify(
            'hkml-' + version +'.js',
            {
                enclose : true,
                output : {
                    beautify : true
                }
            }
        )
    ).
                pipe(gulp.dest('build/'));
});

gulp.task('build-min', function() {
    var version = require('./package.json').version;
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