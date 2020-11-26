let teamA_killcount = 0;
let teamB_killcount = 0;
let teamA_text;
let teamB_text;

const kill_multiplier = 10;
var clockText;
var id;
class LeaderBoard extends Phaser.Scene {
  constructor() {
    super({
      key: 'LeaderBoard',
      active: true
    });
  }
  
  create() {

    this.socket = io();
    this.initialTime = 15; // 2:30

    clockText = this.add.text(140, 5, this.formatTime(this.initialTime), { fontFamily: 'Arial', fontSize: '14px', color:'#000000' });
    
    this.socket.on('startGameClock', function(){
      id = setInterval(function(){
        this.updateTimer()
      }.bind(this), 1000);
    }.bind(this));

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

  updateTimer(){
    this.initialTime -= 1; // One second
    if(this.initialTime <= 0){
      clockText.setText('0:00');
      clearInterval(id);
    }
    else{
      clockText.setText(this.formatTime(this.initialTime));
    }
  }
  formatTime(seconds){
    var minutes = Math.floor(seconds/60);
    var paddedSeconds = seconds%60;
    paddedSeconds = paddedSeconds.toString().padStart(2,'0');
    return `${minutes}:${paddedSeconds}`;
  }

}


export default LeaderBoard