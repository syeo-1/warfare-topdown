let teamA_killcount = 0;
let teamB_killcount = 0;
let teamA_text;
let teamB_text;

const kill_multiplier = 10;

class LeaderBoard extends Phaser.Scene {
  constructor() {
    super({
      key: 'LeaderBoard',
      active: true
    });
  }
  
  create() {

    this.socket = io();

    teamA_text = this.add.text(5, 5, 'Team A Score: 0', { fontFamily: 'Arial', fontSize: '14px', color:'#0000FF' }).setScrollFactor(0,0);
    teamB_text = this.add.text(195, 5, 'Team B Score: 0', { fontFamily: 'Arial', fontSize: '14px', color:'#FF0000' }).setScrollFactor(0,0);
    teamA_text.setResolution(10);
    teamB_text.setResolution(10);

    this.socket.on('updateLeaderboard', function(playerInfo) {
        if (playerInfo.shooter.team === "A") {
          teamA_killcount++;
        } 
        else if (playerInfo.shooter.team === "B") {
          teamB_killcount++;
        }
        teamA_text.setText("Team A Score: " + (teamA_killcount * kill_multiplier).toString());
        teamB_text.setText("Team B Score: "+ (teamB_killcount * kill_multiplier).toString());
    }.bind(this));
  }
}

export default LeaderBoard