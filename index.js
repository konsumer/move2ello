var express = require('express'),
	exphbs  = require('express-handlebars'),
	graph = require('fbgraph'),
	app = express(),
	cookieParser = require('cookie-parser'),
	bodyParser = require('body-parser'),
	errorHandler = require('errorhandler'),
	mongoose = require('mongoose'),
	fs = require('fs'),
	path = require('path'),
	port = parseInt(process.env.PORT, 10) || 4567;

// load config
if (fs.existsSync(path.join(__dirname, '.env'))) {
	var env = require('node-env-file');
	env('.env');
}

if (!process.env.MONGOHQ_URL && !process.env.MONGOLAB_URI && !process.env.MONGOSOUP_URL && !process.env.MONGO_URI) {
	console.log('You need to set MONGOHQ_URL, MONGOLAB_URI, MONGOSOUP_URL, or MONGO_URI environment variables.')
	process.exit(1);
}

if (!process.env.FACEBOOK_APP_ID && !process.env.FACEBOOK_APP_SECRET) {
	console.log('You need to set FACEBOOK_APP_ID & FACEBOOK_APP_SECRET environment variables.')
	process.exit(1);
}

var mongo_url = process.env.MONGOHQ_URL || process.env.MONGOLAB_URI || process.env.MONGOSOUP_URL || process.env.MONGO_URI;

// pre-configure mongoose
mongoose.connect(mongo_url, {auto_reconnect: true});
mongoose.connection.on('error', function(e) {
	console.log('Mongoose Error:', e)
});

var Friend = mongoose.model('Friend', new mongoose.Schema({
	ello: {type: String},
	fb: {type: String, required:true, unique:true},
	name: {type: String}
}));

app.use(errorHandler({
	dumpExceptions: true,
	showStack: true
}));

var hbs = exphbs.create({
    helpers: {
        json: function (obj) { return JSON.stringify(obj); }
    }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// MIDDLEWARE: require facebook proper auth & saved record
function requireUser(req, res, next){
	if (!req.cookies.token) return res.redirect('/auth');
	graph.setAppSecret(process.env.FACEBOOK_APP_SECRET);
	graph.setAccessToken(req.cookies.token);
	graph.get('/me', function(err, fb){
		if(err) return res.status(500).send(err);
		Friend.findOne({'fb':fb.id},function(err, me){
			if(err) return res.status(500).send(err);
			if (!me){
				me = new Friend({'fb':fb.id, 'name':fb.name});
				me.save();
			}
			req.me = me;
			next();
		});
	});
}

// display index
app.get('/', requireUser, function(req, res){
	graph.get('/me/friends', function(err, fbres){
		if(err) return res.status(500).send(err);
		if (!fbres || !fbres.data) return res.status(500).send('could not get your friend data.');

		Friend.find()
			.where('fb').in(fbres.data.map(function(friend){ return friend.id; }))
			.exec(function(err, people){
				if (err) return res.status(500).send(err);
				res.render('index', {me:req.me, friends:people});
			});
	});
});

// save ello username
app.post('/save', requireUser, function(req, res){
	req.me.ello = req.body.ello;
	req.me.save(function(err){
		if(err) return res.status(500).send(err);
		res.redirect('/');
	});
});

// forget record
app.get('/forget', requireUser, function(req, res){
	req.me.remove(function(){
		res.redirect('/');
	});
});

// authenticate using Facebook, save token in cookie
app.get('/auth', function(req, res){
	var redirect_uri = 'https://' + req.get('host') + '/auth';
	if (!req.query.code) {
		var authUrl = graph.getOauthUrl({
			'client_id': process.env.FACEBOOK_APP_ID,
			'redirect_uri': redirect_uri,
			'scope': 'user_friends'
		});
		if (!req.query.error) {
			res.redirect(authUrl);
		} else {
			res.send('access denied');
		}
		return;
	}
	graph.authorize({
		'client_id': process.env.FACEBOOK_APP_ID,
		'redirect_uri': redirect_uri,
		'client_secret': process.env.FACEBOOK_APP_SECRET,
		'code': req.query.code
	}, function (err, facebookRes) {
		res.cookie('token', facebookRes.access_token, {maxAge: facebookRes.expires});
		res.redirect('/');
	});
});


console.log('server listening at http://localhost:' + port);
app.listen(port);