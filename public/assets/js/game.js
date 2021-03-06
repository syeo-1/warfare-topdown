let user_id = document.getElementById("code").getAttribute("user_id");
let game_id = document.getElementById("code").getAttribute("game_id");


import Scoreboard from "/assets/js/scoreboard.js";

// store projectiles in array client side for now
var gameStarted = false;
var projectiles = [];
let red_bar;
let green_bar;
let healthbar_label;
var gameText;

let barrier_locations = [
  {x:125, y:0},
  {x:125, y:30},
  {x:125, y:50},
  {x:125, y:70},
  {x:125, y:90},
  {x:125, y:110},
  {x:125, y:130},
  {x:125, y:150},
  {x:125, y:170},
  {x:125, y:190},
  {x:145, y:190},
  {x:165, y:190},
  {x:185, y:190},
  {x:205, y:190},
  {x:225, y:190},
  {x:245, y:190},
  {x:265, y:190},
  {x:285, y:190},
  {x:305, y:190},
  {x:325, y:190},

  // team barriers
  {x:125, y:300},
  {x:125, y:320},
  {x:125, y:340},
  {x:400, y:300},
  {x:400, y:320},
  {x:400, y:340},

  // barrier scatterings
  {x:260, y: 265},
  {x:260, y: 370},
  {x:193, y: 420},
  {x:330, y: 420},
];


class PreGame extends Phaser.Scene {
    constructor() {
      super({
        key: 'PreGame',
        active: true
      });
    }
  
    preload() {
      // map tiles
      this.load.image('tiles', 'assets/map/spritesheet-extruded.png');
      // map in json format
      this.load.tilemapTiledJSON('map', 'assets/map/map.json');
      // our two characters
      this.load.spritesheet('guy', 'assets/players/players.png', {
        frameWidth: 16,
        frameHeight: 16
      });
      this.load.spritesheet('ghost', 'assets/players/players.png', {
        frameWidth: 16,
        frameHeight: 16
      });

      // for the barriers
      this.load.image('barrier', 'assets/images/bush.png');
      this.load.image('gun', 'assets/images/gun.png');

      // load small projectile image
      this.load.image('small_projectile', 'assets/images/small_projectile.png');

      // load health
      this.load.image('green_bar', 'assets/images/green_bar.png');
      this.load.image('red_bar', 'assets/images/red_bar.png');
    }
  
    create() {
      this.scene.start('Game');
    }
}
  
class Game extends Phaser.Scene {
  constructor() {
    super({
      key: 'Game'
    });
  }

  create() {
    this.socket = io();
    let data = {user_id: user_id, game_id: game_id}
    this.socket.emit("new_player", data)
    this.gamePlayers = this.physics.add.group();

    // add weapon
   


    
    this.createMap(); // create map singleton
    this.startGame();
    this.endGame();
    this.redirect();
    this.currentPlayers()
    this.newPlayer()
    this.userDisconnect()
    this.playerMoved()
    this.updateProjectiles()
    this.playerDamaged()
    this.killPlayer()

    
  }

  killPlayer(){
    this.socket.on('kill', function(playerInfo, killed){ // move to player class
      console.log(this.socket.id)
      if (playerInfo.socket_id == this.socket.id) { 
        
        gameText.setText("You Killed: " + killed);
        setTimeout(function(){
          gameText.setText("");
        }, 2000)
      }
    }.bind(this));
  }

  updateProjectiles(){
    // wait for projectile updates from players
    this.socket.on('updateProjectiles', function(server_projectiles) {
      // create projectiles. must keep in sync with server
      
      for (let i = 0 ; i < server_projectiles.length ; i++) { // not enough
        if (projectiles[i] == undefined) {
          let proj_sprite = this.add.sprite(server_projectiles[i].x, server_projectiles[i].y, 'small_projectile');
          proj_sprite.setScale(0.5);
          projectiles[i] = proj_sprite;

        } else {
          projectiles[i].x = server_projectiles[i].x;
          projectiles[i].y = server_projectiles[i].y;
        }
      }
      // too many. delete excess
      for (let i = server_projectiles.length ; i < projectiles.length ; i++) {
        projectiles[i].destroy();
        projectiles.splice(i,1);
        i--;
      }
    }.bind(this));
  }

  playerDamaged(){
    // wait for projectile hits from players
    this.socket.on('playerDamaged', function(playerInfo, shooterInfo) {
      if (playerInfo.socket_id == this.socket.id) { // this player was killed -> respawn player
        this.player.setTint(0xFF0000);
        var me = this
        setTimeout(function(){
          if(playerInfo.team == 'A'){
            console.log("a")
            me.player.setTint(0xFFFFFF);
          }
          else{
            console.log("b")
            me.player.setTint(0xFFFFFF);
          }
        }, 100)

        if (playerInfo.health <= 0) {
          this.container.setPosition(playerInfo.respawn_x, playerInfo.respawn_y);
          this.container.x = playerInfo.respawn_x;
          this.container.y = playerInfo.respawn_y;
          playerInfo.health = 100;
          gameText.setText("Killed by: " + shooterInfo.username);
          setTimeout(function(){
            gameText.setText("");
          }, 2000)
        }

        green_bar.setScale((playerInfo.health / 100)*0.75, 0.75);// adjusts bar to proper width

      } 
      else {
        this.gamePlayers.getChildren().forEach(function (player) { // update all other players of respawning player
          if (playerInfo.socket_id === player.socket_id) {
            player.health -= 20;
            player.setTint(0xFF0000);
            setTimeout(function(){
              // if(playerInfo.team == 'A'){
              //   player.setTint(0xFFFFFF);
              // }
              // else{
              //   player.setTint(0xFFFFFF);
              // }
              player.setTint(0xFFFFFF);
            }, 100)
            
            if (playerInfo.health <= 0) {
              player.setPosition(playerInfo.respawn_x, playerInfo.respawn_y);
              player.weapon.flipX = false;
              player.weapon.setPosition(playerInfo.respawn_x + 13, playerInfo.respawn_y);
              player.x = playerInfo.respawn_x;
              player.y = playerInfo.respawn_y;
              player.flipX = false
              playerInfo.health = 100;
            }
            
            // console.log("shot?");
          }
          
        }.bind(this));
      }
    }.bind(this));
  }

  playerMoved(){
    this.socket.on('playerMoved', function (playerInfo) {
      this.gamePlayers.getChildren().forEach(function (player) {
        if (playerInfo.socket_id === player.socket_id) {
          if (playerInfo.key_pressed == 'left' && playerInfo.team == 'A') {
            player.anims.play('guy_left', true);
            player.weapon.x = playerInfo.x - 10
            player.weapon.y = playerInfo.y
            player.weapon.flipX = true
          } else if (playerInfo.key_pressed == 'right' && playerInfo.team == 'A') {
            player.anims.play('guy_right', true);
            player.weapon.x =  playerInfo.x + 10
            player.weapon.y = playerInfo.y
            player.weapon.flipX = false
          } else if (playerInfo.key_pressed == 'up' && playerInfo.team == 'A') {
            player.anims.play('guy_up', true);
            player.weapon.y = playerInfo.y
          } else if (playerInfo.key_pressed == 'down' && playerInfo.team == 'A') {
            player.anims.play('guy_down', true);
            player.weapon.y = playerInfo.y
          } else if (playerInfo.key_pressed == 'left' && playerInfo.team == 'B') {
            player.anims.play('ghost_left', true);
            player.weapon.x = playerInfo.x - 10
            player.weapon.y = playerInfo.y
            player.weapon.flipX = true
          } else if (playerInfo.key_pressed == 'right' && playerInfo.team == 'B') {
            player.anims.play('ghost_right', true);
            player.weapon.x =  playerInfo.x + 10
            player.weapon.y = playerInfo.y
            player.weapon.flipX = false
          } else if (playerInfo.key_pressed == 'up' && playerInfo.team == 'B') {
            player.anims.play('ghost_up', true);
            player.weapon.y = playerInfo.y
          } else if (playerInfo.key_pressed == 'down' && playerInfo.team == 'B') {
            player.anims.play('ghost_down', true);
            player.weapon.y = playerInfo.y
          } else {
            player.anims.stop();
            // console.log("hello");
          }
          player.flipX = playerInfo.flipX;
          player.setPosition(playerInfo.x, playerInfo.y);
        }
      }.bind(this));
    }.bind(this));
  }

  userDisconnect(){
    this.socket.on('disconnect', function (socket_id) {
      this.gamePlayers.getChildren().forEach(function (player) {
        if (socket_id === player.socket_id) {
          player.weapon.destroy();
          player.destroy();
        }
      }.bind(this));
    }.bind(this));
  }
  newPlayer(){
    this.socket.on('newPlayer', function (playerInfo) {
      this.addGamePlayers(playerInfo);
    }.bind(this))
  }

  createMap() { // singleton
    // create the map
    this.map = this.make.tilemap({
      key: 'map'
    });

    // first parameter is the name of the tilemap in tiled
    let tiles = this.map.addTilesetImage('spritesheet', 'tiles', 16, 16, 1, 2);

    // creating the layers
    this.map.createStaticLayer('Grass', tiles, 0, 0);
    this.map.createStaticLayer('Obstacles', tiles, 0, 0);

    // don't go out of the map
    this.physics.world.bounds.width = this.map.widthInPixels;
    this.physics.world.bounds.height = this.map.heightInPixels;

    this.anims.create({
      key: 'ghost_left',
      frames: this.anims.generateFrameNumbers('ghost', {
        frames: [22, 28, 22, 34]
      }),
      frameRate: 10,
      repeat: -1
    });

    // animation with key 'right'
    this.anims.create({
      key: 'ghost_right',
      frames: this.anims.generateFrameNumbers('ghost', {
        frames: [22, 28, 22, 34]
      }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'ghost_up',
      frames: this.anims.generateFrameNumbers('ghost', {
        frames: [23, 29, 23, 35]
      }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'ghost_down',
      frames: this.anims.generateFrameNumbers('ghost', {
        frames: [21, 27, 21, 33]
      }),
      frameRate: 10,
      repeat: -1
    });
  
  

    //  animation with key 'left', we don't need left and right as we will use one and flip the sprite
    this.anims.create({
      key: 'guy_left',
      frames: this.anims.generateFrameNumbers('guy', {
        frames: [1, 7, 1, 13]
      }),
      frameRate: 10,
      repeat: -1
    });

    // animation with key 'right'
    this.anims.create({
      key: 'guy_right',
      frames: this.anims.generateFrameNumbers('guy', {
        frames: [1, 7, 1, 13]
      }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'guy_up',
      frames: this.anims.generateFrameNumbers('guy', {
        frames: [2, 8, 2, 14]
      }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'guy_down',
      frames: this.anims.generateFrameNumbers('guy', {
        frames: [0, 6, 0, 12]
      }),
      frameRate: 10,
      repeat: -1
    });
    // create where the barriers will be
    this.spawns = this.physics.add.group({
      classType: Phaser.GameObjects.Sprite
    });
    
    for (let i = 0; i < barrier_locations.length; i++) {
      const location = barrier_locations[i];//this.getValidLocation();
      // parameters are x, y, width, height
      let enemy = this.spawns.create(location.x, location.y, 'barrier');
      // save the location.x and location.y value to an array of xy value pairs of the barriers
      enemy.body.setCollideWorldBounds(true);
      enemy.body.setImmovable();
    }
     // user input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.cursors = this.input.keyboard.addKeys({up:Phaser.Input.Keyboard.KeyCodes.W, down:Phaser.Input.Keyboard.KeyCodes.S, left:Phaser.Input.Keyboard.KeyCodes.A, right:Phaser.Input.Keyboard.KeyCodes.D});


    // create health bar
    red_bar = this.add.image(90, 225, 'red_bar');
    red_bar.setScrollFactor(0,0);
    red_bar.setScale(0.75);
    // red_bar.setOrigin(0.5);

    green_bar = this.add.image(15, 218, 'green_bar');
    green_bar.setScrollFactor(0,0);
    green_bar.setScale(0.75);
    green_bar.setOrigin(0);

    // bar label
    healthbar_label = this.add.text(15, 200, 'Player Health', {fontFamily: 'Arial', fontSize: '14px'});
    healthbar_label.setScrollFactor(0,0);
    healthbar_label.setResolution(10);

    gameText = this.add.text(50, 140, "", { fontFamily: 'Arial', fontSize: '20px', color:'#FF0000' }).setScrollFactor(0,0);
  }

  startGame(){
    this.socket.on('startGame', function(vars) {
      setTimeout(function(){
        gameStarted = true;
      }, 10000)
    }.bind(this));
  }

  endGame(){
    this.socket.on('endGame', function(vars) {
        gameStarted = false
        window.location.href = "/post_game?game_id=" + game_id + "&user_id=" + user_id;
    }.bind(this));
  }

  redirect(){
    this.socket.on('redirect', function(destination) {
        window.location.href = destination;
    }.bind(this));
  }

  currentPlayers(){
    this.socket.on('currentPlayers', function (players) {
      Object.keys(players).forEach(function (id) {
        if (players[id].socket_id === this.socket.id) {
          this.createPlayer(players[id]);
        } else {
          this.addGamePlayers(players[id]);
        }
      }.bind(this));
    }.bind(this));
  }

  createPlayer(playerInfo) {
    // our player sprite created through the physics system
    this.container = this.add.container(playerInfo.x, playerInfo.y);
    this.container.setSize(16, 16);
    this.physics.world.enable(this.container);
    

    // add weapon
    this.weapon = this.add.sprite(13, 0, 'gun');
    this.weapon.setScale(0.02);
    this.weapon.setSize(1, 1);
    this.physics.world.enable(this.weapon);
    this.container.add(this.weapon);

    if(playerInfo.team == 'A'){
      this.player = this.add.sprite(0, 0, 'guy', 0);
      this.player.team = 'A';
    }
    else{
      this.player = this.add.sprite(0, 0, 'ghost', 21);
      this.player.team = 'B';
    }
    this.player.last_key = ''
    this.container.add(this.player);



    // update camera
    this.updateCamera();

    // don't go out of the map
    this.container.body.setCollideWorldBounds(true);

    this.physics.add.collider(this.container, this.spawns);
  }


  addGamePlayers(playerInfo) {
    // add weapon

    
    var weapon = this.add.sprite(playerInfo.x + 13, playerInfo.y, 'gun');
    weapon.setScale(0.02);
    weapon.setSize(1, 1);
    
    let otherPlayer;
    if(playerInfo.team == 'A'){
      otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'guy', 0);
    }
    else{
      otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'ghost', 21);
    }
    
    otherPlayer.weapon = weapon
    otherPlayer.socket_id = playerInfo.socket_id;
    this.gamePlayers.add(otherPlayer);
  }


  updateCamera() {
    // limit camera to map
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.container);
    this.cameras.main.roundPixels = true; // avoid tile bleed
    
  }


  update() {
    if (this.container && gameStarted) {
      this.container.body.setVelocity(0);

      // shooting
      if (this.input.mousePointer.isDown && !this.shooting) {
        
        
        // get player's canvas location
        let player_canvas_location_x = this.container.x - this.cameras.main.scrollX;
        let player_canvas_location_y = this.container.y - this.cameras.main.scrollY;

        // // get the mouse click location in canvas
        let mouse_x = this.input.mousePointer.x;
        let mouse_y = this.input.mousePointer.y;

        // only do things if the click is within the canvas area
        if ((mouse_x >= 0 && mouse_x <= 320) && (mouse_y >= 0 && mouse_y <= 240)) {

          let relative_click_x = mouse_x - player_canvas_location_x;
          let relative_click_y = mouse_y - player_canvas_location_y;


          if (relative_click_x === 0) { // prevent zero division error for arctan calculation
            relative_click_x = Number.MIN_VALUE;
          }
          let theta = Math.atan(relative_click_y / relative_click_x); // is correct if you click in quadrant 1

          // determine the actual radian value based on quadrant the relative mouse click is in
          // use game coord system (clockwise, starting at bottom right quadrant)
          // Q3 | Q4
          //____|____
          //    |
          // Q2 | Q1
          if (relative_click_x < 0 && relative_click_y > 0) { // inside quadrant 2
            theta += Math.PI;
          } else if (relative_click_x < 0 && relative_click_y < 0) { // inside quadrant 3
            theta += Math.PI;
          } else if (relative_click_x > 0 && relative_click_y < 0) { // inside quadrant 4
            theta += 2*Math.PI;
          } else if (relative_click_x === 0 && relative_click_y > 0) { // edge of quadrant 1 (clockwise)
            theta = Math.PI/2;
          } else if (relative_click_x < 0 && relative_click_y === 0) { // edge of quadrant 2
            theta = Math.PI;
          } else if (relative_click_x === 0 && relative_click_y < 0) { // edge of quadrant 3
            theta = 1.5 * Math.PI;
          } else if (relative_click_x > 0 && relative_click_y === 0) { // edge of quadrant 4
            theta = 0;
          }

          // calculate the x and y velocity of the bullet. Ensure overall speed is always 5 units
          let x_velo = 5 * Math.cos(theta);
          let y_velo = 5 * Math.sin(theta);

          // store time projectile was created so know when to remove projectile
          let date = new Date();// for ensuring projectile has limited range
          let fire_time = date.getTime();

          // add to projectile array server side
          this.socket.emit('playerShooting', {
            x: this.container.x,
            y: this.container.y,
            x_velo: x_velo,
            y_velo: y_velo,
            fire_time: fire_time
          })
          this.shooting = true;

        }
      } 
      if (!this.input.mousePointer.isDown) {
        this.shooting = false;
      }

      // Horizontal movement
      if (this.cursors.left.isDown) {
        this.container.body.setVelocityX(-80);
      } else if (this.cursors.right.isDown) {
        this.container.body.setVelocityX(80);
      }

      // Vertical movement
      if (this.cursors.up.isDown) {
        this.container.body.setVelocityY(-80);
      } else if (this.cursors.down.isDown) {
        this.container.body.setVelocityY(80);
      }

      var stopping  = false;
      var key_pressed = ''
      var stopping = false
      // Update the animation last and give left/right animations precedence over up/down animations
      if (this.cursors.left.isDown && this.player.team == 'A') {
        this.player.anims.play('guy_left', true);
        this.player.flipX = true;
        this.weapon.x = this.player.x - 10
        this.weapon.flipX = true
        key_pressed = 'left';
      } else if (this.cursors.right.isDown && this.player.team == 'A') {
        this.player.anims.play('guy_right', true);
        this.player.flipX = false;
        this.weapon.x = this.player.x + 10
        this.weapon.flipX = false
        key_pressed = 'right';
      } else if (this.cursors.up.isDown && this.player.team == 'A') {
        this.player.anims.play('guy_up', true);
        key_pressed = 'up';
      } else if (this.cursors.down.isDown && this.player.team == 'A') {
        this.player.anims.play('guy_down', true);
        key_pressed = 'down';
      } else if (this.cursors.left.isDown && this.player.team == 'B') {
        this.player.anims.play('ghost_left', true);
        this.player.flipX = true;
        key_pressed = 'left'
        this.weapon.x = this.player.x - 10
        this.weapon.flipX = true
      } else if (this.cursors.right.isDown && this.player.team == 'B') {
        this.player.anims.play('ghost_right', true);
        this.player.flipX = false;
        key_pressed = 'right';
        this.weapon.x = this.player.x + 10
        this.weapon.flipX = false
      } else if (this.cursors.up.isDown && this.player.team == 'B') {
        this.player.anims.play('ghost_up', true);
        key_pressed = 'up';
      } else if (this.cursors.down.isDown && this.player.team == 'B') {
        this.player.anims.play('ghost_down', true);
        key_pressed = 'down';
      } else {
        this.player.anims.stop();
        key_pressed = "stopped"
        if(this.player.last_key != "stopped"){
          stopping = true
        }
      }

      // emit player movement
      let x = this.container.x;
      let y = this.container.y;
      let flipX = this.player.flipX;
      if (stopping || this.container.oldPosition && (x !== this.container.oldPosition.x || y !== this.container.oldPosition.y || flipX !== this.container.oldPosition.flipX)) {
        this.player.last_key = key_pressed
        this.socket.emit('playerMovement', { x, y, flipX, key_pressed });
      }
      // save old position data
      this.container.oldPosition = {
        x: this.container.x,
        y: this.container.y,
        flipX: this.player.flipX
      };
    }
  }
}
  
let config = {
  type: Phaser.AUTO,
  parent: 'phasor',
  width: 320,
  height: 240,
  autoCenter: true,
  zoom: 3,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: {
        y: 0
      },
      debug: false // set to true to view zones
    }
  },
  scene: [
    PreGame,
    Game,
    Scoreboard
  ]
};

let game = new Phaser.Game(config);
