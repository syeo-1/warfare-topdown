const express = require('express');
const router = express.Router();
const query = require("../queryPool");
const waitingQueue = require("../waitingQueue")

router.get('/', function (req, res) {
  res.render('./index.html');
});


router.get('/game', function (req, res) {
  text = "select * from users where user_id = $1 and game_id = $2";
  values = [req.query.user_id, req.query.game_id];
  query(text, values, (err, result) => { // postgres database test
    if (err) return res.status(500).send(err)
    if(result.rowCount > 0){ // user and game exists, admit to game
      
      if(result.rows[0].in_game){
        res.render('./index.html', { root: null});
      }
      else{
        res.render('./game.html', { user_id: req.query.user_id, game_id: req.query.game_id, host: result.rows[0].host});
      }
      
    }
    else{ // user or game DNE
      res.render('./index.html', { root: null});
    }
  }) 
});


router.get('/post_game', function (req, res) {
  console.log("postGame")
  console.log(req.query)
  text = "select * from users inner join games on users.game_id = games.game_id where games.game_id = $1 and state = 'finished';"
  values = [req.query.game_id];
  query(text, values, (err, result) => { // postgres database test
    if (err) return res.status(500).send(err)
    if(result.rowCount > 0){ // user and game exists
      console.log(result.rows)
      res.render('./post_game.html', { user_id: req.query.user_id, game_id: req.query.game_id, result: result.rows});
    }
    else{ // user or game DNE
      res.render('./index.html', { root: null});
    }
  }) 
});


router.get('/game_test', function (req, res) {
  res.render('./game.html', { user_id: -1, game_id: -1, host: -1});
});


module.exports = router;