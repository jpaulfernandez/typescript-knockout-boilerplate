// Include gulp plugins
var gulp = require('gulp');
var sass = require('gulp-sass');
var sassGlob = require('gulp-sass-glob');
var $ = require('gulp-load-plugins')({ lazy: true });
var browsersync = require('browser-sync');
var del = require('del');
var config = require('./config.js')();
var ts = require('gulp-typescript');
var tsify = require('tsify');
var browserify = require('browserify');
var uglify = require('gulp-uglify');
var vsource = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var buffer = require('vinyl-buffer');


// Configs
var
  devBuild = (( config.environment || process.env.NODE_ENV || 'development').trim().toLowerCase() !== 'production'),
  source = config.source[--config.source.length] == '/' ? config.source : config.source + '/',
  dest = config.build[--config.build.length] == '/' ? config.build : config.build + '/',
  pkg = require('./package.json'),
  images = {
    in: source + (config.images[--config.images.length] == '/' ? config.images + '**/*.*' : config.images + '/**/*.*'),
    out: dest + config.images
  },
  views = {
    in: source + (config.views[--config.views.length] == '/' ? config.views + '*.pug' : config.views + '/*.pug'),
    out: dest,
    watch: source + (config.views[--config.views.length] == '/' ? config.views + '**/*' : config.views + '/**/*')
  },
  styles = {
    in: source + config.sass,
    watch: [source + config.sass.substring(0, (config.sass.lastIndexOf('/')+1)) + '**/*'],
    out: dest + (config.css[--config.css.length] == '/' ? config.css : config.css + '/'),
    sassOpt: {
      outputStyle: config.sassOptions.outputStyle || 'expanded',
      imagePath: config.sassOptions.imagePath,
      precision: config.sassOptions.precision || 3,
      errLogToConsole: true
    },
    pleeeaseOpt: {
      autoprefixer: { browsers: ['last 2 versions', '> 2%'] },
      rem: ['16px'],
      pseudoElements: true,
      mqpacker: true,
      minifier: !devBuild
    }
  },
  js = {
    in: source + (config.jsDir[--config.jsDir.length] == '/' ? config.jsDir + '**/*' : config.jsDir + '/**/*'),
    out: dest + config.jsDir,
    filename: config.jsName
  },
  syncOpt = {
    server: {
      baseDir: dest,
      index: config.syncOptions.index || 'index.html'
    },
    open: config.syncOptions.open || false,
    notify: config.syncOptions.notify || true
  },
  pugOptions = { pretty: devBuild, basedir: source + config.views },
  vendors = {
    in: source + (config.vendors[--config.vendors.length] == '/' ? config.vendors + '**/*' : config.vendors + '/**/*'),
    out: dest + (config.vendors[--config.vendors.length] == '/' ? config.vendors : config.vendors + '/'),
    watch: [source + (config.vendors[--config.vendors.length] == '/' ? config.vendors + '**/*' : config.vendors + '/**/*')]
  };

console.log(pkg.name + ' ' + pkg.version + ' ' + config.environment + ' build');

/**
 * Tasks
 */
//Clean the build folder
gulp.task('clean', function () {
  log('-> Cleaning build folder')
  del([
    dest + '*'
  ]);
});

gulp.task('browserify', function(){
  
  if(devBuild)
  {
    log('-> bundling Javascript for development');
    return browserify({
                basedir: '.',
                debug: true,
                entries: ['source/assets/js/app.ts'],
                cache: {},
                packageCache: {}
            })
            .pipe($.plumber())
            .plugin(tsify)
            .bundle()
            .pipe(vsource('bundle.js'))
            .pipe(gulp.dest(js.out));
  }
  else
  {
    log('-> bundling Javascript for Production');
    return browserify({
                basedir: '.',
                debug: false,
                entries: ['source/assets/js/app.ts'],
                cache: {},
                packageCache: {}
            })
            .plugin(tsify)
            .bundle()
            .pipe(vsource('bundle.js'))
            .pipe(buffer())
            .pipe(sourcemaps.init({loadMaps: true}))
            .pipe(uglify())
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest(js.out));
  }

});

gulp.task('compile-ts', () => 
{ console.log('=======Compiling Typescript=======');
  gulp.src(dir.ts + '*.ts')
    .pipe(ts({
      noImplicitAny: true
    }))
    .pipe(gulp.dest('build/js'));
});

// Update images on build folder
gulp.task('images', function () {
  return gulp.src( images.in )
    .pipe($.newer(images.out))
    .pipe(gulp.dest(images.out));
});

// Update Favicon on build folder
gulp.task('favicon', function () {
  return gulp.src(source + config.favicon)
    .pipe($.newer(dest))
    .pipe(gulp.dest(dest));
});


// Copy all vendors to build folder
gulp.task('vendors', function () {
  return gulp.src(vendors.in)
    .pipe($.newer(vendors.out))
    .pipe(gulp.dest(vendors.out));
});

//Compile Pug templates
gulp.task('pug', function () {
  log('-> Compiling Pug Templates')

  var templates = gulp.src(views.in)
    .pipe($.plumber())
    .pipe($.newer(views.out));
  if (!devBuild) {
    log('-> Compressing templates for Production')
    templates = templates
      .pipe($.size({ title: 'pug Templates Before Compression' }))
      .pipe($.pug())
      .pipe($.size({ title: 'pug Templates After Compression' }));
  } else {
    templates.pipe($.pug(pugOptions));
  }
  return templates.pipe(gulp.dest(views.out));
});

// Compile Sass styles
gulp.task('sass', function () {
  log('-> Compile SASS Styles')
  return gulp.src(styles.in)
    .pipe($.plumber())
    .pipe(sassGlob())
    .pipe($.sass(styles.sassOpt))
    .pipe($.size({ title: 'styles In Size' }))
    .pipe($.pleeease(styles.pleeeaseOpt))
    .pipe($.size({ title: 'styles Out Size' }))
    .pipe(gulp.dest(styles.out))
    .pipe(browsersync.reload({ stream: true }));
});

// Compile Typescript
gulp.task('ts', function(){
  log('-> Compile Typescript');
  return gulp.src()
});

// Start BrowserSync
gulp.task('browsersync', function () {
  log('-> Starting BrowserSync')
  browsersync(syncOpt);
});

// Build Task [js]
gulp.task('build', ['sass', 'pug', 'browserify', 'images', 'vendors', 'favicon']);

// Watch Task
gulp.task('watch', ['browsersync'], function () {
  // Watch for style changes and compile
  gulp.watch(styles.watch, ['sass']);
  // Watch for pug changes and compile
  gulp.watch(views.watch, ['pug', browsersync.reload]);
  // Watch for javascript changes and compile
  gulp.watch(js.in, ['browserify', browsersync.reload]);
  // Watch for new vendors and copy
  gulp.watch(vendors.watch, ['vendors']);
  // Watch for new images and copy
  gulp.watch(images.in, ['images']);
});

// Compile and Watch task
gulp.task('start', ['build', 'watch']);

// Help Task
gulp.task('help', function () {
  console.log('');
  console.log('===== Help for Typescript-Knockout-boilerplate =====');
  console.log('');
  console.log('Usage: gulp [command]');
  console.log('The commands for the task runner are the following.');
  console.log('-------------------------------------------------------');
  console.log('       clean: Removes all the compiled files on ./build');
  console.log('          js: Compile the JavaScript files');
  console.log('        pug: Compile the Pug templates');
  console.log('        sass: Compile the Sass styles');
  console.log('      images: Copy the newer to the build folder');
  console.log('     favicon: Copy the favicon to the build folder');
  console.log('     vendors: Copy the vendors to the build folder');
  console.log('       build: Build the project');
  console.log('       watch: Watch for any changes on the each section');
  console.log('       start: Compile and watch for changes (for dev)');
  console.log('        help: Print this message');
  console.log(' browsersync: Start the browsersync server');
  console.log('');
});

// Default Task
gulp.task('default', ['help']);

/**
 * Custom functions
 */
 function log(msg) {
   console.log(msg);
}

