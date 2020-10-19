const express = require('express');
const router = express.Router();
const query = require("../queryPool");

router.get('/', function (req, res) {
  // see how many open spots there are for an open game
  text = "select * from users;";
  values = [];
  query(text, values, (err, result) => { // postgres database test
    if (err) return res.status(500).send(err)
    console.log(result.rows)
    res.render('./index.html', { root: null});
  })  
});

router.get('/game', function (req, res) {
  // get user info but make sure that there is err handling for replacement of url params
  res.render('./game.html', { user_id: 13});
});

module.exports = router;