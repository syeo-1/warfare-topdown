let user_id = document.getElementById("code").getAttribute("user_id");
let game_id = document.getElementById("code").getAttribute("game_id");


import Leaderboard from "/assets/js/leaderboard.js";

let projectiles = [];// store projectiles in array client side for now
var gameStarted = false;
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

let player_health;

let red_bar;
let green_bar;
let healthbar_label;


class BootScene extends Phaser.Scene {
    constructor() {
      super({
        key: 'BootScene',
        active: true
      });
    }
  
    preload() {
      // map tiles
      this.load.image('tiles', 'assets/map/spritesheet-extruded.png');
      // map in json format
      this.load.tilemapTiledJSON('map', 'assets/map/map.json');
      // our two characters
      this.load.spritesheet('player', 'assets/RPG_assets.png', {
        frameWidth: 16,
        frameHeight: 16
      });
  
      this.load.image('golem', 'assets/images/coppergolem.png');
      this.load.image('ent', 'assets/images/dark-ent.png');
      this.load.image('demon', 'assets/images/demon.png');
      this.load.image('worm', 'assets/images/giant-worm.png');
      this.load.image('wolf', 'assets/images/wolf.png');
      this.load.image('gun', 'assets/images/gun.png');

      // for the barriers
      this.load.image('barrier', 'assets/images/brick.png');

      // load small projectile image
      this.load.image('small_projectile', 'assets/images/small_projectile.png');

      // load health
      this.load.image('green_bar', 'assets/images/green_bar.png');
      this.load.image('red_bar', 'assets/images/red_bar.png');
    }
  
    create() {
      this.scene.start('WorldScene');
    }
}
  
class WorldScene extends Phaser.Scene {
  constructor() {
    super({
      key: 'WorldScene'
    });
  }

  create() {
    this.socket = io();
    let data = {user_id: user_id, game_id: game_id}
    this.socket.emit("new_player", data)
    this.otherPlayers = this.physics.add.group();


    this.redirect(this.socket);
    this.endGame(this.socket);

    // create map
    this.createMap();

    // add weapon
   



    // create player animations
    this.createAnimations();

    // create barriers
    this.createBarriers();
    

    // user input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.cursors = this.input.keyboard.addKeys({up:Phaser.Input.Keyboard.KeyCodes.W, down:Phaser.Input.Keyboard.KeyCodes.S, left:Phaser.Input.Keyboard.KeyCodes.A, right:Phaser.Input.Keyboard.KeyCodes.D});
    
    // initialize player heatlh
    player_health = 100;

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

    this.socket.on('startGame', function () {
      setTimeout(function(){
        gameStarted = true;
      }, 5000)
      
      
    }.bind(this))
    
    // listen for web socket events
    this.socket.on('currentPlayers', function (players) {
      Object.keys(players).forEach(function (id) {
        if (players[id].playerId === this.socket.id) {
          this.createPlayer(players[id]);
        } else {
          this.addOtherPlayers(players[id]);
        }
      }.bind(this));
    }.bind(this));
  
    this.socket.on('newPlayer', function (playerInfo) {
      this.addOtherPlayers(playerInfo);
    }.bind(this))

    this.socket.on('disconnect', function (playerId) {
      this.otherPlayers.getChildren().forEach(function (player) {
        if (playerId === player.playerId) {
          player.destroy();
        }
      }.bind(this));
    }.bind(this));

    this.socket.on('playerMoved', function (playerInfo) {
      this.otherPlayers.getChildren().forEach(function (player) {
        if (playerInfo.playerId === player.playerId) {
          if (playerInfo.key_pressed == 'left') {
            player.anims.play('left', true);
            player.weapon.x = playerInfo.x - 10
            player.weapon.y = playerInfo.y
            player.weapon.flipX = true
          } else if (playerInfo.key_pressed == 'right') {
            player.anims.play('right', true);
            player.weapon.x =  playerInfo.x + 10
            player.weapon.y = playerInfo.y
            player.weapon.flipX = false
          } else if (playerInfo.key_pressed == 'up') {
            player.anims.play('up', true);
            player.weapon.y = playerInfo.y
          } else if (playerInfo.key_pressed == 'down') {
            player.anims.play('down', true);
             player.weapon.y = playerInfo.y
          } else {
            player.anims.stop();
            
          }
          player.flipX = playerInfo.flipX;
          player.setPosition(playerInfo.x, playerInfo.y);
        }
      }.bind(this));
    }.bind(this));

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

    // wait for projectile hits from players
    this.socket.on('playerDamaged', function(playerInfo, shooterInfo) {
      
      this.otherPlayers.getChildren().forEach(function (player) {
        if (playerInfo.playerId === player.playerId) {
          
        }
      }.bind(this));
      if (playerInfo.playerId == this.socket.id) { // this player was killed -> respawn player
        this.player.setTint(0xFF0000);
        var me = this
        setTimeout(function(){
          if(playerInfo.team == 'A'){
            console.log("a")
            me.player.setTint(0x0000FF);
          }
          else{
            console.log("b")
            me.player.setTint(0x808080);
          }
        }, 100)
        // this.container.health -= 50;
        // console.log(this.container.health);
        // playerInfo.health -= 50;
        // console.log(playerInfo.health);
        if (playerInfo.health <= 0) {
          this.container.setPosition(playerInfo.respawn_x, playerInfo.respawn_y);
          this.container.x = playerInfo.respawn_x;
          this.container.y = playerInfo.respawn_y;
          playerInfo.health = 100;
        }
        green_bar.setScale((playerInfo.health / 100)*0.75, 0.75);// adjusts bar to proper width
        
      } else {
        this.otherPlayers.getChildren().forEach(function (player) { // update all other players of respawning player
          if (playerInfo.playerId === player.playerId) {
            player.health -= 20;
            player.setTint(0xFF0000);
            setTimeout(function(){
              if(playerInfo.team == 'A'){
                player.setTint(0x0000FF);
              }
              else{
                player.setTint(0x808080);
              }
            }, 100)
            
            if (playerInfo.health <= 0) {
              player.setPosition(playerInfo.respawn_x, playerInfo.respawn_y);
              player.x = playerInfo.respawn_x;
              player.y = playerInfo.respawn_y;
              playerInfo.health = 100;
            }
            
            // console.log("shot?");
          }
          
        }.bind(this));
      }
    }.bind(this));
  }

  redirect(socket){
    socket.on('redirect', function(destination) {
        window.location.href = destination;
    });
  }

  endGame(socket){
    socket.on('endGame', function(vars) {
      //update database here with user + game stats and then nav to game stats page
        window.location.href = "/post_game?game_id=" + game_id + "&user_id=" + user_id;
    });
  }

  createMap() {
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
  }

  createAnimations() {
    //  animation with key 'left', we don't need left and right as we will use one and flip the sprite
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [1, 7, 1, 13]
      }),
      frameRate: 10,
      repeat: -1
    });

    // animation with key 'right'
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [1, 7, 1, 13]
      }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'up',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [2, 8, 2, 14]
      }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'down',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [0, 6, 0, 12]
      }),
      frameRate: 10,
      repeat: -1
    });
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

  this.player = this.add.sprite(0, 0, 'player', 6);
  this.container.add(this.player);

  
  this.attacking = false;

  // update camera
  this.updateCamera();

  // don't go out of the map
  this.container.body.setCollideWorldBounds(true);

  this.physics.add.collider(this.container, this.spawns);
}


addOtherPlayers(playerInfo) {

  // add weapon
  var test = this.add.sprite(playerInfo.x + 13, playerInfo.y, 'gun');
  test.setScale(0.02);
  test.setSize(1, 1);
  
  const otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'player', 9);
  

  
  
  otherPlayer.weapon = test
  otherPlayer.playerId = playerInfo.playerId;
  this.otherPlayers.add(otherPlayer);
  // this.otherPlayers.add(test);
}


  updateCamera() {
    // limit camera to map
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.container);
    this.cameras.main.roundPixels = true; // avoid tile bleed
    
  }

  createBarriers() {
    // where the barriers will be
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
  }


  getValidLocation() {
    let validLocation = false;
    let x, y;
    while (!validLocation) {
      x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
      y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);

      let occupied = false;
      this.spawns.getChildren().forEach((child) => {
        if (child.getBounds().contains(x, y)) {
          occupied = true;
        }
      });
      if (!occupied) validLocation = true;
    }
    return { x, y };
  }


  update() {
    if (this.container) {
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

      var key_pressed = ''
      // Update the animation last and give left/right animations precedence over up/down animations
      if (this.cursors.left.isDown) {
        this.player.anims.play('left', true);
        
        this.player.flipX = true;
        this.weapon.x = this.player.x - 10
        this.weapon.flipX = true
        key_pressed = 'left';
      } else if (this.cursors.right.isDown) {
        this.player.anims.play('right', true);
        this.player.flipX = false;
        this.weapon.x = this.player.x + 10
        this.weapon.flipX = false
        key_pressed = 'right';
      } else if (this.cursors.up.isDown) {
        this.player.anims.play('up', true);
        key_pressed = 'up';
      } else if (this.cursors.down.isDown) {
        this.player.anims.play('down', true);
        key_pressed = 'down';
      } else {
        this.player.anims.stop();
      }

      // emit player movement
      let x = this.container.x;
      let y = this.container.y;
      let flipX = this.player.flipX;
      if (this.container.oldPosition && (x !== this.container.oldPosition.x || y !== this.container.oldPosition.y || flipX !== this.container.oldPosition.flipX)) {
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
    BootScene,
    WorldScene,
    Leaderboard
  ]
};

let game = new Phaser.Game(config);
