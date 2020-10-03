const express = require('express');
const router = express.Router();
const query = require("../queryPool");

router.get('/', function (req, res) {
  text = "select * from users;";
  values = [];
  query(text, values, (err, result) => { // postgres database test
    if (err) return res.status(500).send(err)
    console.log(result.rows)
    res.sendFile('./public/index.html', { root: __dirname + "/.." });
  })  
});

router.get('/game', function (req, res) {
  res.sendFile('./public/game.html', { root: __dirname + "/.." });
});
  module.exports = router;