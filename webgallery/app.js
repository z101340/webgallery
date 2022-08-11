const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const session = require('express-session');
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('static'));

app.use(session({
    secret: 'please change this secret',
    resave: false,
    saveUninitialized: true,
}));

app.use(function (req, res, next){
    // var cookies = cookie.parse(req.headers.cookie || '');
    req.username = (req.session.username)? req.session.username : null;
    console.log("HTTP request", req.username, req.method, req.url, req.body);
    next();
});

var isAuthenticated = function(req, res, next) {
    if (!req.username) return res.status(401).end("access denied");
    next();
};

var Datastore = require('nedb')
  , comments = new Datastore({ filename: 'db/comments.db', autoload: true})
  , images = new Datastore({ filename: 'db/images.db', autoload: true })
  , users = new Datastore({ filename: 'db/users.db', autoload: true });


var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });

// Create
// new user
app.post('/signup/', function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    
    var salt = crypto.randomBytes(16).toString('base64');
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    password = hash.digest('base64');

    console.log(salt, password);
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (user) return res.status(409).end("username " + username + " already exists");
        users.update({_id: username},{_id: username, password, salt}, {upsert: true}, function(err){
            if (err) return res.status(500).end(err);
            // initialize cookie
            res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                  path : '/', 
                  maxAge: 60 * 60 * 24 * 7
            }));
            return res.json("user " + username + " signed up");
        });
    });
});

// new picture
app.post('/api/image/',isAuthenticated, upload.single('picture'), function (req, res, next) {
    // store req.file in the database
    var image = {};

    image.date = Date();
    image.title = req.body.title;
    image.author = req.username;
    image.pic = req.file;


    images.insert(image, function(err, image){
        if (err) {
            return res.status(500).end(err);
        }
        else{
            return res.redirect('/');
        }
    });
});

// add new comment
app.post('/api/comments/', isAuthenticated, function (req, res, next) {

    var comment = {};

    comment.date = Date();
    comment.author = req.username;
    comment.content = req.body.content;
    comment.imgId = req.body.imageId;

    comments.insert(comment, function (err, user) {
        if (err){
            return res.status(500).end(err);
        } else{
            return res.redirect('/');
        }
    });
});

// Read
// sign in
app.post('/signin/', function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    // retrieve user from the database
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (!user) return res.status(401).end("access denied");
        var hash = crypto.createHmac('sha512', user.salt);
        hash.update(password);
        password = hash.digest('base64');
        if (user.password !== password) return res.status(401).end("access denied");
        // store into session
        req.session.username = user._id;
        // initialize cookie
        res.setHeader('Set-Cookie', cookie.serialize('username', req.session.username, {
              path : '/', 
              maxAge: 60 * 60 * 24 * 7
        }));
        return res.json("user " + username + " signed in");
    });
});

// sign out
app.get('/signout/', isAuthenticated, function (req, res, next) {
    req.session.destroy();
    res.setHeader('Set-Cookie', cookie.serialize('username', '', {
          path : '/', 
          maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));
    res.redirect('/');
});

// get image by id
app.get('/api/image/:id/', isAuthenticated, function (req, res, next) {
    images.findOne({_id : req.params.id}, function(err, data){
        if(data == null){
            res.status(404).end('image ' + req.params.id + ' does not exists');
        }else if (err){
            return res.status(500).end(err);
        }
        else{
            res.setHeader('Content-Type', data.pic.mimetype);
            res.sendFile(data.pic.path, { root: '.' });
        }
    });
});

// get comments by id
app.get('/api/comments/:id/',isAuthenticated, function (req, res, next) {
    comments.find({imgId : req.params.id}, function(err, data){
        if(data.length == 0){
            res.status(404).end('image ' + req.params.id + ' does not exists');
        }else if (err) {
            return res.status(500).end(err);
        }
        else{
            return res.json(data);
        }
    });
});

// get all comments
app.get('/api/comments/',isAuthenticated, function (req, res, next){
    comments.find({}, function(err, data){
        if(data.length == 0){
            res.status(404).end("no comments");
        }else if (err) {
            return res.status(500).end(err);
        }
        else{
            res.json(data);
        }
    });
});

// get all image
app.get('/api/image/',isAuthenticated, function(req, res, next){
    images.find({author : req.username}, function(err, data){
        if(data.length == 0){
            res.status(404).end("no image yet");
        }else if (err) {
            return res.status(500).end(err);
        }
        else{
            res.json(data);
        }
    });
});

// Delete
app.delete('/api/image/:id/',isAuthenticated, function (req, res, next) {
    images.remove({ _id: req.params.id}, {}, function (err, numRemoved) {
        // numRemoved = 1
        if(numRemoved != 1){
            return res.status(404).end("image id:" + req.params.id + " does not exists");
        } 
        else if (err) {
            return res.status(500).end(err);
        }
      });
    return res.redirect('/');
});

app.delete('/api/comments/:id/',isAuthenticated, function(req, res, next){
    comments.find({_id: req.params.id}, function(err, data){
        var imgId = data.imgId;
        if (err) {
            return res.status(500).end(err);
        }
        else{
            comments.remove({_id: req.params.id}, {}, function(err, numRemoved){
                if(numRemoved != 1){
                        return res.status(404).end("comment id:" + req.params.id + " does not exists");
                    }
                else if (err) {
                    return res.status(500).end(err);
                }
            });
            comments.find({imgId: imgId}).sort({createdAt:-1}).limit(5).exec(function(err, data) { 
                if (err) {
                    return res.status(500).end(err);
                }
                else{
                    return res.json(data);
            }
        });
        }
    });
});


const http = require('http');
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});