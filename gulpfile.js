const gulp = require('gulp');
const mincss = require('gulp-clean-css');
const minjs = require('gulp-minify');
const imagemin = require('gulp-imagemin');

/**
 * CSS preprocessing
 */
gulp.task('minify-css', () => {
    return gulp.src('css/*.css')
        .pipe(mincss({compatibility: 'ie8'}))
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
gulp.task('minify-img', () =>
    gulp.src('img/*.*')
        .pipe(imagemin())
        .pipe(gulp.dest('dist/img'))
);
  
/**
 * Default task profile
 */
gulp.task('default', [ 'minify-css', 'minify-js', 'minify-img' ]);