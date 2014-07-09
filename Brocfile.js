var pickFiles = require('broccoli-static-compiler');
var reactify = require('broccoli-react');
var esnextify = require('broccoli-esnext');
var sassify = require('broccoli-sass');
var findBowerTrees = require('broccoli-bower');
var mergeTrees = require('broccoli-merge-trees');
var compileES6 = require('broccoli-es6-concatenator');

var dest = '';

var app = pickFiles('app', {
  srcDir: '/',
  destDir: dest
});

var index = pickFiles(app, {
  srcDir: '/',
  files: ['index.html'],
  destDir: dest
});

app = esnextify(app);
app = reactify(app);

var styles = pickFiles('app/styles', {
  srcDir: '/',
  destDir: dest
});

var vendor = 'vendor';

var sourceTrees = [app, styles, vendor];
sourceTrees = sourceTrees.concat(findBowerTrees());

var appAndDependencies = new mergeTrees(sourceTrees, { overwrite: true });

var appJs = compileES6(appAndDependencies, {
  loaderFile: 'loader.js',
  inputFiles: [
    dest + '**/*.js'
  ],
  legacyFilesToAppend: [
    'react/react-with-addons.js',
    'bilby/bilby.js'
  ],
  wrapInEval: false,
  outputFile: '/' + dest + '/application.js'
});

var appCss = sassify(sourceTrees, '/' + dest + '/main.scss', dest + '/styles/application.css');

module.exports = mergeTrees([index, appJs, appCss], {overwrite: true});
