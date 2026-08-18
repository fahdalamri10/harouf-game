const socket=io();let myTeam="red",isHost=false,roomCode="";
const $=id=>document.getElementById(id), toast=t=>{const x=$("toast");x.textContent=t;x.style.display="block";setTimeout(()=>x.style.display="none",2500)};
document.querySelectorAll(".pick").forEach(b=>b.onclick=()=>{document.querySelectorAll(".pick").forEach(x=>x.classList.remove("active"));b.classList.add("active");myTeam=b.dataset.team});
$("create").onclick=()=>socket.emit("createRoom",{name:$("hostName").value||"المضيف"});
$("join").onclick=()=>socket.emit("joinRoom",{name:$("joinName").value||"لاعب",code:$("roomCode").value,team:myTeam});
socket.on("created",d=>{roomCode=d.code;$("createdCode").textContent=d.code;isHost=true;});
socket.on("errorMsg",toast);
socket.on("state",s=>{
 roomCode=s.code;$("roomLabel").textContent=s.code;$("redScore").textContent=s.teams.red.score;$("greenScore").textContent=s.teams.green.score;
 $("roundLabel").textContent="الجولة "+s.round;$("timer").textContent=String(s.timeLeft).padStart(2,"0");
 $("question").textContent=s.currentQuestion||"اختر حرفًا من اللوحة";
 $("redPlayers").innerHTML=s.teams.red.players.map(n=>`<div>${n}</div>`).join("");
 $("greenPlayers").innerHTML=s.teams.green.players.map(n=>`<div>${n}</div>`).join("");
 $("board").innerHTML=s.board.map(c=>`<button class="cell ${c.state==='red'?'red':''}${c.state==='green'?' green':''}${c.state==='active'?' active':''}" data-letter="${c.letter}" ${c.state!=='open'?'disabled':''}>${c.letter}</button>`).join("");
 document.querySelectorAll(".cell").forEach(b=>b.onclick=()=>socket.emit("selectLetter",{letter:b.dataset.letter}));
 if(isHost){$("hostActions").classList.remove("hidden");$("start").disabled=s.status==="playing";} else $("hostActions").classList.add("hidden");
 $("game").classList.remove("hidden");$("lobby").classList.add("hidden");
 if(s.buzzer){showBuzz(s.buzzer,s.currentLetter);$("modalActions").classList.toggle("hidden",!isHost);}
});
$("start").onclick=()=>socket.emit("startGame");$("next").onclick=()=>socket.emit("nextRound");$("end").onclick=()=>socket.emit("endGame");
$("switchTeam").onclick=()=>{myTeam=myTeam==="red"?"green":"red";socket.emit("setTeam",{team:myTeam});toast("تم تغيير الفريق")};
$("buzz").onclick=()=>socket.emit("buzz");
function showBuzz(b,l){$("buzzWho").textContent=`${b.name} — الفريق ${b.team==="red"?"الأحمر":"الأخضر"} ضغط أولًا!`;$("buzzLetter").textContent=l||"-";$("buzzModal").classList.remove("hidden");$("modalActions").classList.toggle("hidden",!isHost);beep()}
$("mCorrect").onclick=()=>{socket.emit("answer",{correct:true});$("buzzModal").classList.add("hidden")};
$("mWrong").onclick=()=>{socket.emit("answer",{correct:false});$("buzzModal").classList.add("hidden")};
socket.on("buzzed",b=>showBuzz(b,null));socket.on("timesUp",()=>toast("انتهى الوقت!"));
function beep(){try{const C=AudioContext||webkitAudioContext,c=new C,o=c.createOscillator(),g=c.createGain();o.frequency.value=880;g.gain.value=.2;o.connect(g);g.connect(c.destination);o.start();setTimeout(()=>o.stop(),450)}catch(e){}}
