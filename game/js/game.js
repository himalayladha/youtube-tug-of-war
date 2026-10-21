(() => {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = 1920;
    canvas.height = 1080;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // High-Resolution AI Arena Background Loader
  // Master Background Plate
  const arenaBgImg = new Image();
  let arenaBgLoaded = false;
  arenaBgImg.onload = () => { arenaBgLoaded = true; };
  arenaBgImg.src = './assets/images/arena_background.png';

  // Authentic User-Supplied Stickman Images (media_1792576999153_bdefe6a6.png)
  const stickmanBlackImg = new Image();
  let stickmanBlackLoaded = false;
  stickmanBlackImg.onload = () => { stickmanBlackLoaded = true; };
  stickmanBlackImg.src = window.STICKMAN_BLACK_DATA || './assets/images/stickman_black.png';

  const stickmanWhiteImg = new Image();
  let stickmanWhiteLoaded = false;
  stickmanWhiteImg.onload = () => { stickmanWhiteLoaded = true; };
  stickmanWhiteImg.src = window.STICKMAN_WHITE_DATA || './assets/images/stickman_white.png';

  function isImgReady(img) {
    return Boolean(img && img.complete && img.naturalWidth > 0);
  }

  // ----------------------------------------------------
  // PROCEDURAL WEB AUDIO SYNTHESIZER
  // ----------------------------------------------------
  class SoundManager {
    constructor() {
      this.ctx = null;
    }
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
    playPull() {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(190, t + 0.12);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    }
    playCrown() {
      this.init();
      if (!this.ctx) return;
      const chords = [523.25, 659.25, 783.99, 1046.5];
      chords.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    }
    playWin() {
      this.init();
      if (!this.ctx) return;
      const fanfares = [392.0, 523.25, 659.25, 783.99, 1046.5];
      fanfares.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.12;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.24, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    }
  }

  const sound = new SoundManager();

  // Curated Debate Topics (Changes Every 3 Rounds)
  const DEBATE_TOPICS = [
    { left: 'ANDROID', right: 'IPHONE' },
    { left: 'INTROVERT', right: 'EXTROVERT' },
    { left: 'DOGS', right: 'CATS' },
    { left: 'COFFEE', right: 'TEA' },
    { left: 'NIGHT OWL', right: 'EARLY BIRD' },
    { left: 'PIZZA', right: 'BURGERS' },
    { left: 'WORK FROM HOME', right: 'OFFICE' },
    { left: 'SUMMER', right: 'WINTER' },
    { left: 'CHESS', right: 'VIDEO GAMES' },
    { left: 'MAC', right: 'WINDOWS' }
  ];

  // Game State
  const gameState = {
    currentTopicIdx: 0,
    roundNumber: 1,
    totalRounds: 3,
    roundTimeRemaining: 84.0, // 01:24 starting mark matching blueprint
    roundDuration: 84.0,
    isRoundOver: false,
    winnerAnnounceTimer: 0,
    roundWinner: null,
    winsBlack: 1,
    winsWhite: 2,
    captainBlack: null,
    captainWhite: null,
    lastCaptainBlackName: '',
    lastCaptainWhiteName: '',
    leaderboardBlack: [],
    leaderboardWhite: [],
    velocity: 0,
    pctBlack: 45,
    pctWhite: 55,
    screenShake: 0,
    globalTime: 0
  };

  // Rope Physics (spring-damper)
  const physics = {
    x: 31, // Slightly favoring white (45% vs 55% matching blueprint)
    vx: 0,
    mass: 14.0,
    damping: 0.88,
    centeringSpring: 0.045,
    winThreshold: 310,
    blackImpulse: 0,
    whiteImpulse: 0,
  };

  // 5 Stick-figure pullers per side (offsets matching arena spacing)
  const pullers = {
    black: [
      { xOffset: -135, phase: 0.0, extraImpulse: 0, isLeader: true },
      { xOffset: -260, phase: 0.45, extraImpulse: 0, isLeader: false },
      { xOffset: -395, phase: 0.90, extraImpulse: 0, isLeader: false },
      { xOffset: -535, phase: 1.35, extraImpulse: 0, isLeader: false },
      { xOffset: -680, phase: 1.80, extraImpulse: 0, isLeader: false },
    ],
    white: [
      { xOffset: 135, phase: 0.0, extraImpulse: 0, isLeader: true },
      { xOffset: 260, phase: 0.45, extraImpulse: 0, isLeader: false },
      { xOffset: 395, phase: 0.90, extraImpulse: 0, isLeader: false },
      { xOffset: 535, phase: 1.35, extraImpulse: 0, isLeader: false },
      { xOffset: 680, phase: 1.80, extraImpulse: 0, isLeader: false },
    ],
  };

  // Particle System (Sparks, Confetti)
  let particles = [];
  function addParticle(x, y, vx, vy, color, size, life, isGravity = true) {
    particles.push({ x, y, vx, vy, color, size, life, maxLife: life, isGravity });
  }

  function spawnConfetti(winnerTeam) {
    const colors = ['#FFFFFF', '#D4D4D4', '#737373', '#E5E5E5', '#A3A3A3'];
    for (let i = 0; i < 220; i++) {
      const x = 960 + (Math.random() - 0.5) * 800;
      const y = 200 + Math.random() * 250;
      const vx = (Math.random() - 0.5) * 600;
      const vy = -200 - Math.random() * 450;
      const color = colors[Math.floor(Math.random() * colors.length)];
      addParticle(x, y, vx, vy, color, Math.random() * 8 + 4, Math.random() * 2.5 + 1.5, true);
    }
  }

  // Floating Combat Damage/Pull Texts
  let floatingTexts = [];
  function addFloatingText(text, x, y, color) {
    floatingTexts.push({ text, x, y, color, life: 1.2, maxLife: 1.2 });
  }

  // Dual Horizontal Scroller Animation State (moving in opposing directions)
  const tickerState = {
    blackScroll: 0,
    whiteScroll: 0,
    speed: 55, // px per second
  };

  let lastBlackTickerUserListSig = '';
  let lastWhiteTickerUserListSig = '';

  // Dual Horizontal Scroller: Big Font Tickers Moving in Opposing Directions
  // Row 1: Team Black moving towards Team Black side (LEFT)
  // Row 2: Team White moving towards Team White side (RIGHT)
  // Prunes any user who has not commented in the last 5 minutes
  function updateDualTickerDOM() {
    const trackBlack = document.getElementById('ticker-track-black');
    const trackWhite = document.getElementById('ticker-track-white');
    if (!trackBlack || !trackWhite) return;

    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    // Filter active commenters from the last 5 minutes
    const activeBlack = currentBlackRoster.filter(u => (now - (u.lastCommentAt || 0)) <= FIVE_MINUTES);
    const activeWhite = currentWhiteRoster.filter(u => (now - (u.lastCommentAt || 0)) <= FIVE_MINUTES);

    const blackList = activeBlack.length > 0 ? activeBlack : currentBlackRoster.slice(0, 8);
    const whiteList = activeWhite.length > 0 ? activeWhite : currentWhiteRoster.slice(0, 8);

    const blackUserSig = blackList.map(u => u.user_name).join('|');
    const whiteUserSig = whiteList.map(u => u.user_name).join('|');

    function buildPillHTML(u, team) {
      const isBlack = (team === 'BLACK');
      return `
        <div class="ticker-item ${isBlack ? 'black' : 'white'}" data-user="${u.user_name}">
          <span class="user-handle">@${u.user_name}</span>
          <span class="action-tag">${isBlack ? '◄ 1' : '2 ►'}</span>
          <span class="pts-tag">${u.score || 0} PTS</span>
        </div>
      `;
    }

    // Only recreate DOM if roster members changed (joined / pruned)
    if (blackUserSig !== lastBlackTickerUserListSig || !trackBlack.firstElementChild) {
      lastBlackTickerUserListSig = blackUserSig;
      const single = blackList.map(u => buildPillHTML(u, 'BLACK')).join('');
      trackBlack.innerHTML = single + single;
    }

    if (whiteUserSig !== lastWhiteTickerUserListSig || !trackWhite.firstElementChild) {
      lastWhiteTickerUserListSig = whiteUserSig;
      const single = whiteList.map(u => buildPillHTML(u, 'WHITE')).join('');
      trackWhite.innerHTML = single + single;
    }

    // In-place score and captain update (zero flicker, zero DOM destruction during animation)
    updateTickerPills(trackBlack, blackList);
    updateTickerPills(trackWhite, whiteList);
  }

  function updateTickerPills(track, roster) {
    if (!track) return;
    const topScorer = roster.length > 0 ? roster[0] : null;
    const maxScore = topScorer ? topScorer.score : 0;

    roster.forEach(u => {
      const isCaptain = (maxScore > 0 && u.user_name === topScorer.user_name);
      const pills = track.querySelectorAll(`.ticker-item[data-user="${u.user_name}"]`);
      pills.forEach(pill => {
        const ptsEl = pill.querySelector('.pts-tag');
        if (ptsEl && ptsEl.textContent !== `${u.score || 0} PTS`) {
          ptsEl.textContent = `${u.score || 0} PTS`;
        }
        let captEl = pill.querySelector('.captain-badge');
        if (isCaptain && !captEl) {
          captEl = document.createElement('span');
          captEl.className = 'captain-badge';
          captEl.textContent = '👑 CAPT';
          pill.insertBefore(captEl, pill.firstChild);
        } else if (!isCaptain && captEl) {
          captEl.remove();
        }
      });
    });
  }

  function tickDualScrollers(dt) {
    tickerState.blackScroll += dt * tickerState.speed;
    tickerState.whiteScroll += dt * tickerState.speed;

    const trackBlack = document.getElementById('ticker-track-black');
    const trackWhite = document.getElementById('ticker-track-white');

    if (trackBlack && trackBlack.firstElementChild) {
      const halfWidth = trackBlack.scrollWidth / 2;
      if (halfWidth > 0) {
        // Team Black moves towards Team Black side (LEFT: 0 -> -halfWidth)
        const offset = -(tickerState.blackScroll % halfWidth);
        trackBlack.style.transform = `translateX(${offset}px)`;
      }
    }

    if (trackWhite && trackWhite.firstElementChild) {
      const halfWidth = trackWhite.scrollWidth / 2;
      if (halfWidth > 0) {
        // Team White moves towards Team White side (RIGHT: -halfWidth -> 0)
        const offset = -halfWidth + (tickerState.whiteScroll % halfWidth);
        trackWhite.style.transform = `translateX(${offset}px)`;
      }
    }
  }

  // Apply Pull Action
  function applyPull(team, user = 'Viewer', pts = 10) {
    sound.init();
    sound.playPull();

    const impulseAmount = 14;
    const isBlack = (team === 'BLACK');
    const teamPullers = isBlack ? pullers.black : pullers.white;
    const pullDir = isBlack ? -1.0 : 1.0;

    if (isBlack) {
      physics.blackImpulse += impulseAmount;
      addFloatingText(`◄ ${user} +${pts}`, 740, 560 + (Math.random() - 0.5) * 50, '#FFFFFF');
    } else {
      physics.whiteImpulse += impulseAmount;
      addFloatingText(`${user} +${pts} ►`, 1180, 560 + (Math.random() - 0.5) * 50, '#FFFFFF');
    }

    // Dynamic exertion surge & ground friction sparks on all 5 pullers
    teamPullers.forEach((p) => {
      p.extraImpulse = Math.min(1.4, p.extraImpulse + 0.7);
      const baseX = 960 + physics.x + p.xOffset;
      const foot1X = baseX + pullDir * (-20.0 * 0.237);
      const foot2X = baseX + pullDir * (410.0 * 0.237);
      // Floor friction sparks spraying backward
      for (let s = 0; s < 2; s++) {
        addParticle(foot1X + (Math.random() - 0.5) * 8, 755, pullDir * (-40 - Math.random() * 50), -15 - Math.random() * 35, '#FFFFFF', Math.random() * 3 + 1.5, 0.35);
        addParticle(foot2X + (Math.random() - 0.5) * 8, 755, pullDir * (-40 - Math.random() * 50), -15 - Math.random() * 35, '#FFFFFF', Math.random() * 3 + 1.5, 0.35);
      }
    });

    gameState.screenShake = Math.min(6, gameState.screenShake + 1.0);
    registerChatParticipant(user, team, pts);
  }

  // 15-member rosters initialized matching the blueprint
  const nowInit = Date.now();
  const MOCK_BLACK_ROSTER = [
    { user_name: 'ShadowKing', score: 1420, roundComments: 142, lastCommentAt: nowInit },
    { user_name: 'DarkKnight', score: 980, roundComments: 98, lastCommentAt: nowInit },
    { user_name: 'Viper09', score: 750, roundComments: 75, lastCommentAt: nowInit },
    { user_name: 'GhostOps', score: 620, roundComments: 62, lastCommentAt: nowInit },
    { user_name: 'Raven', score: 510, roundComments: 51, lastCommentAt: nowInit },
    { user_name: 'OnyxClaw', score: 430, roundComments: 43, lastCommentAt: nowInit },
    { user_name: 'Eclipse', score: 380, roundComments: 38, lastCommentAt: nowInit },
    { user_name: 'VoidWalker', score: 310, roundComments: 31, lastCommentAt: nowInit },
    { user_name: 'PhantomX', score: 260, roundComments: 26, lastCommentAt: nowInit },
    { user_name: 'Obsidian', score: 210, roundComments: 21, lastCommentAt: nowInit },
  ];

  const MOCK_WHITE_ROSTER = [
    { user_name: 'Solaris', score: 1540, roundComments: 154, lastCommentAt: nowInit },
    { user_name: 'HyperNova', score: 1040, roundComments: 104, lastCommentAt: nowInit },
    { user_name: 'FrostBite', score: 790, roundComments: 79, lastCommentAt: nowInit },
    { user_name: 'BlazeCore', score: 680, roundComments: 68, lastCommentAt: nowInit },
    { user_name: 'AuraMaster', score: 560, roundComments: 56, lastCommentAt: nowInit },
    { user_name: 'Starlight', score: 490, roundComments: 49, lastCommentAt: nowInit },
    { user_name: 'Zenith', score: 410, roundComments: 41, lastCommentAt: nowInit },
    { user_name: 'Apollo', score: 350, roundComments: 35, lastCommentAt: nowInit },
    { user_name: 'Polaris', score: 290, roundComments: 29, lastCommentAt: nowInit },
    { user_name: 'Valkyrie', score: 240, roundComments: 24, lastCommentAt: nowInit },
  ];

  let currentBlackRoster = MOCK_BLACK_ROSTER.map(item => ({ ...item }));
  let currentWhiteRoster = MOCK_WHITE_ROSTER.map(item => ({ ...item }));
  const liveChatters = [];

  // Reset round scores for captain and participants at start of each round
  function resetRoundCaptainScores() {
    currentBlackRoster.forEach(p => {
      p.score = 0;
      p.roundComments = 0;
    });
    currentWhiteRoster.forEach(p => {
      p.score = 0;
      p.roundComments = 0;
    });
    liveChatters.forEach(c => {
      c.score = 0;
      c.roundComments = 0;
    });

    const capBlackScore = document.getElementById('captain-black-score');
    const capWhiteScore = document.getElementById('captain-white-score');
    if (capBlackScore) capBlackScore.textContent = '0';
    if (capWhiteScore) capWhiteScore.textContent = '0';

    updateLeaderboardDOM('lb-list-black', currentBlackRoster.slice(0, 5), 'BLACK');
    updateLeaderboardDOM('lb-list-white', currentWhiteRoster.slice(0, 5), 'WHITE');
    updateDualTickerDOM();
  }

  // Register Live Chat Participant: track comment count & 5-minute activity
  function registerChatParticipant(user, team, pts = 10) {
    if (!user) return;
    const now = Date.now();
    const roster = team === 'BLACK' ? currentBlackRoster : currentWhiteRoster;

    let p = roster.find(item => item.user_name === user);
    if (!p) {
      p = {
        user_name: user,
        team: team,
        score: pts,
        roundComments: 1,
        lastCommentAt: now
      };
      roster.push(p);
    } else {
      p.team = team;
      p.score = (p.score || 0) + pts;
      p.roundComments = (p.roundComments || 0) + 1;
      p.lastCommentAt = now;
    }

    // Sort roster: player with most comments becomes captain (Rank #1)
    roster.sort((a, b) => {
      const diffComments = (b.roundComments || 0) - (a.roundComments || 0);
      if (diffComments !== 0) return diffComments;
      return (b.score || 0) - (a.score || 0);
    });

    // Update Captain display
    const capScoreEl = document.getElementById(team === 'BLACK' ? 'captain-black-score' : 'captain-white-score');
    if (capScoreEl) capScoreEl.textContent = `${roster[0].score || 0}`;

    // Update Top 5 in-place without blinking
    updateLeaderboardDOM(team === 'BLACK' ? 'lb-list-black' : 'lb-list-white', roster.slice(0, 5), team);
    updateDualTickerDOM();
  }

  // In-place DOM update for Top 5 leaderboard: zero blinking
  function updateLeaderboardDOM(containerId, top5List, team) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const crownSvg = `<svg style="width:17px;height:17px;fill:#FFFFFF;margin-left:5px;" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5m14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`;

    while (container.children.length > top5List.length) {
      container.removeChild(container.lastElementChild);
    }

    top5List.forEach((dataItem, idx) => {
      let row = container.children[idx];
      if (!row || !row.classList.contains('top5-item')) {
        row = document.createElement('div');
        row.className = 'top5-item';
        row.innerHTML = `<span class="top5-rank-badge"></span><span class="top5-name"></span><span class="top5-score"></span>`;
        container.appendChild(row);
      }

      if (idx === 0) {
        if (!row.classList.contains('captain-rank1')) row.classList.add('captain-rank1');
      } else {
        if (row.classList.contains('captain-rank1')) row.classList.remove('captain-rank1');
      }

      const rankBadge = row.children[0];
      const nameSpan = row.children[1];
      const scoreSpan = row.children[2];

      if (idx === 0) {
        rankBadge.innerHTML = `1 ${crownSvg}`;
      } else {
        rankBadge.textContent = `${idx + 1}`;
      }

      const nameText = `@${dataItem.user_name || 'Player'}`;
      if (nameSpan.textContent !== nameText) nameSpan.textContent = nameText;

      const scoreText = `${dataItem.score || 0}`;
      if (scoreSpan.textContent !== scoreText) scoreSpan.textContent = scoreText;
    });
  }

  // Next Round / Topic Cycle (Debate Topic changes every 3 rounds)
  function nextTopic() {
    if (gameState.roundNumber >= gameState.totalRounds) {
      // 3 rounds completed! Advance debate topic and reset match scores
      gameState.roundNumber = 1;
      gameState.currentTopicIdx = (gameState.currentTopicIdx + 1) % DEBATE_TOPICS.length;
      gameState.winsBlack = 0;
      gameState.winsWhite = 0;
    } else {
      // Advance to next round within current 3-round debate
      gameState.roundNumber++;
    }

    physics.x = 0;
    physics.vx = 0;
    physics.blackImpulse = 0;
    physics.whiteImpulse = 0;
    gameState.roundTimeRemaining = gameState.roundDuration;
    gameState.isRoundOver = false;
    gameState.roundWinner = null;
    gameState.winnerAnnounceTimer = 0;

    // Reset captain and round scores to zero in each round
    resetRoundCaptainScores();
    updateTopicHUD();
  }

  // Trigger Round Victory
  async function triggerRoundWin(winnerTeam) {
    if (gameState.isRoundOver) return;
    gameState.isRoundOver = true;
    gameState.roundWinner = winnerTeam;
    gameState.winnerAnnounceTimer = 4.0;
    gameState.screenShake = 14;

    if (winnerTeam === 'BLACK') gameState.winsBlack++;
    else gameState.winsWhite++;

    sound.playWin();
    spawnConfetti(winnerTeam);

    try {
      await fetch('../api/chat.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'round_win',
          team: winnerTeam,
          topic_idx: gameState.currentTopicIdx
        })
      });
    } catch (e) {}

    updateTopicHUD();
  }

  // Keyboard Dev Controls
  window.nextTopic = nextTopic;
  window.gameState = gameState;
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (e.key === 'ArrowLeft' || e.key === '1' || k === 'a') {
      applyPull('BLACK', 'ShadowKing', 15);
    } else if (e.key === 'ArrowRight' || e.key === '2' || k === 'd') {
      applyPull('WHITE', 'Solaris', 15);
    } else if (k === 't') {
      nextTopic();
    }
  });

  // Main Loop
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.08, (now - lastTime) / 1000);
    lastTime = now;
    gameState.globalTime += dt;

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (gameState.screenShake > 0) {
      gameState.screenShake = Math.max(0, gameState.screenShake - dt * 24);
    }

    if (!gameState.isRoundOver) {
      gameState.roundTimeRemaining -= dt;
      if (gameState.roundTimeRemaining <= 0) {
        const winner = physics.x < 0 ? 'BLACK' : physics.x > 0 ? 'WHITE' : (Math.random() > 0.5 ? 'BLACK' : 'WHITE');
        triggerRoundWin(winner);
      }
    } else {
      gameState.winnerAnnounceTimer -= dt;
      if (gameState.winnerAnnounceTimer <= 0) {
        nextTopic();
      }
    }

    // Physics
    const netForce = (physics.whiteImpulse - physics.blackImpulse) - (physics.x * physics.centeringSpring);
    physics.blackImpulse *= 0.84;
    physics.whiteImpulse *= 0.84;

    const ax = netForce / physics.mass;
    physics.vx = (physics.vx + ax) * physics.damping;
    physics.x += physics.vx * dt * 60;

    if (!gameState.isRoundOver) {
      if (physics.x <= -physics.winThreshold) triggerRoundWin('BLACK');
      else if (physics.x >= physics.winThreshold) triggerRoundWin('WHITE');
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.isGravity) p.vy += 380 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update Floating Text
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 40 * dt;
      ft.life -= dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // Decay pull impulse exertion smoothly
    pullers.black.forEach(p => {
      if (p.extraImpulse > 0) p.extraImpulse = Math.max(0, p.extraImpulse - dt * 3.2);
    });
    pullers.white.forEach(p => {
      if (p.extraImpulse > 0) p.extraImpulse = Math.max(0, p.extraImpulse - dt * 3.2);
    });

    // Animate stick figure pull cadence with realistic muscular heave
    const effortBlack = 3.2 + Math.abs(physics.vx) * 0.08 + physics.blackImpulse * 0.05;
    const effortWhite = 3.2 + Math.abs(physics.vx) * 0.08 + physics.whiteImpulse * 0.05;
    pullers.black.forEach(p => { p.phase += dt * effortBlack; });
    pullers.white.forEach(p => { p.phase += dt * effortWhite; });

    updateHUDGauges();
    tickDualScrollers(dt);
  }

  // ----------------------------------------------------
  // CINEMATIC MONOCHROME ARENA RENDERER
  // ----------------------------------------------------
  function render() {
    ctx.save();

    if (gameState.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * gameState.screenShake;
      const shakeY = (Math.random() - 0.5) * gameState.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    ctx.clearRect(0, 0, 1920, 1080);

    // 1. Arena Background (AI Generated Plate or Procedural Fallback)
    if (isImgReady(arenaBgImg)) {
      ctx.drawImage(arenaBgImg, 0, 0, 1920, 1080);
    } else {
      drawStadiumBackground();
      drawHangingCrownBanners();
      drawReflectiveGridFloor();
    }

    // 2. Center Vertical Glowing Laser Beam (demarcation layer)
    drawCenterLaserBeam();

    // 3. Heavy Braided Rope with Dynamic Strain & Tension
    drawBraidedRope();

    // 4. Black & White Stick-Figure Teams (100% Procedural Vector with Dynamic Motion)
    drawStickmanTeams();

    // 5. Particles & Sparks
    drawParticles();

    // 6. Floating Action Text
    drawFloatingCombatText();

    // 7. Victory Banner Overlay
    if (gameState.isRoundOver) {
      drawVictoryOverlay();
    }

    ctx.restore();
  }

  // 1. Stadium Background with Floodlights
  function drawStadiumBackground() {
    // Skybox gradient: deep black to dark slate gray
    const bg = ctx.createLinearGradient(960, 0, 960, 680);
    bg.addColorStop(0, '#000000');
    bg.addColorStop(0.5, '#050505');
    bg.addColorStop(1, '#0C0C0C');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1920, 680);

    // Upper grandstand seating silhouettes
    ctx.fillStyle = '#080808';
    ctx.beginPath();
    ctx.ellipse(960, 560, 1200, 220, 0, Math.PI, 0);
    ctx.fill();

    // Spectator rows (subtle tiered arcs)
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 1;
    for (let r = 0; r < 5; r++) {
      ctx.beginPath();
      ctx.ellipse(960, 520 + r * 16, 1150 - r * 40, 190 - r * 10, 0, Math.PI, 0);
      ctx.stroke();
    }

    // Subtle bokeh/spectator light clusters
    const t = gameState.globalTime;
    ctx.fillStyle = '#FFFFFF';
    for (let x = 60; x < 1860; x += 44) {
      const flicker = (Math.sin(t * 3 + x * 0.05) + 1) * 0.5;
      ctx.globalAlpha = 0.04 + flicker * 0.06;
      ctx.beginPath();
      ctx.arc(x, 480 + Math.sin(x * 0.02) * 20, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Stadium Floodlights along the upper rim
    drawStadiumFloodlight(320, 160, 220, 680, 0.12);
    drawStadiumFloodlight(620, 180, 500, 680, 0.08);
    drawStadiumFloodlight(1300, 180, 1420, 680, 0.08);
    drawStadiumFloodlight(1600, 160, 1700, 680, 0.12);
  }

  function drawStadiumFloodlight(sx, sy, tx, ty, intensity) {
    ctx.save();
    // Glowing source lens
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Volumetric cone
    const grad = ctx.createRadialGradient(sx, sy, 5, tx, ty, 380);
    grad.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx - 15, sy);
    ctx.lineTo(sx + 15, sy);
    ctx.lineTo(tx + 220, ty);
    ctx.lineTo(tx - 220, ty);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 2. Hanging Faction Crown Banners
  function drawHangingCrownBanners() {
    // Left: Black Banner with White Crown
    drawBanner(550, 260, 105, 260, 'BLACK');
    // Right: White Banner with Black Crown
    drawBanner(1365, 260, 105, 260, 'WHITE');
  }

  function drawBanner(x, y, w, h, team) {
    ctx.save();
    const isBlack = team === 'BLACK';

    // Hanging vertical cables
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 10, 0); ctx.lineTo(x + 10, y);
    ctx.moveTo(x + w - 10, 0); ctx.lineTo(x + w - 10, y);
    ctx.stroke();

    // Horizontal mounting rod
    ctx.fillStyle = '#888888';
    ctx.fillRect(x - 8, y - 4, w + 16, 6);

    // Banner cloth with dual swallowtail points
    ctx.fillStyle = isBlack ? '#050505' : '#FFFFFF';
    ctx.strokeStyle = isBlack ? '#444444' : '#1A1A1A';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w * 0.75, y + h - 24);
    ctx.lineTo(x + w * 0.5, y + h);
    ctx.lineTo(x + w * 0.25, y + h - 24);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner contour border
    ctx.strokeStyle = isBlack ? '#242424' : '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(x + 8, y + 8, w - 16, h - 38);
    ctx.stroke();

    // Stenciled Crown Emblem
    ctx.fillStyle = isBlack ? '#FFFFFF' : '#000000';
    const cx = x + w / 2;
    const cy = y + 85;
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy + 12);
    ctx.lineTo(cx - 28, cy - 14);
    ctx.lineTo(cx - 10, cy - 2);
    ctx.lineTo(cx, cy - 22);
    ctx.lineTo(cx + 10, cy - 2);
    ctx.lineTo(cx + 28, cy - 14);
    ctx.lineTo(cx + 24, cy + 12);
    ctx.closePath();
    ctx.fill();

    // Crown base bar
    ctx.fillRect(cx - 24, cy + 15, 48, 5);

    ctx.restore();
  }

  // 3. Reflective Glossy Grid Floor
  function drawReflectiveGridFloor() {
    const horizonY = 660;
    const botY = 1080;

    // Glossy floor base
    const floorGrad = ctx.createLinearGradient(960, horizonY, 960, botY);
    floorGrad.addColorStop(0, '#0A0A0A');
    floorGrad.addColorStop(0.3, '#070707');
    floorGrad.addColorStop(1, '#000000');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizonY, 1920, botY - horizonY);

    // Horizon line
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(1920, horizonY);
    ctx.stroke();

    // Longitudinal grid lines converging to center vanishing point (960, 660)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const numCols = 36;
    for (let c = -numCols / 2; c <= numCols / 2; c++) {
      const xBot = 960 + c * 82;
      const xTop = 960 + c * 26;
      ctx.beginPath();
      ctx.moveTo(xTop, horizonY);
      ctx.lineTo(xBot, botY);
      ctx.stroke();
    }

    // Transverse grid lines with perspective spacing
    const numRanks = 14;
    for (let r = 1; r <= numRanks; r++) {
      const p = Math.pow(r / numRanks, 2.2);
      const y = horizonY + p * (botY - horizonY);
      const alpha = 0.04 + (r / numRanks) * 0.12;
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1920, y);
      ctx.stroke();
    }
  }

  // 4. Center Vertical Laser Beam
  function drawCenterLaserBeam() {
    const cx = 960;

    // Outer soft glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, 1080);
    ctx.stroke();

    // Medium glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, 1080);
    ctx.stroke();

    // Razor-sharp intense core
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, 1080);
    ctx.stroke();

    // Subtle ground beacon splash
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.ellipse(cx, 675, 40, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Heavy Braided Rope with Dynamic Strain & Tension
  function drawBraidedRope() {
    const ropeY = 675;
    const floorY = 755;
    const centerKnotX = 960 + physics.x;
    const leftAnchorX = centerKnotX - 680;
    const rightAnchorX = centerKnotX + 680;

    const tension = Math.min(1, Math.abs(physics.vx) / 8 + Math.abs(physics.x) / physics.winThreshold);
    const sag = 5 - tension * 4.5;

    // Floor shadow under rope on the polished arena floor
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(leftAnchorX - 160, floorY);
    ctx.lineTo(rightAnchorX + 160, floorY);
    ctx.stroke();

    // Braided Rope Core
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY);
    ctx.quadraticCurveTo(centerKnotX, ropeY + sag, rightAnchorX, ropeY);
    ctx.stroke();

    // Braided white and dark twisted strands
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4.5;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY - 2);
    ctx.quadraticCurveTo(centerKnotX, ropeY - 2 + sag, rightAnchorX, ropeY - 2);
    ctx.stroke();

    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 4.5;
    ctx.lineDashOffset = 11;
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY + 2);
    ctx.quadraticCurveTo(centerKnotX, ropeY + 2 + sag, rightAnchorX, ropeY + 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rope tails curling gracefully onto the arena floor behind the anchor pullers
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';

    // Left trail (Team Black anchor tail)
    ctx.beginPath();
    ctx.moveTo(leftAnchorX, ropeY);
    ctx.bezierCurveTo(leftAnchorX - 80, ropeY + 20, leftAnchorX - 120, floorY - 5, leftAnchorX - 180, floorY);
    ctx.stroke();

    // Right trail (Team White anchor tail)
    ctx.beginPath();
    ctx.moveTo(rightAnchorX, ropeY);
    ctx.bezierCurveTo(rightAnchorX + 80, ropeY + 20, rightAnchorX + 120, floorY - 5, rightAnchorX + 180, floorY);
    ctx.stroke();

    // Center Circular Reticle Marker
    ctx.save();
    ctx.translate(centerKnotX, ropeY + sag);

    // 8 Sharp white strain speed lines bursting from reticle
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const rx1 = Math.cos(angle) * 36;
      const ry1 = Math.sin(angle) * 36;
      const rx2 = Math.cos(angle) * 52;
      const ry2 = Math.sin(angle) * 52;
      ctx.beginPath();
      ctx.moveTo(rx1, ry1);
      ctx.lineTo(rx2, ry2);
      ctx.stroke();
    }

    // Outer white ring
    ctx.fillStyle = '#080808';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner ring
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.stroke();

    // Center Crown Emblem in Reticle
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-15, 9);
    ctx.lineTo(-17, -8);
    ctx.lineTo(-6, -1);
    ctx.lineTo(0, -14);
    ctx.lineTo(6, -1);
    ctx.lineTo(17, -8);
    ctx.lineTo(15, 9);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(-15, 11, 30, 4);

    ctx.restore();
  }

  // 6. Black & White Stick-Figure Teams (100% Procedural Vector with Dynamic Motion)
  function drawStickmanTeams() {
    const centerKnotX = 960 + physics.x;
    const ropeY = 675;

    // Black Team (Left side: 5 Pullers pulling Left)
    pullers.black.forEach((p) => {
      const baseX = centerKnotX + p.xOffset;
      drawStickmanPuller(baseX, ropeY, 'BLACK', p.phase, p.extraImpulse);
    });

    // White Team (Right side: 5 Pullers pulling Right)
    pullers.white.forEach((p) => {
      const baseX = centerKnotX + p.xOffset;
      drawStickmanPuller(baseX, ropeY, 'WHITE', p.phase, p.extraImpulse);
    });
  }

  function drawStickmanPuller(cx, cy, team, phase, extraImpulse = 0) {
    const isBlack = (team === 'BLACK');
    const pullDir = isBlack ? -1.0 : 1.0;
    const img = isBlack ? stickmanBlackImg : stickmanWhiteImg;
    const imgReady = isImgReady(img);

    // Primary: Render using User-Attached PNG (media_1792576999153_bdefe6a6.png) with dynamic motion
    if (imgReady) {
      ctx.save();

      const floorY = 755;
      const scale = 80.0 / 368.0; // Hand to foot distance = 80px (matching rope to floor)
      const w = 612.0 * scale;
      const h = 628.0 * scale;

      const handX = isBlack ? (612.0 - 84.0) * scale : 84.0 * scale;
      const handY = 258.0 * scale;

      // Dynamic heave and muscular strain
      const heave = Math.sin(phase);
      const strainX = pullDir * (heave * 4.0 + extraImpulse * 12.0);
      const bounceY = Math.abs(heave) * 2.0;

      // Pivot point at planted feet
      const pivotX = cx + pullDir * 30 + strainX;
      const pivotY = floorY;
      const leanAngle = pullDir * (heave * 0.035 + extraImpulse * 0.07);

      const relDrawX = (cx - handX) - (cx + pullDir * 30);
      const relDrawY = (cy - handY) - floorY;

      // 1. Glossy Floor Mirror Reflection
      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.scale(1, -0.65);
      ctx.rotate(-leanAngle * 0.5);
      ctx.globalAlpha = isBlack ? 0.20 : 0.25;
      ctx.drawImage(img, relDrawX, relDrawY, w, h);
      ctx.restore();

      // 2. Main Stick Figure Image with dynamic lean & heave
      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(leanAngle);
      ctx.globalAlpha = 1.0;
      ctx.drawImage(img, relDrawX, relDrawY + bounceY, w, h);

      // 3. Exertion Sweat Spray Radiating Behind Head
      if (extraImpulse > 0.05 || Math.sin(phase) > 0.3) {
        const headSprX = isBlack ? (612.0 - 430.0) * scale : 430.0 * scale;
        const headSprY = 108.0 * scale;
        const hx = relDrawX + headSprX;
        const hy = relDrawY + headSprY + bounceY;
        const sprayDir = -pullDir;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        for (let s = 0; s < 3; s++) {
          const sx = hx + sprayDir * (18 + s * 6);
          const sy = hy + (s * 8 - 6);
          const len = 10 + s * 3 + extraImpulse * 8;
          const ex = sx + sprayDir * len;
          const ey = sy - 4;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(ex, ey, 2.0, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        }
      }

      ctx.restore();
      ctx.restore();
      return;
    }

    ctx.save();
    const outerStroke = isBlack ? '#FFFFFF' : '#000000';
    const innerFill = isBlack ? '#000000' : '#FFFFFF';

    const floorY = 755;
    const scale = 0.237;

    // Dynamic heave motion
    const heave = Math.sin(phase);
    const leanPx = (heave * 12.0 + extraImpulse * 18.0) * scale;
    const leanPy = (Math.abs(heave) * 5.0) * scale;

    // Head
    const headX = cx + pullDir * (220.0 * scale + leanPx * 1.2);
    const headY = cy + (-167.5 * scale + leanPy);
    const headR = 85.0 * scale;

    // Shoulders
    const shoulderX = cx + pullDir * (200.0 * scale + leanPx);
    const shoulderY = cy + (-62.0 * scale + leanPy * 0.8);

    // Hips
    const hipX = cx + pullDir * (300.0 * scale + leanPx * 0.6);
    const hipY = cy + (98.0 * scale + leanPy * 0.4);

    // Dual ball fists gripping the rope
    const fist1X = cx + pullDir * (-55.0 * scale - leanPx * 0.3);
    const fist1Y = cy + (-7.5 * scale);
    const fist1R = 34.0 * scale;

    const fist2X = cx + pullDir * (+55.0 * scale - leanPx * 0.3);
    const fist2Y = cy + (+7.5 * scale);
    const fist2R = 34.0 * scale;

    // Bent elbow for near arm
    const elbowX = cx + pullDir * (180.0 * scale + leanPx * 0.5);
    const elbowY = cy + (10.0 * scale + leanPy * 0.5);

    // Front leg (braced lunging forward with bent knee)
    const knee1X = cx + pullDir * (90.0 * scale);
    const knee1Y = cy + (168.0 * scale - leanPy * 0.3);
    const foot1X = cx + pullDir * (-20.0 * scale);
    const foot1Y = floorY;

    // Rear leg (digging backward with bent knee)
    const knee2X = cx + pullDir * (350.0 * scale + leanPx * 0.3);
    const knee2Y = cy + (198.0 * scale - leanPy * 0.2);
    const foot2X = cx + pullDir * (410.0 * scale);
    const foot2Y = floorY;

    // Shoe sole dimensions
    const soleW1 = 180.0 * scale;
    const soleW2 = 160.0 * scale;
    const soleH = 36.0 * scale;

    const contourThick = 5.0;
    const limbW = 24.0 * scale;

    // ----------------------------------------------------
    // 1. FLOOR REFLECTION (Polished tile mirror reflection)
    // ----------------------------------------------------
    ctx.save();
    ctx.globalAlpha = isBlack ? 0.20 : 0.25;
    ctx.strokeStyle = isBlack ? '#404040' : '#FFFFFF';
    ctx.fillStyle = isBlack ? '#404040' : '#FFFFFF';
    ctx.lineWidth = limbW * 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Reflected torso
    ctx.beginPath();
    ctx.moveTo(shoulderX, floorY * 2 - shoulderY);
    ctx.lineTo(hipX, floorY * 2 - hipY);
    ctx.stroke();

    // Reflected front leg
    ctx.beginPath();
    ctx.moveTo(hipX, floorY * 2 - hipY);
    ctx.lineTo(knee1X, floorY * 2 - knee1Y);
    ctx.lineTo(foot1X, floorY);
    ctx.stroke();

    // Reflected rear leg
    ctx.beginPath();
    ctx.moveTo(hipX, floorY * 2 - hipY);
    ctx.lineTo(knee2X, floorY * 2 - knee2Y);
    ctx.lineTo(foot2X, floorY);
    ctx.stroke();

    // Reflected head
    ctx.beginPath();
    ctx.arc(headX, floorY * 2 - headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Helper for double-contoured segments
    function drawSegment(x1, y1, x2, y2, width) {
      // Outer stroke
      ctx.strokeStyle = outerStroke;
      ctx.lineWidth = width + contourThick * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Inner core
      ctx.strokeStyle = innerFill;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Helper for rounded shoe soles
    function drawShoeSole(x, y, w, h, facingDir) {
      const rx = Math.min(x - facingDir * w * 0.5, x + facingDir * w * 0.5);
      const r = h * 0.5;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(rx, y - h, Math.abs(w), h, r);
      } else {
        ctx.rect(rx, y - h, Math.abs(w), h);
      }
      ctx.fillStyle = innerFill;
      ctx.strokeStyle = outerStroke;
      ctx.lineWidth = contourThick;
      ctx.fill();
      ctx.stroke();
    }

    // 2. Draw Rear Leg (Hip -> Knee 2 -> Foot 2)
    drawSegment(hipX, hipY, knee2X, knee2Y, limbW * 1.1);
    drawSegment(knee2X, knee2Y, foot2X, foot2Y, limbW * 1.0);
    drawShoeSole(foot2X, foot2Y, soleW2, soleH, pullDir);

    // 3. Draw Far Arm (Shoulder -> Fist 1)
    drawSegment(shoulderX, shoulderY, fist1X, fist1Y, limbW * 0.85);

    // 4. Draw Torso (Shoulder -> Hip)
    drawSegment(shoulderX, shoulderY, hipX, hipY, limbW * 1.45);

    // 5. Draw Front Leg (Hip -> Knee 1 -> Foot 1)
    drawSegment(hipX, hipY, knee1X, knee1Y, limbW * 1.15);
    drawSegment(knee1X, knee1Y, foot1X, foot1Y, limbW * 1.0);
    drawShoeSole(foot1X, foot1Y, soleW1, soleH, -pullDir);

    // 6. Draw Near Arm (Shoulder -> Elbow -> Fist 2)
    drawSegment(shoulderX, shoulderY, elbowX, elbowY, limbW * 0.95);
    drawSegment(elbowX, elbowY, fist2X, fist2Y, limbW * 0.95);

    // 7. Draw Ball Fists gripping rope
    function drawBallFist(fx, fy, fr) {
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fillStyle = innerFill;
      ctx.strokeStyle = outerStroke;
      ctx.lineWidth = contourThick;
      ctx.fill();
      ctx.stroke();
    }
    drawBallFist(fist1X, fist1Y, fist1R);
    drawBallFist(fist2X, fist2Y, fist2R);

    // 8. Draw Head
    ctx.beginPath();
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.fillStyle = innerFill;
    ctx.strokeStyle = outerStroke;
    ctx.lineWidth = contourThick;
    ctx.fill();
    ctx.stroke();

    // 9. Effort Sweat Spray radiating behind head
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    const sprayDir = -pullDir;
    const sweatOffsets = [
      { dx: 18, dy: -6, len: 12 },
      { dx: 24, dy: 4, len: 10 },
      { dx: 14, dy: 14, len: 8 },
    ];
    sweatOffsets.forEach(s => {
      const sx = headX + sprayDir * s.dx;
      const sy = headY + s.dy;
      const ex = sx + sprayDir * (s.len + (extraImpulse || 0) * 8);
      const ey = sy - 4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ex, ey, 2.0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    });

    ctx.restore();
  }

  // 7. Active Particles
  function drawParticles() {
    for (const p of particles) {
      const alpha = Math.min(1, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  // 8. Floating Combat Text
  function drawFloatingCombatText() {
    for (const ft of floatingTexts) {
      const alpha = Math.min(1, ft.life / ft.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '900 20px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';

      // Drop shadow
      ctx.fillStyle = '#000000';
      ctx.fillText(ft.text, ft.x + 2, ft.y + 2);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  // 9. Victory Banner Overlay
  function drawVictoryOverlay() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.94)';
    ctx.fillRect(0, 360, 1920, 240);

    const isBlack = gameState.roundWinner === 'BLACK';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 360, 1920, 240);

    ctx.font = '900 64px "Russo One", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';

    const curTopic = DEBATE_TOPICS[gameState.currentTopicIdx] || { left: 'ANDROID', right: 'IPHONE' };
    const winnerTopic = isBlack ? curTopic.left : curTopic.right;
    const winText = `👑 TEAM ${winnerTopic} VICTORIOUS 👑`;
    ctx.fillText(winText, 960, 475);

    ctx.font = '800 22px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#B5B5B5';
    const countdown = Math.ceil(gameState.winnerAnnounceTimer);
    ctx.fillText(`NEXT ROUND COMMENCES IN ${countdown}S...`, 960, 540);

    ctx.restore();
  }

  // ----------------------------------------------------
  // HUD UPDATER
  // ----------------------------------------------------
  function updateTopicHUD() {
    const curTopic = DEBATE_TOPICS[gameState.currentTopicIdx] || { left: 'ANDROID', right: 'IPHONE' };

    // 1. Top Header Team Identity Blocks
    const teamNameBlack = document.getElementById('team-name-black');
    const teamNameWhite = document.getElementById('team-name-white');
    if (teamNameBlack) teamNameBlack.textContent = curTopic.left;
    if (teamNameWhite) teamNameWhite.textContent = curTopic.right;

    // 2. Control Bar Percent Sublabels
    const controlLabelBlack = document.getElementById('control-label-black');
    const controlLabelWhite = document.getElementById('control-label-white');
    if (controlLabelBlack) controlLabelBlack.textContent = `TEAM ${curTopic.left} CONTROL`;
    if (controlLabelWhite) controlLabelWhite.textContent = `TEAM ${curTopic.right} CONTROL`;

    // 3. Flanking Top 5 Leaderboards
    const top5HeaderBlack = document.getElementById('top5-header-black');
    const top5HeaderWhite = document.getElementById('top5-header-white');
    if (top5HeaderBlack) top5HeaderBlack.textContent = `TOP 5 - ${curTopic.left}`;
    if (top5HeaderWhite) top5HeaderWhite.textContent = `TOP 5 - ${curTopic.right}`;

    // 4. Center Above-Middle Debate Widget
    const topicLeft = document.getElementById('topic-left-text');
    const topicRight = document.getElementById('topic-right-text');
    if (topicLeft) topicLeft.textContent = curTopic.left;
    if (topicRight) topicRight.textContent = curTopic.right;

    const sideTagBlack = document.getElementById('side-tag-black');
    const sideTagWhite = document.getElementById('side-tag-white');
    if (sideTagBlack) sideTagBlack.textContent = `TEAM ${curTopic.left}`;
    if (sideTagWhite) sideTagWhite.textContent = `TEAM ${curTopic.right}`;

    const footerBlack = document.getElementById('footer-topic-black');
    const footerWhite = document.getElementById('footer-topic-white');
    if (footerBlack) footerBlack.textContent = curTopic.left;
    if (footerWhite) footerWhite.textContent = curTopic.right;

    const debateRoundInd = document.getElementById('debate-round-indicator');
    if (debateRoundInd) {
      debateRoundInd.textContent = `ROUND ${gameState.roundNumber} OF ${gameState.totalRounds}`;
    }

    // 5. Command Deck Headers & Action Subtexts
    const cmdHeaderBlack = document.getElementById('cmd-header-black');
    const cmdHeaderWhite = document.getElementById('cmd-header-white');
    if (cmdHeaderBlack) cmdHeaderBlack.textContent = `JOIN TEAM ${curTopic.left}`;
    if (cmdHeaderWhite) cmdHeaderWhite.textContent = `JOIN TEAM ${curTopic.right}`;

    const cmdSubBlack = document.querySelector('.cmd-box.black .cmd-subtext');
    const cmdSubWhite = document.querySelector('.cmd-box.white .cmd-subtext');
    if (cmdSubBlack) cmdSubBlack.textContent = `FOR ${curTopic.left}`;
    if (cmdSubWhite) cmdSubWhite.textContent = `FOR ${curTopic.right}`;

    // 6. Live Chat Terminal Stream Tags
    const streamTagBlack = document.getElementById('stream-tag-black');
    const streamTagWhite = document.getElementById('stream-tag-white');
    if (streamTagBlack) streamTagBlack.textContent = `◄ TEAM ${curTopic.left}`;
    if (streamTagWhite) streamTagWhite.textContent = `TEAM ${curTopic.right} ►`;

    const winsBlackEl = document.getElementById('wins-black-count');
    const winsWhiteEl = document.getElementById('wins-white-count');
    if (winsBlackEl) winsBlackEl.textContent = gameState.winsBlack;
    if (winsWhiteEl) winsWhiteEl.textContent = gameState.winsWhite;

    // Victory pips (3 dots)
    const blackPips = document.getElementById('wins-black-pips');
    if (blackPips && blackPips.children) {
      for (let i = 0; i < blackPips.children.length; i++) {
        if (i < gameState.winsBlack) {
          blackPips.children[i].classList.add('filled');
        } else {
          blackPips.children[i].classList.remove('filled');
        }
      }
    }

    const whitePips = document.getElementById('wins-white-pips');
    if (whitePips && whitePips.children) {
      for (let i = 0; i < whitePips.children.length; i++) {
        if (i < gameState.winsWhite) {
          whitePips.children[i].classList.add('filled');
        } else {
          whitePips.children[i].classList.remove('filled');
        }
      }
    }

    const roundCycleEl = document.getElementById('round-cycle-text');
    if (roundCycleEl) {
      roundCycleEl.textContent = `ROUND 0${gameState.roundNumber} / 0${gameState.totalRounds}`;
    }

    const capBlackScore = document.getElementById('captain-black-score');
    const capWhiteScore = document.getElementById('captain-white-score');
    if (capBlackScore && currentBlackRoster.length > 0) {
      capBlackScore.textContent = `${currentBlackRoster[0].score || 0}`;
    }
    if (capWhiteScore && currentWhiteRoster.length > 0) {
      capWhiteScore.textContent = `${currentWhiteRoster[0].score || 0}`;
    }
  }

  function updateHUDGauges() {
    // Timer display (clean digital MM:SS)
    const timerEl = document.getElementById('round-timer-text');
    if (timerEl) {
      const totalSec = Math.max(0, Math.floor(gameState.roundTimeRemaining));
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      timerEl.textContent = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Tug Control Bar Percentages & Position
    const pctBlackEl = document.getElementById('pct-black');
    const pctWhiteEl = document.getElementById('pct-white');
    const barBlack = document.getElementById('tug-bar-black');
    const barWhite = document.getElementById('tug-bar-white');
    const marker = document.getElementById('tug-bar-marker');

    const dispNorm = Math.max(-1, Math.min(1, physics.x / physics.winThreshold));
    const blackShare = Math.round(50 - dispNorm * 50);
    const whiteShare = 100 - blackShare;

    gameState.pctBlack = blackShare;
    gameState.pctWhite = whiteShare;

    if (pctBlackEl) pctBlackEl.textContent = `${blackShare}%`;
    if (pctWhiteEl) pctWhiteEl.textContent = `${whiteShare}%`;
    if (barBlack) barBlack.style.width = `${blackShare}%`;
    if (barWhite) barWhite.style.width = `${whiteShare}%`;
    if (marker) marker.style.left = `${blackShare}%`;
  }

  // Server API Polling
  async function pollServerChat() {
    try {
      const res = await fetch('../api/chat.php?poll=1');
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.incoming_pulls)) {
          for (const item of data.incoming_pulls) {
            applyPull(item.team, item.user);
          }
        }
        if (Array.isArray(data.leaderboards?.black)) {
          currentBlackRoster = data.leaderboards.black;
          updateLeaderboardDOM('lb-list-black', currentBlackRoster.slice(0, 5), 'BLACK');
        }
        if (Array.isArray(data.leaderboards?.white)) {
          currentWhiteRoster = data.leaderboards.white;
          updateLeaderboardDOM('lb-list-white', currentWhiteRoster.slice(0, 5), 'WHITE');
        }
      }
    } catch (e) {}
  }

  // ----------------------------------------------------
  // INITIALIZATION & SIMULATED AUTOPLAY
  // ----------------------------------------------------
  const isPreviewMode = window.location.search.includes('preview=1') || window.location.search.includes('test=1') || true;

  updateTopicHUD();
  updateLeaderboardDOM('lb-list-black', currentBlackRoster.slice(0, 5), 'BLACK');
  updateLeaderboardDOM('lb-list-white', currentWhiteRoster.slice(0, 5), 'WHITE');
  updateDualTickerDOM();

  const capBlackScore = document.getElementById('captain-black-score');
  const capWhiteScore = document.getElementById('captain-white-score');
  if (capBlackScore) capBlackScore.textContent = `${currentBlackRoster[0].score}`;
  if (capWhiteScore) capWhiteScore.textContent = `${currentWhiteRoster[0].score}`;

  // Periodic pruning of participants inactive > 5 minutes
  setInterval(() => {
    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;
    currentBlackRoster = currentBlackRoster.filter(p => !p.lastCommentAt || (now - p.lastCommentAt <= FIVE_MIN));
    currentWhiteRoster = currentWhiteRoster.filter(p => !p.lastCommentAt || (now - p.lastCommentAt <= FIVE_MIN));
    updateLeaderboardDOM('lb-list-black', currentBlackRoster.slice(0, 5), 'BLACK');
    updateLeaderboardDOM('lb-list-white', currentWhiteRoster.slice(0, 5), 'WHITE');
    updateDualTickerDOM();
  }, 10000);

  // Active vote simulation for realistic broadcast motion
  if (isPreviewMode) {
    setInterval(() => {
      if (gameState.isRoundOver) return;

      const isBlack = Math.random() < 0.5;
      const team = isBlack ? 'BLACK' : 'WHITE';
      const roster = isBlack ? currentBlackRoster : currentWhiteRoster;
      const userObj = roster[Math.floor(Math.random() * Math.min(5, roster.length))];

      applyPull(team, userObj.user_name, 10);
    }, 1200);
  }

  // Sub-second chat polling (500ms) for instant responsiveness
  setInterval(pollServerChat, 500);

  render();
  requestAnimationFrame(loop);
})();
