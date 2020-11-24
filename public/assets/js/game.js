let user_id = document.getElementById("code").getAttribute("user_id");
let game_id = document.getElementById("code").getAttribute("game_id");


import Leaderboard from "/assets/js/leaderboard.js";

let projectiles = [];// store projectiles in array client side for now
var gameStarted = false;




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
      this.load.image('sword', 'assets/images/attack-icon.png');

      // load small projectile image
      this.load.image('small_projectile', 'assets/images/small_projectile.png');
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



    // create player animations
    this.createAnimations();
    

    // user input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.cursors = this.input.keyboard.addKeys({up:Phaser.Input.Keyboard.KeyCodes.W, down:Phaser.Input.Keyboard.KeyCodes.S, left:Phaser.Input.Keyboard.KeyCodes.A, right:Phaser.Input.Keyboard.KeyCodes.D});
    

    this.socket.on('startGame', function () {
      setTimeout(function(){
        gameStarted = true;
      }, 5000)
      
      
    }.bind(this))
    // create enemies
    //this.createEnemies();
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
          player.flipX = playerInfo.flipX;
          player.setPosition(playerInfo.x, playerInfo.y);
        }
      }.bind(this));
    }.bind(this));

    // wait for projectile updates from players
    this.socket.on('updateProjectiles', function(server_projectiles) {
      // create projectiles. must keep in sync with server
      // console.log("client updated by server")
      for (let i = 0 ; i < server_projectiles.length ; i++) { // not enough
        if (projectiles[i] == undefined) {
          projectiles[i] = this.add.sprite(server_projectiles[i].x, server_projectiles[i].y, 'small_projectile');
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
    this.socket.on('playerDamaged', function(playerInfo) {
      if (playerInfo.playerId == this.socket.id) { // this player was killed -> respawn player

        this.container.setPosition(playerInfo.respawn_x, playerInfo.respawn_y);
        this.container.x = playerInfo.respawn_x;
        this.container.y = playerInfo.respawn_y;
        // need some sort of text for this user being killed
        
      } else {
        this.otherPlayers.getChildren().forEach(function (player) { // update all other players of respawning player
          if (playerInfo.playerId === player.playerId) {
            player.setPosition(playerInfo.respawn_x, playerInfo.respawn_y);
            player.x = playerInfo.respawn_x;
            player.y = playerInfo.respawn_y;
            console.log(playerInfo);
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
  this.player = this.add.sprite(0, 0, 'player', 6);
  if(playerInfo.team == 'A'){
    this.player.setTint(0x0000FF);
  }
  else{
    this.player.setTint(0xFF0000);
  }

  this.container = this.add.container(playerInfo.x, playerInfo.y);
  this.container.setSize(16, 16);
  this.physics.world.enable(this.container);
  this.container.add(this.player);

  // update camera
  this.updateCamera();

  // don't go out of the map
  this.container.body.setCollideWorldBounds(true);

  this.physics.add.collider(this.container, this.spawns);
}


addOtherPlayers(playerInfo) {
  const otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'player', 9);
  if(playerInfo.team == 'A'){
    otherPlayer.setTint(0x0000FF);
  }
  else{
    otherPlayer.setTint(0xFF0000);
  }
  
  otherPlayer.playerId = playerInfo.playerId;
  this.otherPlayers.add(otherPlayer);
}


  updateCamera() {
    // limit camera to map
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.container);
    this.cameras.main.roundPixels = true; // avoid tile bleed
    
  }

  createEnemies() {
    // where the enemies will be
    this.spawns = this.physics.add.group({
      classType: Phaser.GameObjects.Sprite
    });
    for (let i = 0; i < 20; i++) {
      const location = this.getValidLocation();
      // parameters are x, y, width, height
      let enemy = this.spawns.create(location.x, location.y, this.getEnemySprite());
      enemy.body.setCollideWorldBounds(true);
      enemy.body.setImmovable();
    }
  }

  getEnemySprite() {
    let sprites = ['golem', 'ent', 'demon', 'worm', 'wolf'];
    return sprites[Math.floor(Math.random() * sprites.length)];
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

  onMeetEnemy(player, zone) {
    // we move the zone to some other location
    zone.x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
    zone.y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);
  }


  update() {
    if (this.container) {
      this.container.body.setVelocity(0);

      // shooting
      if (this.input.mousePointer.isDown && !this.shooting) {
        // console.log("mouse click is registering");
        
        
        // get player's canvas location
        let player_canvas_location_x = this.container.x - this.cameras.main.scrollX;
        let player_canvas_location_y = this.container.y - this.cameras.main.scrollY;
        // console.log("player canvas x: " + player_canvas_location_x);
        // console.log("player canvas y: " + player_canvas_location_y);

        // // get the mouse click location in canvas
        let mouse_x = this.input.mousePointer.x;
        let mouse_y = this.input.mousePointer.y;

        // only do things if the click is within the canvas area
        if ((mouse_x >= 0 && mouse_x <= 320) && (mouse_y >= 0 && mouse_y <= 240)) {
          // console.log("mouse location x: "+mouse_x)
          // console.log("mouse location y: "+mouse_y)

          let relative_click_x = mouse_x - player_canvas_location_x;
          let relative_click_y = mouse_y - player_canvas_location_y;

          // console.log("relative click location x: "+relative_click_x)
          // console.log("relative click location y: "+relative_click_y)

          //LINES DIRECTLY BELOW ARE SUPER IMPORTANT
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

          // if you're clicking at 0,0 (where the character is), nothing should happen

          // calculate the x and y velocity of the bullet. Ensure overall speed is always 5 units
          // console.log("theta: " + theta)
          let x_velo = 5 * Math.cos(theta);
          let y_velo = 5 * Math.sin(theta);
          // console.log("x velocity is: "+ x_velo);
          // console.log("y velocity is: "+ y_velo);

          // // create the projectile with the proper velocity and display in the map/canvas
          // let projectile = {};
          // projectile.x_velo = x_velo;
          // projectile.y_velo = y_velo;
          
          // store time projectile was created so know when to remove projectile
          let date = new Date();// for ensuring projectile has limited range
          let fire_time = date.getTime();
          // console.log("firetime: " + projectile.fire_time.toString());
          // projectile.sprite = this.add.sprite(
          //   this.container.x + projectile.x_velo,
          //   this.container.y + projectile.y_velo,
          //   'small_projectile'
          // );
          // // add to projectile array
          // projectiles.push(projectile);
          this.socket.emit('playerShooting', {
            x: this.container.x,
            y: this.container.y,
            x_velo: x_velo,
            y_velo: y_velo,
            fire_time: fire_time
          })
          // console.log("bullet has been shot");
          this.shooting = true;

        }
      } 
      if (!this.input.mousePointer.isDown) {
        // console.log("not shooting");
        // console.log(this.shooting)
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

      // Update the animation last and give left/right animations precedence over up/down animations
      if (this.cursors.left.isDown) {
        this.player.anims.play('left', true);
        this.player.flipX = true;
      } else if (this.cursors.right.isDown) {
        this.player.anims.play('right', true);
        this.player.flipX = false;
      } else if (this.cursors.up.isDown) {
        this.player.anims.play('up', true);
      } else if (this.cursors.down.isDown) {
        this.player.anims.play('down', true);
      } else {
        this.player.anims.stop();
      }

      // emit player movement
      let x = this.container.x;
      let y = this.container.y;
      let flipX = this.player.flipX;
      if (this.container.oldPosition && (x !== this.container.oldPosition.x || y !== this.container.oldPosition.y || flipX !== this.container.oldPosition.flipX)) {
        this.socket.emit('playerMovement', { x, y, flipX });
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
//added projectile updater function


let game = new Phaser.Game(config);

// function render() {

//   game.debug.cameraInfo(game.camera, 500, 32);
//   game.debug.spriteInfo(card, 32, 32);

//   game.debug.text('Click to toggle sprite / camera movement with cursors', 32, 550);

// }

// console.log(game.camera.x)
  