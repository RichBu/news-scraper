// Import dependencies.
var express = require('express');
var path = require('path');
var exphbs = require('express-handlebars');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

console.log('all packages loaded');

// Tell Mongoose to use ES6 promises.
mongoose.Promise = Promise;

var app = express();
var PORT = process.env.PORT || 3000;

// For the browser
app.use(express.static(path.join(__dirname, 'public')));
// Favicon
app.use(favicon(path.join(__dirname, 'public/assets/img', 'favicon.png')));

//start handlebars
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// body parser for routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// routes for routeer.  controller is default
var routes = require('./controllers/controller');
app.use('/', routes);

//local or remote connet
var connectionString;
if (process.env.PORT) {
    connectionString = 'mongodb://heroku_bcn7xp6x:mm2gqc6e2ceapg54uhqshm8rbr@ds019471.mlab.com:19471/heroku_bcn7xp6x';
} else {
    connectionString = 'mongodb://localhost/mongonews';
}

// Start app
mongoose.connect(connectionString).then(function() {
    app.listen(PORT, function() {
        console.log('App started and listening on  ' + PORT);
    });
});

