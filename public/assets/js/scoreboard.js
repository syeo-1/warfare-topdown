let teamA_killcount = 0;
let teamB_killcount = 0;
let teamA_text;
let teamB_text;

const kill_multiplier = 10;
var clockText;
var countDownText;
var id;
var id_countdown

class Scoreboard extends Phaser.Scene {
  constructor() {
    super({
      key: 'Scoreboard',
      active: true
    });
  }
  
  create() {

    this.socket = io();
    this.initialTime = 240; // 8:00
    this.countDownTime = 10; // 0:10

    clockText = this.add.text(140, 5, this.formatTime(this.initialTime), { fontFamily: 'Arial', fontSize: '14px', color:'#000000' });
    countDownText = this.add.text(10, 100, "WAITING: " + this.formatTime(this.countDownTime), { fontFamily: 'Arial', fontSize: '28px', color:'#FF0000' });
    teamA_text = this.add.text(5, 5, 'Team A Score: 0', { fontFamily: 'Arial', fontSize: '14px', color:'#008000' }).setScrollFactor(0,0);
    teamB_text = this.add.text(195, 5, 'Team B Score: 0', { fontFamily: 'Arial', fontSize: '14px', color:'#D3D3D3' }).setScrollFactor(0,0);
    teamA_text.setResolution(10);
    teamB_text.setResolution(10);
    
    this.startGame()
    this.startGameClock()
    this.updateLeaderboard()
  }

  updateLeaderboard(){
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

  startGameClock(){
    this.socket.on('startGameClock', function(){
      id = setInterval(function(){
        this.updateTimer()
      }.bind(this), 1000);
    }.bind(this));
  }

  startGame(){
    this.socket.on('startGame', function(){
      id_countdown = setInterval(function(){
        this.updateCountdown()
      }.bind(this), 1000);
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

  updateCountdown(){
    this.countDownTime -= 1; // One second
    if(this.countDownTime <= 0){
      countDownText.setText('');
      clearInterval(id_countdown);
    }
    else{
      countDownText.setText("STARTING IN: " + this.formatTime(this.countDownTime));
    }
  }
  formatTime(seconds){
    var minutes = Math.floor(seconds/60);
    var paddedSeconds = seconds%60;
    paddedSeconds = paddedSeconds.toString().padStart(2,'0');
    return `${minutes}:${paddedSeconds}`;
  }

}


export default Scoreboard