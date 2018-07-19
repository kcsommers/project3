require('dotenv').config();
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
var request = require('request'); // "Request" library
var axios = require('axios');
const spotify_key = (new Buffer(process.env.REACT_APP_SPOTIFY_KEY + ':' + process.env.REACT_APP_SPOTIFY_SECRET).toString('base64'))


router.post('/signup', (req,res) => {
  // see if the email is already in the DB
  User.findOne({email: req.body.email}, function(err, user) {
    if (user) {
      // if exist? alert the user that email is taken
      res.status(401).json({
        error: true,
        message: 'Email already exists'
      });
    } else {
      // else: create user in DB
      User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
      }, function(err, user) {
        // check for db errs
        if (err) {
          console.log(err);
          res.status(401).json({
            error: true,
            message: 'There was an error creating the user!'
          });
        } else {
          // log them in (sign a new token)
          var token = jwt.sign(user.toObject(), process.env.JWT_SECRET, {
            expiresIn: 60 * 60 * 24
          })
          // return user and token to frontend app
          res.json({user, token});
        }
      })
    }
  })
})

router.post('/login', (req, res) => {
  // Look up user in DB by email
  User.findOne({email: req.body.email}, function(err, user) {
    if (user) {
      // if user: check password input against hash
      if (user.authenticated(req.body.password)) {
        // if match: sign a token
        var token = jwt.sign(user.toObject(), process.env.JWT_SECRET, {
          expiresIn: 60 * 60 * 24
        })
        res.json({
          user, 
          token,
          message: 'You have logged in!'
        });
      } else {
        // else send error to frontend
        res.json({
          status: 401,
          error: true,
          message: 'Email or password is incorrect.'
        })
      }
    } else {
      // else send error to frontend
      res.json({
        error: true,
        status: 401,
        message: 'Account not found'
      });
    }
  })
});

router.post('/me/from/token', (req,res) => {
  let token = req.body.token;
  // check for presence of a token
  if (!token) {
    // no token sent
    res.status(401).json({
      error: true,
      message: 'You must pass a token'
    })
  } else {
    // token sent
    // validate the token
    jwt.verify(token, process.env.JWT_SECRET, function(err, user) {
      if (err) {
        res.status(401).json(err);
      } else {
        User.findById(user._id, function(err, user) {
          // if valid: lookup user in DB based on token info => send user and token back to frontend
          // else: send err
          if (err) {
            res.status(401).json(err);
          } else {
            res.json({user, token});
          }
        })
      }
    })
  }
})

router.post('/get/spotify/token',  (req, res) => {
  var options = {
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        'Authorization': 'Basic ' + spotify_key.toString()
      },
      form: {
        grant_type: 'client_credentials'
      },
    json: true};
    request.post(options, function(error, response, body) {
      res.json(body);
  });
})



module.exports = router;
