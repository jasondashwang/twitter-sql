'use strict';
var express = require('express');
var router = express.Router();
// var tweetBank = require('../tweetBank');

module.exports = function makeRouterWithSockets (io, client) {

  // a reusable function
  function respondWithAllTweets (req, res, next){
    client.query('SELECT * FROM tweets INNER JOIN users ON tweets.userid = users.id', function (err, result) {
      if (err) return next(err); // pass errors to Express
      var tweets = result.rows;
      res.render('index', { title: 'Twitter.js', tweets: tweets, showForm: true });
    });
  }

  // here we basically treet the root view and tweets view as identical
  router.get('/', respondWithAllTweets);
  router.get('/tweets', respondWithAllTweets);

  // single-user page
  router.get('/users/:username', function(req, res, next){
    var username = req.params.username;

    client.query('SELECT tweets.content, tweets.id AS id, users.id AS userId, users.name AS name, users.pictureurl AS pictureurl FROM tweets INNER JOIN users ON tweets.userid = users.id WHERE userid = $1', [username], function (err, result) {
      if (err) return next(err); // pass errors to Express
      var tweets = result.rows;
      res.render('index', { title: 'User Page', tweets: tweets, showForm: true, username: req.params.username });
    });
  });

  // single-tweet page
  router.get('/tweets/:id', function(req, res, next){
    var tweetId = req.params.id;

    client.query('SELECT tweets.content, tweets.id AS id, users.id AS userId, users.name AS name, users.pictureurl AS pictureurl FROM tweets INNER JOIN users ON tweets.userid = users.id WHERE tweets.id = $1', [tweetId], function (err, result) {
      if (err) return next(err); // pass errors to Express
      var tweets = result.rows;
      res.render('index', { title: 'User Page', tweets: tweets, showForm: false });
    });
  });

  // create a new tweet
  router.post('/tweets', function(req, res, next){
    var name = req.body.name;
    var content = req.body.content;
    var newTweet;
    var user;

    client.query("SELECT * FROM users WHERE name = $1", [name], function (err, result) {
      if (err) return next(err); // pass errors to Express
      user = result.rows[0];
      if(user === undefined){
      // Make new user and insert the tweet
        client.query('INSERT INTO users (name) VALUES ($1)', [name], function (err, result) {
          if (err) return next(err); // pass errors to Express
          client.query("SELECT * FROM users WHERE name = $1", [name], function (err, result) {
            if (err) return next(err); // pass errors to Express
            user = result.rows[0];


            client.query('INSERT INTO tweets (userid, content) VALUES ($1, $2)', [user.id, content], function (err, result) {
              if (err) return next(err);

              client.query('SELECT * FROM tweets WHERE userid = $1 AND content = $2', [user.id, content], function (err, result) {
                if (err) return next(err); // pass errors to Express
                newTweet = result.rows[0];
                io.sockets.emit('new_tweet', newTweet);
                res.redirect('/');
              });
            });
          });
        });
      } else {
        client.query('INSERT INTO tweets (userid, content) VALUES ($1, $2)', [user.id, content], function (err, result) {
          if (err) return next(err); // pass errors to Express

          client.query('SELECT * FROM tweets WHERE userid = $1 AND content = $2', [user.id, content], function (err, result) {
            if (err) return next(err); // pass errors to Express
            newTweet = result.rows[0];
            io.sockets.emit('new_tweet', newTweet);
            res.redirect('/');
          });
        });
      }
    });




  });

  // // replaced this hard-coded route with general static routing in app.js
  // router.get('/stylesheets/style.css', function(req, res, next){
  //   res.sendFile('/stylesheets/style.css', { root: __dirname + '/../public/' });
  // });

  return router;
};
