const gulp = require('gulp');
const mincss = require('gulp-clean-css');
const minjs = require('gulp-minify');
const imagemin = require('gulp-imagemin');
const webp = require('gulp-webp');

/**
 * CSS preprocessing
 */
gulp.task('minify-css', () => {
    return gulp.src('css/*.css')
        .pipe(mincss({compatibility: 'ie9'}))
        .pipe(gulp.dest('dist/css'));
});

/**
 * JavaScript preprocessing
 */
gulp.task('minify-js', () => {
    return gulp.src('js/*.js')
    .pipe(minjs({
        ext:{
            src:'-debug.js',
            min:'.js'
        }
    }))
    .pipe(gulp.dest('dist/js'));
});

/**
 * Image preprocessing
 */
gulp.task('optimize-img', () => {
     gulp.src('img/*.*')
        .pipe(webp())
        .pipe(gulp.dest('dist/img'));
    
});
  
/**
 * Default task profile
 */
gulp.task('default', [ 'minify-css', 'minify-js', 'optimize-img' ]);