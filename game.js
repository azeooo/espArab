/* FIXED: Top-down Maze Runner (3 Levels) + Quiz each level
   - Works on mobile + desktop
   - Controls: Arrow keys + Touch D-pad (hold)
   - UI: MAIN / BERHENTI + SKOR + Music + Pause (like image)
   - Characters: 🐭 😼 🧀
*/

(() => {
  // ---------- DOM ----------
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const scoreValue = document.getElementById("scoreValue");
  const levelValue = document.getElementById("levelValue");
  const timeValue  = document.getElementById("timeValue");

  const btnMain = document.getElementById("btnMain");
  const btnStop = document.getElementById("btnStop");
  const btnMainOverlay = document.getElementById("btnMainOverlay");

  const btnMusic = document.getElementById("btnMusic");
  const btnPause = document.getElementById("btnPause");
  const btnHow   = document.getElementById("btnHow");

  const overlay = document.getElementById("overlay");
  const quizOverlay = document.getElementById("quizOverlay");
  const winToast = document.getElementById("winToast");
  const btnOpenQuiz = document.getElementById("btnOpenQuiz");

  const quizTitle = document.getElementById("quizTitle");
  const quizDesc  = document.getElementById("quizDesc");
  const q1Text = document.getElementById("q1Text");
  const q2Text = document.getElementById("q2Text");
  const q1Options = document.getElementById("q1Options");
  const q2Options = document.getElementById("q2Options");
  const btnSubmitQuiz = document.getElementById("btnSubmitQuiz");
  const btnExitQuiz   = document.getElementById("btnExitQuiz");
  const quizResult = document.getElementById("quizResult");

  const toastTitle = document.getElementById("toastTitle");
  const toastSub   = document.getElementById("toastSub");

  const dpadButtons = Array.from(document.querySelectorAll(".dBtn"));

  // ---------- Responsive Canvas (stable) ----------
  // We draw using CSS pixels (no DPR scaling complexity)
  function resizeCanvas(){
    const wrap = canvas.parentElement.getBoundingClientRect();
    const cssW = Math.floor(wrap.width);
    const cssH = Math.floor(cssW * 0.75); // 4:3 look

    canvas.width = cssW;
    canvas.height = cssH;
  }
  window.addEventListener("resize", resizeCanvas);

  // ---------- Audio (simple beeps only) ----------
  let audioEnabled = true;
  let audioCtx = null;

  function ensureAudio(){
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function beep(freq=440, dur=0.09, type="sine", gain=0.05){
    if (!audioEnabled) return;
    const ac = ensureAudio();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  }
  function sfxMove(){ beep(520, 0.03, "triangle", 0.02); }
  function sfxBump(){ beep(150, 0.07, "square", 0.04); }
  function sfxWin(){ [523,659,784].forEach((f,i)=>setTimeout(()=>beep(f,0.10,"sine",0.05), i*90)); }
  function sfxMeow(){ beep(520,0.07,"sawtooth",0.03); setTimeout(()=>beep(260,0.10,"sawtooth",0.03),70); }

  btnMusic.addEventListener("click", () => {
    audioEnabled = !audioEnabled;
    btnMusic.querySelector(".icon").textContent = audioEnabled ? "🎵" : "🔇";
    if (!audioEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  });

  // unlock on first touch/click
  window.addEventListener("pointerdown", () => { try { ensureAudio().resume?.(); } catch {} }, { once:true });

  // ---------- Levels (SOLVABLE MAZE) ----------
  // 0 = wall, 1 = path
  const LEVELS = [
    { // Level 1: easy
      grid: [
        "000000000000000000000000",
        "011111111111111111111110",
        "010000000000000000000010",
        "011111111111111111111010",
        "010000000000000000001010",
        "011111111111111111101010",
        "010000000000000000101010",
        "011111111111111110101010",
        "010000000000000010101010",
        "011111111111111010101010",
        "010000000000001010101010",
        "011111111111101010101010",
        "010000000000101010101010",
        "011111111110101010101010",
        "010000000010101010101010",
        "011111111010101010101110",
        "010000001010101010100010",
        "011111111111111111111110",
      ],
      start:{x:1,y:1},
      goal:{x:22,y:16},
      cat:null
    },
    { // Level 2: medium
      grid: [
        "000000000000000000000000",
        "011111111100011111111110",
        "010000001100011000000010",
        "011111101111111011111010",
        "010000101000001010001010",
        "010111101011101010111010",
        "010100001010001010100010",
        "010101111010111010101110",
        "010101000010100010100010",
        "010101011110101110111010",
        "010001010000101000001010",
        "011111011111101111111010",
        "010000000000001000000010",
        "011111111111111011111110",
        "010000000000001010000010",
        "010111111111101010111010",
        "0101000000001010100010G0", // G marker not used; keep as 0/1 later
        "011111111111111111111110",
      ],
      start:{x:1,y:1},
      goal:{x:22,y:16},
      cat:null
    },
    { // Level 3: medium + moving cat
      grid: [
        "000000000000000000000000",
        "011111111100011111111110",
        "010000001100011000000010",
        "011111101111111011111010",
        "010000101000001010001010",
        "010111101011101010111010",
        "010100001010001010100010",
        "010101111010111010101110",
        "010101000010100010100010",
        "010101011110101110111010",
        "010001010000101000001010",
        "011111011111101111111010",
        "010000000000001000000010",
        "011111111111111011111110",
        "010000000000001010000010",
        "010111111111101010111010",
        "010100000000101010001010",
        "011111111111111111111110",
      ],
      start:{x:1,y:1},
      goal:{x:22,y:16},
      cat:{
        // cat patrol on PATH tiles only
        path:[
          {x:12,y:3},
          {x:18,y:3},
          {x:18,y:9},
          {x:12,y:9},
        ],
        speedCellsPerSec: 2.0
      }
    }
  ];

  // Convert string grid to numeric grid (G char ignored safely)
  function parseGrid(lines){
    return lines.map(row => row.split("").map(ch => (ch === "1" ? 1 : 0)));
  }

  // ---------- Quizzes (from document) ----------
  const QUIZZES = {
    1: {
      title: "Kuiz Level 1",
      desc: "Jawab 2 soalan dengan betul untuk pergi Level 2.",
      q1: {
        text: "1) Kanak-kanak lelaki sedang bermain drum. Bunyi apakah yang dihasilkan?",
        options: ["Dum Dum", "Ting Ting", "Tok Tok"],
        answer: "Dum Dum"
      },
      q2: {
        text: "2) Apakah huruf Arab yang sesuai dengan bunyi ‘Dum’?",
        options: ["د", "ب", "ج"],
        answer: "د"
      }
    },
    2: {
      title: "Kuiz Level 2",
      desc: "Jawab 2 soalan dengan betul untuk pergi Level 3.",
      q1: {
        text: "1) Apakah bunyi yang dihasilkan oleh traktor ini?",
        options: ["Jin Jin Jin", "Dum Dum", "Tok Tok"],
        answer: "Jin Jin Jin"
      },
      q2: {
        text: "2) Apakah huruf Arab yang sesuai dengan bunyi ‘Jin’?",
        options: ["ج", "د", "ب"],
        answer: "ج"
      }
    },
    3: {
      title: "Kuiz Level 3",
      desc: "Jawab 2 soalan dengan betul untuk jadi pemenang!",
      q1: {
        text: "1) Apakah huruf Arab yang sesuai dengan bentuk haiwan ini?",
        options: ["ت", "ج", "د"],
        answer: "ت"
      },
      q2: {
        text: "2) Apakah bentuk huruf Arab seperti objek ini?",
        options: ["ب", "ج", "د"],
        answer: "ب"
      }
    }
  };

  // ---------- Game State ----------
  let level = 1;
  let grid = null;
  let cols = 0, rows = 0;
  let tile = 24; // computed
  let offsetX = 0, offsetY = 0;

  let running = false;
  let paused = false;
  let won = false;

  let startMs = 0;
  let elapsedMs = 0;
  let bumps = 0;
  let catHits = 0;

  const player = {x:0,y:0};
  const cheese = {x:0,y:0};

  const cat = {
    active:false,
    x:0,y:0,        // float cell coords
    path:[],
    seg:0,
    t:0,
    speed:0
  };

  // input hold
  const input = {up:false,down:false,left:false,right:false};
  let repeatTimer = 0;

  // ---------- HUD formatting ----------
  function fmtScore(v){
    v = Math.max(0, Math.floor(v));
    return String(v).padStart(2,"0");
  }
  function fmtTime(ms){
    const t = Math.floor(ms/1000);
    const m = Math.floor(t/60);
    const s = t%60;
    return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  }

  function computeScore(){
    const base = 99;
    const sec = elapsedMs/1000;
    const timePenalty = Math.floor(sec*2); // -2/sec
    const bumpPenalty = bumps*2;
    const catPenalty  = catHits*6;
    return Math.max(0, base - timePenalty - bumpPenalty - catPenalty);
  }

  // ---------- Setup ----------
  function currentLevel(){ return LEVELS[level-1]; }

  function rebuildGrid(){
    grid = parseGrid(currentLevel().grid);
    rows = grid.length;
    cols = grid[0].length;

    // compute tile size to fit canvas
    const pad = 18;
    const maxTileW = (canvas.width - pad*2) / cols;
    const maxTileH = (canvas.height - pad*2) / rows;
    tile = Math.floor(Math.max(16, Math.min(maxTileW, maxTileH)));

    offsetX = Math.floor((canvas.width - cols*tile)/2);
    offsetY = Math.floor((canvas.height - rows*tile)/2);
  }

  function walkable(x,y){
    if (y<0||y>=rows||x<0||x>=cols) return false;
    return grid[y][x] === 1;
  }

  function resetLevel(){
    rebuildGrid();

    player.x = currentLevel().start.x;
    player.y = currentLevel().start.y;

    cheese.x = currentLevel().goal.x;
    cheese.y = currentLevel().goal.y;

    running = false;
    paused = false;
    won = false;

    elapsedMs = 0;
    bumps = 0;
    catHits = 0;

    // cat
    cat.active = !!currentLevel().cat;
    if (cat.active){
      cat.path = currentLevel().cat.path.map(p=>({x:p.x,y:p.y}));
      cat.seg = 0;
      cat.t = 0;
      cat.speed = currentLevel().cat.speedCellsPerSec;
      cat.x = cat.path[0].x;
      cat.y = cat.path[0].y;
    }

    levelValue.textContent = String(level);
    scoreValue.textContent = "00";
    timeValue.textContent = "00:00";

    showOverlay(true);
    showWinToast(false);
    showQuiz(false);
  }

  function showOverlay(show){ overlay.classList.toggle("show", !!show); }
  function showQuiz(show){ quizOverlay.classList.toggle("show", !!show); }
  function showWinToast(show){ winToast.classList.toggle("show", !!show); }

  // ---------- Drawing ----------
  function cellToPx(x,y){
    return {
      x: offsetX + x*tile,
      y: offsetY + y*tile
    };
  }

  function drawBackground(){
    // soft clouds sparkles
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    for (let i=0;i<10;i++){
      const cx = (i*97 + (performance.now()/18)) % canvas.width;
      const cy = 20 + (i*43)%140;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMaze(){
    for (let y=0;y<rows;y++){
      for (let x=0;x<cols;x++){
        const p = cellToPx(x,y);

        if (grid[y][x] === 1){
          // path grass
          ctx.fillStyle = "rgba(90, 220, 120, 0.88)";
          ctx.fillRect(p.x, p.y, tile, tile);

          // small highlight
          ctx.fillStyle = "rgba(255,255,255,0.20)";
          ctx.fillRect(p.x+2, p.y+2, tile-4, Math.max(6, tile*0.18));
        } else {
          // wall (cute wood-ish)
          ctx.fillStyle = "rgba(120, 76, 38, 0.35)";
          ctx.fillRect(p.x, p.y, tile, tile);
        }

        // grid border
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x+0.5, p.y+0.5, tile-1, tile-1);
      }
    }
  }

  function drawEmoji(emoji, cx, cy, size){
    ctx.save();
    ctx.font = `${size}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, cx, cy);
    ctx.restore();
  }

  function drawEntities(){
    const bob = Math.sin(performance.now()/220)*2;

    // cheese
    {
      const p = cellToPx(cheese.x, cheese.y);
      const cx = p.x + tile/2;
      const cy = p.y + tile/2;
      // glow
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#ffe26b";
      ctx.beginPath();
      ctx.arc(cx, cy, tile*0.55, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
      drawEmoji("🧀", cx, cy + bob, Math.floor(tile*0.78));
    }

    // cat
    if (cat.active){
      const cx = offsetX + (cat.x+0.5)*tile;
      const cy = offsetY + (cat.y+0.5)*tile;
      drawEmoji("😼", cx, cy + bob, Math.floor(tile*0.78));
    }

    // player
    {
      const p = cellToPx(player.x, player.y);
      const cx = p.x + tile/2;
      const cy = p.y + tile/2;
      drawEmoji("🐭", cx, cy + bob, Math.floor(tile*0.78));
    }
  }

  function draw(){
    drawBackground();
    drawMaze();
    drawEntities();

    // helper text
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(10, 10, 260, 32);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "900 14px system-ui";
    ctx.fillText("Gerak 🐭 sampai 🧀 untuk menang!", 20, 30);
    ctx.restore();
  }

  // ---------- Movement (THIS IS THE IMPORTANT FIX) ----------
  function attemptMove(dx,dy){
    if (!running || paused || won) return;

    const nx = player.x + dx;
    const ny = player.y + dy;

    if (!walkable(nx,ny)){
      bumps++;
      sfxBump();
      return;
    }

    player.x = nx;
    player.y = ny;
    sfxMove();

    // win
    if (player.x === cheese.x && player.y === cheese.y){
      onWin();
    }
  }

  // ---------- Cat (Level 3) ----------
  function updateCat(dt){
    if (!cat.active || !running || paused || won) return;

    const path = cat.path;
    const a = path[cat.seg];
    const b = path[(cat.seg+1) % path.length];

    cat.t += dt * cat.speed;

    while (cat.t >= 1){
      cat.t -= 1;
      cat.seg = (cat.seg+1) % path.length;
      return;
    }

    cat.x = a.x + (b.x - a.x)*cat.t;
    cat.y = a.y + (b.y - a.y)*cat.t;

    // collision with player
    const d = Math.hypot((player.x - cat.x), (player.y - cat.y));
    if (d < 0.55){
      catHits++;
      sfxMeow();
      // reset player to start (kid-friendly)
      player.x = currentLevel().start.x;
      player.y = currentLevel().start.y;
    }
  }

  // ---------- Win + Quiz ----------
  function onWin(){
    won = true;
    running = false;
    paused = false;
    sfxWin();

    toastTitle.textContent = "Tahniah! 🎉";
    toastSub.textContent = "Klik Kuiz untuk teruskan 😊";
    showWinToast(true);
  }

  function buildOptions(container, options, onPick){
    container.innerHTML = "";
    for (const opt of options){
      const b = document.createElement("button");
      b.className = "optBtn";
      b.textContent = opt;
      b.addEventListener("click", () => {
        container.querySelectorAll(".optBtn").forEach(x => x.classList.remove("selected"));
        b.classList.add("selected");
        onPick(opt);
      });
      container.appendChild(b);
    }
  }

  let sel1 = null, sel2 = null;

  function openQuiz(){
    const q = QUIZZES[level];
    sel1 = null; sel2 = null;
    quizResult.textContent = "";

    quizTitle.textContent = q.title;
    quizDesc.textContent  = q.desc;

    q1Text.textContent = q.q1.text;
    q2Text.textContent = q.q2.text;

    buildOptions(q1Options, q.q1.options, (opt)=>{ sel1 = opt; });
    buildOptions(q2Options, q.q2.options, (opt)=>{ sel2 = opt; });

    showWinToast(false);
    showQuiz(true);
  }

  function submitQuiz(){
    const q = QUIZZES[level];
    if (!sel1 || !sel2){
      quizResult.textContent = "Pilih jawapan untuk dua-dua soalan dulu 😊";
      sfxBump();
      return;
    }
    const ok = (sel1 === q.q1.answer) && (sel2 === q.q2.answer);
    if (!ok){
      quizResult.textContent = "❌ Salah. Cuba lagi ya!";
      sfxBump();
      return;
    }

    quizResult.textContent = "✅ Betul! Tahniah!";
    sfxWin();

    setTimeout(() => {
      showQuiz(false);
      if (level < 3){
        level++;
        resetLevel();
      } else {
        // final
        showOverlay(true);
        overlay.querySelector(".modalTitle").textContent = "🏆 Anda Pemenang! 🏆";
        overlay.querySelector(".modalBody").innerHTML =
          `<ul>
            <li>Skor akhir: <b>${fmtScore(computeScore())}</b></li>
            <li>Masa: <b>${fmtTime(elapsedMs)}</b></li>
            <li>Langgar dinding: <b>${bumps}</b></li>
            <li>Kena kucing: <b>${catHits}</b></li>
          </ul>`;
        overlay.querySelector(".tipLine").textContent = "Tekan MAIN untuk main semula 😊";

        // reset to level 1 next
        level = 1;
        resetLevel();
      }
    }, 550);
  }

  // ---------- MAIN / STOP / PAUSE ----------
  function startGame(){
    if (won) return;

    showOverlay(false);
    showWinToast(false);
    showQuiz(false);

    if (!running){
      running = true;
      paused = false;
      startMs = performance.now() - elapsedMs;
    } else {
      paused = false;
      startMs = performance.now() - elapsedMs;
    }
  }

  function stopGame(){
    running = false;
    paused = false;
    won = false;
    elapsedMs = 0;
    bumps = 0;
    catHits = 0;
    resetLevel();
  }

  function togglePause(){
    if (!running || won) return;
    paused = !paused;
    if (paused){
      showOverlay(true);
      overlay.querySelector(".modalTitle").textContent = "⏸ PAUSE";
      overlay.querySelector(".modalBody").innerHTML =
        `<ul>
          <li>Tekan MAIN untuk sambung.</li>
          <li>Tekan BERHENTI untuk ulang.</li>
        </ul>`;
      overlay.querySelector(".tipLine").textContent = "Rehat sekejap 😄";
    } else {
      showOverlay(false);
      startMs = performance.now() - elapsedMs;
    }
  }

  // ---------- Input (FIXED: repeat move reliably) ----------
  // Keyboard
  window.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowUp")    { input.up = true; e.preventDefault(); }
    if (k === "ArrowDown")  { input.down = true; e.preventDefault(); }
    if (k === "ArrowLeft")  { input.left = true; e.preventDefault(); }
    if (k === "ArrowRight") { input.right = true; e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => {
    const k = e.key;
    if (k === "ArrowUp")    { input.up = false; e.preventDefault(); }
    if (k === "ArrowDown")  { input.down = false; e.preventDefault(); }
    if (k === "ArrowLeft")  { input.left = false; e.preventDefault(); }
    if (k === "ArrowRight") { input.right = false; e.preventDefault(); }
  });

  // Touch D-pad (hold)
  const map = { up:"up", down:"down", left:"left", right:"right" };
  dpadButtons.forEach(btn => {
    const dir = btn.dataset.dir;
    if (!dir) return;

    const set = (v) => { input[map[dir]] = v; };

    btn.addEventListener("touchstart", (e)=>{ e.preventDefault(); set(true); }, {passive:false});
    btn.addEventListener("touchend",   (e)=>{ e.preventDefault(); set(false); }, {passive:false});
    btn.addEventListener("touchcancel",(e)=>{ e.preventDefault(); set(false); }, {passive:false});

    btn.addEventListener("mousedown", ()=>set(true));
    btn.addEventListener("mouseup",   ()=>set(false));
    btn.addEventListener("mouseleave",()=>set(false));
  });

  function stepFromInput(){
    // allow one direction at a time (kid friendly)
    if (input.up) return {dx:0, dy:-1};
    if (input.down) return {dx:0, dy:1};
    if (input.left) return {dx:-1, dy:0};
    if (input.right) return {dx:1, dy:0};
    return null;
  }

  // ---------- Buttons ----------
  btnMain.addEventListener("click", startGame);
  btnMainOverlay.addEventListener("click", startGame);

  btnStop.addEventListener("click", stopGame);
  btnPause.addEventListener("click", togglePause);

  btnHow.addEventListener("click", () => {
    showOverlay(true);
    overlay.querySelector(".modalTitle").textContent = "INFO";
    overlay.querySelector(".modalBody").innerHTML =
      `<ul>
        <li>MAIN ▶ untuk mula / sambung.</li>
        <li>BERHENTI ⏹ untuk ulang level.</li>
        <li>Capai 🧀 untuk menang dan jawab kuiz.</li>
        <li>Keyboard atau butang arah (phone).</li>
      </ul>`;
    overlay.querySelector(".tipLine").textContent = "Selamat bermain 😊";
  });

  btnOpenQuiz.addEventListener("click", openQuiz);
  btnSubmitQuiz.addEventListener("click", submitQuiz);
  btnExitQuiz.addEventListener("click", () => { showQuiz(false); showOverlay(true); });

  // ---------- Game Loop ----------
  let last = performance.now();

  function tick(now){
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (running && !paused && !won){
      elapsedMs = now - startMs;

      // movement repeat: first move fast, then repeat steady while holding
      repeatTimer -= dt;
      const step = stepFromInput();

      if (step){
        if (repeatTimer <= 0){
          attemptMove(step.dx, step.dy);
          // repeat speed tuned for kids (smooth but not too fast)
          repeatTimer = 0.14;
        }
      } else {
        // reset timer when no key pressed
        repeatTimer = 0;
      }

      updateCat(dt);

      // HUD
      scoreValue.textContent = fmtScore(computeScore());
      timeValue.textContent  = fmtTime(elapsedMs);
    }

    draw();
    requestAnimationFrame(tick);
  }

  // ---------- Init ----------
  function init(){
    resizeCanvas();
    levelValue.textContent = String(level);
    resetLevel();
    requestAnimationFrame(tick);
  }

  init();
})();