const e = require('express');
const express = require('express');
const router = express.Router();
const query = require("../queryPool");

router.get('/', function (req, res) {
  // see how many open spots there are for an open game
  var text = "select * from users;";
  var values = [];
  // query(text, values, (err, result) => { // postgres database test
  //   if (err) return res.status(500).send(err)
  //   console.log(result.rows)
  res.render('./game.html', { user_id: 1, game_id: 1});
  // })  
});

router.get('/game', function (req, res) {
  console.log("params")
  console.log(req.query)
  var text = "select * from users where user_id = $1 and game_id = $2";
  var values = [req.query.user_id, req.query.game_id];
  query(text, values, (err, result) => { // postgres database test
    if (err) return res.status(500).send(err)
    if(result.rowCount > 0){ // user and game exists, admit to lobby
      console.log(result.rows[0])
      if(result.rows[0].in_game){
        res.render('./index.html', { root: null});
      }
      else{
        res.render('./game.html', { user_id: req.query.user_id, game_id: req.query.game_id});
      }
      
    }

    else{ // user or game DNE
      res.render('./index.html', { root: null});
    }
    
  }) 
  
});


module.exports = router;