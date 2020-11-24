let red_killcount = 0;
let blue_killcount = 0;
let red_text;
let blue_text;




 class LeaderBoard extends Phaser.Scene {
    constructor() {
      super({
        key: 'LeaderBoard',
        active: true
      });
    }
    
    create() {


      
        this.socket = io();


        red_text = this.add.text(175, 0, 'Red Team Kills: '+red_killcount.toString(), { fontSize: '12px' }).setScrollFactor(0,0);
        blue_text = this.add.text(175, 12, 'Blue Team Kills: '+blue_killcount.toString(), { fontSize: '12px' }).setScrollFactor(0,0);

        red_text.setText("Red Team Kills: "+red_killcount.toString());
        blue_text.setText("Blue Team Kills: "+blue_killcount.toString());


        this.socket.on('updateLeaderboard', function(playerInfo) {
            if (playerInfo.shooter.team === "A") {
                blue_killcount++;
            } else if (playerInfo.shooter.team === "B") {
            red_killcount++;
            }
            red_text.setText("Red Team Kills: "+red_killcount.toString());
      blue_text.setText("Blue Team Kills: "+blue_killcount.toString());
        }.bind(this));

    }
  
  }

  export default LeaderBoard