const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(__dirname));

const rooms = new Map();
const LETTERS = ["ا","ب","ت","ث","ج","ح","خ","د","ذ","ر","ز","س","ش","ص","ض","ط","ظ","ع","غ","ف","ق","ك","ل","م","ن","ه","و","ي","ء","أ","إ","ى","ة","لا"];

const QUESTION_BANK = {
  "ا":["شيء يشرق كل صباح؟","حيوان يُعرف بملك الغابة؟","مدينة سعودية عاصمتها؟"],
  "ب":["فاكهة صفراء يحبها القرود؟","بحر يفصل السعودية عن مصر؟","حيوان له خرطوم؟"],
  "ت":["شيء نقرأه من الورق؟","رياضة تُلعب بالكرة والمضرب؟","مدينة سعودية تشتهر بالورد؟"],
  "ج":["حهاز نستخدمه للاتصال؟","حيوان يعيش في الغابة وله عرف؟","دولة عربية عاصمتها عمّان؟"],
  "س":["نجم يضيء الأرض نهارًا؟","شيء نشربه ساخنًا؟","عاصمة السعودية؟"],
  "م":["حيوان بحري ضخم؟","مكان نذهب إليه لمشاهدة الأفلام؟","شهر يأتي بعد شعبان؟"],
  "ن":["شيء نستخدمه للكتابة؟","حيوان يعيش في الماء؟","عاصمة اليابان؟"],
  "و":["فاكهة خضراء أو حمراء مشهورة؟","شيء نشربه عند العطش؟","اسم يوم من أيام الأسبوع؟"],
  "ي":["دولة عربية تقع في جنوب الجزيرة؟","شيء نراه في السماء ليلًا؟","فاكهة صفراء طويلة؟"]
};

function makeRoom(hostId, name) {
  let code;
  do code = Math.random().toString(36).slice(2,7).toUpperCase(); while (rooms.has(code));
  const room = {
    code, hostId, status:"lobby", round:1, currentLetter:null, currentQuestion:null,
    questionTime:10, timeLeft:10, timer:null, buzzer:null,
    teams:{red:{score:0,players:[]},green:{score:0,players:[]}},
    players:new Map(),
    board: LETTERS.map(l=>({letter:l,state:"open"}))
  };
  room.players.set(hostId,{id:hostId,name,team:"red",host:true});
  room.teams.red.players.push(hostId);
  rooms.set(code,room);
  return room;
}
function pub(room){
  return {
    code:room.code,status:room.status,round:room.round,currentLetter:room.currentLetter,
    currentQuestion:room.currentQuestion,timeLeft:room.timeLeft,buzzer:room.buzzer,
    teams:{red:{score:room.teams.red.score,players:room.teams.red.players.map(id=>room.players.get(id)?.name).filter(Boolean)},
           green:{score:room.teams.green.score,players:room.teams.green.players.map(id=>room.players.get(id)?.name).filter(Boolean)}},
    board:room.board
  };
}
function broadcast(room){io.to(room.code).emit("state",pub(room));}
function stopTimer(room){if(room.timer){clearInterval(room.timer);room.timer=null;}}
function startTimer(room){
  stopTimer(room); room.timeLeft=room.questionTime;
  room.timer=setInterval(()=>{
    room.timeLeft--;
    if(room.timeLeft<=0){
      room.timeLeft=0; stopTimer(room);
      io.to(room.code).emit("timesUp");
    }
    broadcast(room);
  },1000);
}
function startQuestion(room, letter){
  const cell=room.board.find(x=>x.letter===letter);
  if(!cell || cell.state!=="open" || room.status!=="playing" || room.buzzer) return false;
  cell.state="active"; room.currentLetter=letter;
  const arr=QUESTION_BANK[letter]||[`اذكر شيئًا يبدأ بحرف ${letter}`,`اذكر اسمًا يبدأ بحرف ${letter}`,`اذكر مكانًا يبدأ بحرف ${letter}`];
  room.currentQuestion=arr[Math.floor(Math.random()*arr.length)];
  room.buzzer=null; startTimer(room); return true;
}
function resetRound(room){
  stopTimer(room); room.status="lobby"; room.currentLetter=null; room.currentQuestion=null; room.timeLeft=10; room.buzzer=null;
  room.board.forEach(c=>c.state="open"); room.round++;
}
function award(room,team,correct){
  if(correct){room.teams[team].score+=1; const c=room.board.find(x=>x.letter===room.currentLetter); if(c)c.state=team;}
  else {const c=room.board.find(x=>x.letter===room.currentLetter); if(c)c.state="open";}
  stopTimer(room); room.buzzer=null; room.currentQuestion=null; room.currentLetter=null; room.timeLeft=10;
}

io.on("connection", socket=>{
  socket.on("createRoom", ({name})=>{
    const room=makeRoom(socket.id,String(name||"المضيف").slice(0,20));
    socket.join(room.code); socket.data.room=room.code; socket.emit("created",{code:room.code}); broadcast(room);
  });
  socket.on("joinRoom", ({code,name,team})=>{
    const room=rooms.get(String(code||"").toUpperCase());
    if(!room) return socket.emit("errorMsg","رمز الغرفة غير صحيح.");
    if(room.status==="finished") return socket.emit("errorMsg","اللعبة انتهت.");
    const t=team==="green"?"green":"red";
    room.players.set(socket.id,{id:socket.id,name:String(name||"لاعب").slice(0,20),team:t,host:false});
    room.teams[t].players.push(socket.id); socket.join(room.code); socket.data.room=room.code; broadcast(room);
  });
  socket.on("setTeam",({team})=>{
    const room=rooms.get(socket.data.room); const p=room?.players.get(socket.id); if(!room||!p)return;
    if(p.team===team)return;
    const old=room.teams[p.team].players; const idx=old.indexOf(socket.id); if(idx>=0)old.splice(idx,1);
    p.team=team==="green"?"green":"red"; room.teams[p.team].players.push(socket.id); broadcast(room);
  });
  socket.on("startGame",()=>{
    const room=rooms.get(socket.data.room); if(!room||room.hostId!==socket.id)return;
    room.status="playing"; room.round=1; broadcast(room);
  });
  socket.on("selectLetter",({letter})=>{
    const room=rooms.get(socket.data.room); if(!room)return;
    if(startQuestion(room,letter)) broadcast(room);
  });
  socket.on("buzz",()=>{
    const room=rooms.get(socket.data.room), p=room?.players.get(socket.id);
    if(!room||!p||room.status!=="playing"||!room.currentLetter||room.buzzer||room.timeLeft<=0)return;
    room.buzzer={team:p.team,name:p.name,id:p.id}; stopTimer(room); io.to(room.code).emit("buzzed",room.buzzer); broadcast(room);
  });
  socket.on("answer",({correct})=>{
    const room=rooms.get(socket.data.room); if(!room||!room.buzzer)return;
    const team=room.buzzer.team; award(room,team,!!correct); broadcast(room);
  });
  socket.on("nextRound",()=>{
    const room=rooms.get(socket.data.room); if(!room||room.hostId!==socket.id)return;
    resetRound(room); broadcast(room);
  });
  socket.on("endGame",()=>{
    const room=rooms.get(socket.data.room); if(!room||room.hostId!==socket.id)return;
    stopTimer(room); room.status="finished"; broadcast(room);
  });
  socket.on("disconnect",()=>{
    const code=socket.data.room, room=rooms.get(code); if(!room)return;
    const p=room.players.get(socket.id); if(!p)return;
    room.players.delete(socket.id);
    const arr=room.teams[p.team].players, i=arr.indexOf(socket.id); if(i>=0)arr.splice(i,1);
    if(room.hostId===socket.id){
      const next=[...room.players.values()][0];
      if(next){room.hostId=next.id; next.host=true;}
      else {stopTimer(room); rooms.delete(code); return;}
    }
    broadcast(room);
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Harouf running on port ${PORT}`));
