const SUPA_URL = 'https://ajmvusgiepxmkgpkzvtd.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqbXZ1c2dpZXB4bWtncGt6dnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDIyNDMsImV4cCI6MjA5NDI3ODI0M30.YSCU_Oh5cWUa3LVUWfnnD23RfXsoG_Mxa-YVuR3_Rho';

const FIELDS = ['full_name','email','website_url','coin_name','coin_ticker',
  'coin_tagline','coin_supply','blockchain','launch_date','wallet_address',
  'twitter_handle','telegram_link','discord_link'];

var TOKEN   = '';
var USER    = null;
var PROFILE = {};
var expandedMission = '';
var expandedAbout   = '';
var expandedAbout2  = '';

window.addEventListener('DOMContentLoaded', boot);

async function boot(){
  TOKEN = localStorage.getItem('ml_token') || '';
  USER  = JSON.parse(localStorage.getItem('ml_user') || 'null');

  if(!TOKEN || !USER){ window.location.href = 'login.html'; return; }

  document.getElementById('navUsername').textContent = USER.full_name || USER.email;

  // Silent token refresh
  var refresh = localStorage.getItem('ml_refresh') || '';
  if(refresh){
    try{
      var r = await fetch(SUPA_URL + '/auth/v1/token?grant_type=refresh_token', {
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPA_KEY},
        body: JSON.stringify({refresh_token: refresh})
      });
      var d = await r.json();
      if(d.access_token){
        TOKEN = d.access_token;
        localStorage.setItem('ml_token', TOKEN);
        if(d.refresh_token) localStorage.setItem('ml_refresh', d.refresh_token);
      }
    } catch(e){}
  }

  loadProfile();
}

async function loadProfile(){
  try{
    var authToken = TOKEN || SUPA_KEY;
    var r = await fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + USER.id + '&select=*', {
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer ' + authToken}
    });
    var rows = await r.json();
    if(Array.isArray(rows) && rows.length > 0){
      PROFILE = rows[0];
      FIELDS.forEach(function(f){
        var el = document.getElementById(f);
        if(!el) return;
        if(PROFILE[f] !== null && PROFILE[f] !== undefined && PROFILE[f].toString().trim() !== ''){
          el.value = PROFILE[f];
        }
      });
      fetchPrice();
    }
    // rows empty = no profile row yet, that's fine — user fills in and saves
  } catch(e){
    showSaveStatus('Could not load your profile. Check your connection and refresh.', 'error');
  }
}

async function saveProfile(){
  if(!TOKEN || !USER){ showSaveStatus('Session expired. Please log out and log in again.', 'error'); return; }
  var btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  showSaveStatus('', '');

  var payload = {id: USER.id};
  FIELDS.forEach(function(f){
    var el = document.getElementById(f);
    if(el){ payload[f] = el.value.trim() || null; }
  });

  try{
    var authToken = TOKEN || SUPA_KEY;
    var r = await fetch(SUPA_URL + '/rest/v1/profiles?on_conflict=id', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':SUPA_KEY,
        'Authorization':'Bearer ' + authToken,
        'Prefer':'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if(r.ok || r.status === 200 || r.status === 201 || r.status === 204){
      FIELDS.forEach(function(f){ PROFILE[f] = payload[f]; });
      if(payload.full_name){
        USER.full_name = payload.full_name;
        localStorage.setItem('ml_user', JSON.stringify(USER));
        document.getElementById('navUsername').textContent = payload.full_name;
      }
      showSaveStatus('✓ Saved successfully', 'success');
      fetchPrice();
    } else {
      var errText = '';
      try{ errText = await r.text(); } catch(e2){}
      showSaveStatus('Save failed (' + r.status + '): ' + (errText || 'Please try again.'), 'error');
    }
  } catch(e){
    showSaveStatus('Save failed: ' + e.message, 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Save Profile';
}

function showSaveStatus(msg, type){
  var el = document.getElementById('saveMsg');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
  el.style.color = type === 'success' ? '#0faf6d' : '#f88';
}

async function fetchPrice(){
  var coinName = (PROFILE.coin_name || document.getElementById('coin_name').value || '').trim().toLowerCase().replace(/\s+/g,'-');
  var ticker   = (PROFILE.coin_ticker || document.getElementById('coin_ticker').value || '').trim().toUpperCase();
  var widget   = document.getElementById('priceWidget');
  var content  = document.getElementById('priceContent');
  var liveDot  = document.getElementById('liveDot');

  if(!coinName){ widget.classList.remove('show'); return; }
  widget.classList.add('show');
  document.getElementById('priceWidgetTitle').textContent = ticker ? ticker + ' — Live Price' : 'Live Coin Price';

  try{
    var r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + encodeURIComponent(coinName) + '&vs_currencies=usd&include_market_cap=true&include_24hr_change=true&include_24hr_vol=true');
    var data = await r.json();
    var cd = data[coinName];
    if(cd && cd.usd !== undefined){
      var chg = cd.usd_24h_change || 0;
      var cls = chg >= 0 ? 'up' : 'down';
      var sgn = chg >= 0 ? '+' : '';
      liveDot.style.display = 'inline-flex';
      content.innerHTML =
        '<div class="price-grid">' +
        stat('Price (USD)','$'+fmtPrice(cd.usd),ticker) +
        stat('24h Change',sgn+chg.toFixed(2)+'%','Last 24 hours',cls) +
        stat('Market Cap',fmtLarge(cd.usd_market_cap),'USD') +
        stat('24h Volume',fmtLarge(cd.usd_24h_vol),'USD') +
        '</div>' +
        '<div style="font-size:.72rem;color:var(--accent-light);margin-top:.8rem;text-align:right;">Data via CoinGecko · Updated ' + new Date().toLocaleTimeString() + '</div>';
    } else {
      liveDot.style.display = 'none';
      content.innerHTML = '<div class="price-pending"><strong>' + (ticker||coinName.toUpperCase()) + '</strong> is not yet listed on CoinGecko. Once listed your live price appears here automatically.<br/><br/><a href="https://www.coingecko.com/en/coins/add" target="_blank">Submit your coin to CoinGecko →</a></div>';
    }
  } catch(e){
    liveDot.style.display = 'none';
    content.innerHTML = '<div class="price-pending">Unable to fetch price data right now. Try refreshing.</div>';
  }
}

function stat(label,value,sub,cls){
  return '<div class="price-stat"><div class="price-stat-label">'+label+'</div><div class="price-stat-value'+(cls?' '+cls:'')+'">'+value+'</div><div class="price-stat-sub">'+(sub||'')+'</div></div>';
}
function fmtPrice(p){
  if(p>=1) return p.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});
  if(p>=0.001) return p.toFixed(6);
  return p.toExponential(4);
}
function fmtLarge(v){
  if(!v) return '—';
  if(v>=1e9) return '$'+(v/1e9).toFixed(2)+'B';
  if(v>=1e6) return '$'+(v/1e6).toFixed(2)+'M';
  if(v>=1e3) return '$'+(v/1e3).toFixed(2)+'K';
  return '$'+v.toFixed(2);
}

// ============================================================
// COIN SITE BUILDER — template embedded
// ============================================================
function getCoinSiteTemplate(){
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>{{COIN_NAME}} ({{COIN_TICKER}}) — Official Website</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
:root{--bg:#040810;--dark:#0a0f1e;--card:#0d1428;--accent:#708090;--accent-glow:rgba(112,128,144,0.15);--white:#ffffff;--silver:#b8c4d4;--muted:#5a6880;--green:#0faf6d;--border:rgba(112,128,144,0.12);--border-bright:rgba(112,128,144,0.25);}
html{scroll-behavior:smooth;}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--white);min-height:100vh;overflow-x:hidden;}
body::before{content:'';position:fixed;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse 80% 50% at 20% 20%,rgba(112,128,144,0.06) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 80% 80%,rgba(15,175,109,0.04) 0%,transparent 60%);pointer-events:none;z-index:0;}
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:1.2rem 3rem;background:rgba(4,8,16,0.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);}
.nav-brand{display:flex;align-items:center;gap:.8rem;}
.nav-coin-icon{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),rgba(112,128,144,0.3));display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700;color:var(--white);font-family:'DM Mono',monospace;border:1px solid var(--border-bright);}
.nav-name{font-family:Georgia,serif;font-size:1.1rem;color:var(--white);}
.nav-name em{font-style:italic;color:var(--accent);}
.nav-ticker{font-family:'DM Mono',monospace;font-size:.7rem;color:var(--muted);padding:.15rem .5rem;border:1px solid var(--border);border-radius:4px;margin-left:.3rem;}
.nav-links{display:flex;align-items:center;gap:2rem;}
.nav-links a{font-size:.85rem;color:var(--silver);text-decoration:none;transition:color .2s;}
.nav-links a:hover{color:var(--white);}
.nav-btn{padding:.5rem 1.2rem;background:var(--accent);color:var(--white);border-radius:6px;font-size:.82rem;font-weight:600;text-decoration:none;transition:background .2s;}
.nav-btn:hover{background:rgba(112,128,144,.8);color:var(--white);}
.hero{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8rem 2rem 5rem;}
.hero-eyebrow{font-family:'DM Mono',monospace;font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:1.5rem;padding:.4rem 1rem;border:1px solid var(--border-bright);border-radius:20px;display:inline-block;background:rgba(112,128,144,0.06);}
.hero-coin{width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,rgba(112,128,144,0.3),rgba(112,128,144,0.05));border:1px solid var(--border-bright);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:1.8rem;font-weight:700;color:var(--white);margin:0 auto 2rem;box-shadow:0 0 60px rgba(112,128,144,0.15);animation:float 4s ease-in-out infinite;}
@keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-12px);}}
.hero h1{font-family:Georgia,serif;font-size:clamp(3rem,7vw,6rem);font-weight:700;line-height:1.0;color:var(--white);margin-bottom:1rem;letter-spacing:-.02em;}
.hero h1 em{font-style:italic;color:var(--accent);}
.hero-ticker{font-family:'DM Mono',monospace;font-size:1rem;color:var(--muted);margin-bottom:1.5rem;letter-spacing:.08em;}
.hero-tagline{font-size:clamp(1rem,2.5vw,1.3rem);color:var(--silver);font-weight:300;max-width:680px;margin:0 auto 1.5rem;line-height:1.75;}
.hero-mission{font-size:.95rem;color:var(--muted);max-width:620px;margin:0 auto 3rem;line-height:1.8;font-style:italic;}
.hero-btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;}
.btn-primary{padding:.9rem 2rem;background:var(--white);color:var(--bg);border-radius:8px;font-weight:700;font-size:.95rem;text-decoration:none;transition:all .2s;}
.btn-primary:hover{background:var(--silver);}
.btn-outline-hero{padding:.9rem 2rem;background:transparent;color:var(--white);border:1px solid var(--border-bright);border-radius:8px;font-weight:500;font-size:.95rem;text-decoration:none;transition:all .2s;}
.btn-outline-hero:hover{border-color:var(--accent);background:var(--accent-glow);}
.stats-bar{position:relative;z-index:1;background:var(--card);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:1.5rem 3rem;}
.stats-inner{max-width:900px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;text-align:center;}
.stat-label{font-family:'DM Mono',monospace;font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem;}
.stat-value{font-size:1.1rem;font-weight:700;color:var(--white);}
section{position:relative;z-index:1;padding:6rem 2rem;}
.section-inner{max-width:960px;margin:0 auto;}
.section-eyebrow{font-family:'DM Mono',monospace;font-size:.68rem;letter-spacing:.15em;text-transform:uppercase;color:var(--accent);margin-bottom:1rem;}
.section-title{font-family:Georgia,serif;font-size:clamp(1.8rem,4vw,3rem);font-weight:700;color:var(--white);margin-bottom:1.2rem;line-height:1.1;}
.section-title em{font-style:italic;color:var(--accent);}
.section-body{font-size:1rem;color:var(--silver);line-height:1.85;max-width:680px;}
.about{background:var(--dark);}
.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center;}
@media(max-width:720px){.about-grid{grid-template-columns:1fr;}}
.about-text p{font-size:.95rem;color:var(--silver);line-height:1.9;margin-bottom:1rem;}
.about-stats{display:flex;flex-direction:column;gap:1rem;}
.about-stat{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:1.2rem 1.5rem;}
.about-stat-label{font-family:'DM Mono',monospace;font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem;}
.about-stat-value{font-size:1rem;font-weight:600;color:var(--white);word-break:break-all;}
.mission{text-align:center;}
.mission-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.5rem;margin-top:3rem;}
.mission-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:2rem 1.5rem;transition:border-color .3s,transform .3s;}
.mission-card:hover{border-color:var(--border-bright);transform:translateY(-4px);}
.mission-icon{font-size:2rem;margin-bottom:1rem;}
.mission-card-title{font-family:Georgia,serif;font-size:1.1rem;font-weight:700;color:var(--white);margin-bottom:.6rem;}
.mission-card-title em{font-style:italic;color:var(--accent);}
.mission-card-desc{font-size:.85rem;color:var(--muted);line-height:1.7;}
.tokenomics{background:var(--dark);}
.token-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-top:2.5rem;}
.token-card{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:1.4rem;transition:border-color .3s;}
.token-card:hover{border-color:var(--border-bright);}
.token-label{font-family:'DM Mono',monospace;font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem;}
.token-value{font-size:1rem;font-weight:700;color:var(--white);word-break:break-all;}
.contract-box{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:1.2rem 1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-top:2rem;flex-wrap:wrap;}
.contract-label{font-family:'DM Mono',monospace;font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem;}
.contract-address{font-family:'DM Mono',monospace;font-size:.82rem;color:var(--silver);word-break:break-all;}
.copy-btn{padding:.5rem 1rem;background:transparent;border:1px solid var(--border-bright);border-radius:6px;color:var(--accent);font-family:'DM Mono',monospace;font-size:.72rem;cursor:pointer;transition:all .2s;white-space:nowrap;}
.copy-btn:hover{background:var(--accent-glow);color:var(--white);}
.community{text-align:center;}
.social-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-top:2.5rem;max-width:700px;margin-left:auto;margin-right:auto;}
.social-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:1.3rem;text-decoration:none;color:var(--white);transition:border-color .25s,transform .25s;display:block;}
.social-card:hover{border-color:var(--border-bright);transform:translateY(-3px);}
.social-icon{font-size:1.5rem;margin-bottom:.5rem;}
.social-name{font-size:.9rem;font-weight:600;margin-bottom:.2rem;}
.social-handle{font-family:'DM Mono',monospace;font-size:.72rem;color:var(--muted);}
footer{position:relative;z-index:1;background:var(--dark);border-top:1px solid var(--border);padding:3rem 2rem 2rem;text-align:center;}
.footer-brand{font-family:Georgia,serif;font-size:1.5rem;color:var(--white);margin-bottom:.5rem;}
.footer-brand em{font-style:italic;color:var(--accent);}
.footer-tagline{font-size:.85rem;color:var(--muted);margin-bottom:1.5rem;}
.footer-links{display:flex;justify-content:center;flex-wrap:wrap;gap:1.5rem;margin-bottom:1.5rem;}
.footer-links a{font-size:.82rem;color:var(--muted);text-decoration:none;}
.footer-copy{font-size:.75rem;color:var(--muted);border-top:1px solid var(--border);padding-top:1.2rem;margin-top:1rem;line-height:1.7;}
.disclaimer-bar{background:rgba(112,128,144,0.06);border-top:1px solid var(--border);padding:.8rem 2rem;text-align:center;font-size:.72rem;color:var(--muted);line-height:1.6;}
@media(max-width:768px){nav{padding:1rem 1.5rem;}.nav-links{display:none;}.hero{padding:7rem 1.5rem 4rem;}section{padding:4rem 1.5rem;}.stats-bar{padding:1.5rem;}}
</style>
</head>
<body>
<nav>
  <div class="nav-brand">
    <div class="nav-coin-icon">{{TICKER_SHORT}}</div>
    <span class="nav-name">{{COIN_NAME}} <em>{{COIN_TICKER}}</em></span>
  </div>
  <div class="nav-links">
    <a href="#about">About</a><a href="#mission">Mission</a>
    <a href="#tokenomics">Tokenomics</a><a href="#community">Community</a>
  </div>
  <a href="#community" class="nav-btn">Join Community</a>
</nav>
<div class="hero">
  <div class="hero-eyebrow">Official — {{BLOCKCHAIN}} Network</div>
  <div class="hero-coin">{{TICKER_SHORT}}</div>
  <h1>{{COIN_NAME}}<br/><em>{{COIN_TICKER}}</em></h1>
  <div class="hero-ticker">{{BLOCKCHAIN}} · {{TOTAL_SUPPLY}} Total Supply</div>
  <p class="hero-tagline">{{COIN_TAGLINE}}</p>
  <p class="hero-mission">{{COIN_MISSION}}</p>
  <div class="hero-btns">
    <a href="#tokenomics" class="btn-primary">View Tokenomics</a>
    <a href="#community" class="btn-outline-hero">Join the Community</a>
  </div>
</div>
<div class="stats-bar">
  <div class="stats-inner">
    <div><div class="stat-label">Token Name</div><div class="stat-value">{{COIN_NAME}}</div></div>
    <div><div class="stat-label">Ticker</div><div class="stat-value">{{COIN_TICKER}}</div></div>
    <div><div class="stat-label">Total Supply</div><div class="stat-value">{{TOTAL_SUPPLY}}</div></div>
    <div><div class="stat-label">Blockchain</div><div class="stat-value">{{BLOCKCHAIN}}</div></div>
    <div><div class="stat-label">Launch Date</div><div class="stat-value">{{LAUNCH_DATE}}</div></div>
  </div>
</div>
<section class="about" id="about">
  <div class="section-inner">
    <div class="about-grid">
      <div class="about-text">
        <div class="section-eyebrow">About the Project</div>
        <h2 class="section-title">What is <em>{{COIN_NAME}}</em>?</h2>
        <p>{{COIN_ABOUT}}</p>
        <p>{{COIN_ABOUT_2}}</p>
      </div>
      <div class="about-stats">
        <div class="about-stat"><div class="about-stat-label">Founder</div><div class="about-stat-value">{{FULL_NAME}}</div></div>
        <div class="about-stat"><div class="about-stat-label">Blockchain Network</div><div class="about-stat-value">{{BLOCKCHAIN}}</div></div>
        <div class="about-stat"><div class="about-stat-label">Launch Date</div><div class="about-stat-value">{{LAUNCH_DATE}}</div></div>
      </div>
    </div>
  </div>
</section>
<section class="mission" id="mission">
  <div class="section-inner">
    <div class="section-eyebrow">Our Purpose</div>
    <h2 class="section-title">Built With <em>a Mission</em></h2>
    <p class="section-body" style="margin:0 auto 3rem;">{{COIN_MISSION}}</p>
    <div class="mission-cards">
      <div class="mission-card"><div class="mission-icon">🌍</div><div class="mission-card-title"><em>Community</em> First</div><div class="mission-card-desc">{{COIN_NAME}} is built by the community, for the community. Every holder is a stakeholder in our shared mission.</div></div>
      <div class="mission-card"><div class="mission-icon">🔒</div><div class="mission-card-title"><em>Transparent</em> by Design</div><div class="mission-card-desc">Every transaction is publicly recorded on the {{BLOCKCHAIN}} blockchain for anyone to verify.</div></div>
      <div class="mission-card"><div class="mission-icon">🚀</div><div class="mission-card-title">Built for <em>the Long Game</em></div><div class="mission-card-desc">{{COIN_NAME}} is a branded crypto currency with a roadmap, a mission, and a community that believes in what we are building.</div></div>
    </div>
  </div>
</section>
<section class="tokenomics" id="tokenomics">
  <div class="section-inner">
    <div class="section-eyebrow">Token Details</div>
    <h2 class="section-title"><em>Tokenomics</em></h2>
    <div class="token-grid">
      <div class="token-card"><div class="token-label">Token Name</div><div class="token-value">{{COIN_NAME}}</div></div>
      <div class="token-card"><div class="token-label">Ticker Symbol</div><div class="token-value">{{COIN_TICKER}}</div></div>
      <div class="token-card"><div class="token-label">Total Supply</div><div class="token-value">{{TOTAL_SUPPLY}}</div></div>
      <div class="token-card"><div class="token-label">Blockchain</div><div class="token-value">{{BLOCKCHAIN}}</div></div>
      <div class="token-card"><div class="token-label">Launch Date</div><div class="token-value">{{LAUNCH_DATE}}</div></div>
      <div class="token-card"><div class="token-label">Founder</div><div class="token-value">{{FULL_NAME}}</div></div>
    </div>
    <div class="contract-box" id="contractBox" style="display:none;">
      <div><div class="contract-label">Wallet / Contract Address</div><div class="contract-address">{{WALLET_ADDRESS}}</div></div>
      <button class="copy-btn" onclick="copyContract()">Copy Address</button>
    </div>
  </div>
</section>
<section class="community" id="community">
  <div class="section-inner">
    <div class="section-eyebrow">Join Us</div>
    <h2 class="section-title">Be Part of the <em>{{COIN_NAME}}</em> Community</h2>
    <div class="social-grid">
      <a href="{{TWITTER_URL}}" target="_blank" class="social-card" id="twitterCard"><div class="social-icon">🐦</div><div class="social-name">Twitter / X</div><div class="social-handle">{{TWITTER_HANDLE}}</div></a>
      <a href="{{TELEGRAM_LINK}}" target="_blank" class="social-card" id="telegramCard"><div class="social-icon">✈️</div><div class="social-name">Telegram</div><div class="social-handle">Join our group</div></a>
      <a href="{{DISCORD_LINK}}" target="_blank" class="social-card" id="discordCard"><div class="social-icon">💬</div><div class="social-name">Discord</div><div class="social-handle">Join our server</div></a>
      <a href="{{WEBSITE_URL}}" target="_blank" class="social-card" id="websiteCard"><div class="social-icon">🌐</div><div class="social-name">Website</div><div class="social-handle">{{WEBSITE_URL}}</div></a>
    </div>
  </div>
</section>
<footer>
  <div class="footer-brand">{{COIN_NAME}} <em>{{COIN_TICKER}}</em></div>
  <div class="footer-tagline">{{COIN_TAGLINE}}</div>
  <div class="footer-links"><a href="#about">About</a><a href="#mission">Mission</a><a href="#tokenomics">Tokenomics</a><a href="#community">Community</a></div>
  <div class="footer-copy">© <span id="yr"></span> {{COIN_NAME}} ({{COIN_TICKER}}). All rights reserved. Built on {{BLOCKCHAIN}}. Founded by {{FULL_NAME}}.<br/><em>This website is for informational purposes only and does not constitute financial or investment advice. Always do your own research.</em></div>
</footer>
<div class="disclaimer-bar">⚠️ Not financial advice. Cryptocurrency involves substantial risk of loss. Never invest more than you can afford to lose.</div>
<script>
document.getElementById('yr').textContent=new Date().getFullYear();
var wa=document.querySelector('.contract-address');
if(wa&&wa.textContent.trim()&&wa.textContent!=='{{WALLET_ADDRESS}}'){document.getElementById('contractBox').style.display='flex';}
['twitterCard','telegramCard','discordCard','websiteCard'].forEach(function(id){
  var el=document.getElementById(id);
  if(el){var h=el.getAttribute('href');if(!h||h==='#'||h==='{{TWITTER_URL}}'||h==='{{TELEGRAM_LINK}}'||h==='{{DISCORD_LINK}}'||h==='{{WEBSITE_URL}}'){el.style.display='none';}}
});
function copyContract(){var a=document.querySelector('.contract-address').textContent;navigator.clipboard.writeText(a).then(function(){var b=document.querySelector('.copy-btn');b.textContent='✓ Copied!';setTimeout(function(){b.textContent='Copy Address';},2000);});}

</body>
</html>`;
}

function buildSiteHTML(){
  var p = PROFILE;
  var f = function(k,fb){ return (p[k]&&p[k].toString().trim()) ? p[k] : (fb||''); };
  var coinName  = f('coin_name','My Coin');
  var ticker    = f('coin_ticker','COIN');
  var tagline   = f('coin_tagline','A branded crypto currency on Solana.');
  var supply    = f('coin_supply','1,000,000,000');
  var blockchain= f('blockchain','Solana');
  var launch    = f('launch_date','Coming Soon');
  var wallet    = f('wallet_address','');
  var fullName  = f('full_name','');
  var website   = f('website_url','');
  var twitter   = f('twitter_handle','');
  var telegram  = f('telegram_link','');
  var discord   = f('discord_link','');
  var tickerShort = ticker.substring(0,4);
  var twitterUrl = twitter ? ('https://x.com/'+twitter.replace('@','')) : '#';

  var mission = expandedMission || document.getElementById('coinDescription').value.trim() || tagline;
  var about1  = expandedAbout   || mission;
  var about2  = expandedAbout2  || (coinName+' (' +ticker+') was built on '+blockchain+' with a growing community of holders who believe in what we are building together.');

  var html = getCoinSiteTemplate()
    .replace(/{{COIN_NAME}}/g,coinName)
    .replace(/{{COIN_TICKER}}/g,ticker)
    .replace(/{{TICKER_SHORT}}/g,tickerShort)
    .replace(/{{COIN_TAGLINE}}/g,tagline)
    .replace(/{{COIN_MISSION}}/g,mission)
    .replace(/{{COIN_ABOUT}}/g,about1)
    .replace(/{{COIN_ABOUT_2}}/g,about2)
    .replace(/{{TOTAL_SUPPLY}}/g,supply)
    .replace(/{{BLOCKCHAIN}}/g,blockchain)
    .replace(/{{LAUNCH_DATE}}/g,launch)
    .replace(/{{WALLET_ADDRESS}}/g,wallet)
    .replace(/{{FULL_NAME}}/g,fullName)
    .replace(/{{WEBSITE_URL}}/g,website||'#')
    .replace(/{{TWITTER_URL}}/g,twitterUrl)
    .replace(/{{TWITTER_HANDLE}}/g,twitter||'')
    .replace(/{{TELEGRAM_LINK}}/g,telegram||'#')
    .replace(/{{DISCORD_LINK}}/g,discord||'#');
  return html;
}

function previewSite(){
  var html = buildSiteHTML();
  var blob = new Blob([html],{type:'text/html'});
  window.open(URL.createObjectURL(blob),'_blank');
}

async function downloadSite(){
  var btn = document.getElementById('downloadSiteBtn');
  btn.disabled = true; btn.textContent = 'Building zip...';
  try{
    var html     = buildSiteHTML();
    var coinName = (PROFILE.coin_name||'MyCoin').replace(/\s+/g,'-');
    var ticker   = (PROFILE.coin_ticker||'COIN').toUpperCase();
    var readme   = coinName+' ('+ticker+') — Official Coin Website\n'+'='.repeat(50)+'\n\nHOW TO DEPLOY ON NETLIFY (FREE)\n1. Go to netlify.com and create a free account\n2. Click "Add new site" then "Deploy manually"\n3. Drag and drop this entire folder into Netlify\n4. Your site is live instantly\n\nBuilt with MintedLegacy\n';
    var zip = new JSZip();
    var folder = zip.folder(coinName+'-website');
    folder.file('index.html',html);
    folder.file('README.txt',readme);
    var blob = await zip.generateAsync({type:'blob'});
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url; a.download = coinName+'-website.zip'; a.click();
    URL.revokeObjectURL(url);
    btn.textContent = '✓ Downloaded!';
    setTimeout(function(){btn.textContent='⬇ Download My Coin Site';btn.disabled=false;},3000);
  } catch(e){
    btn.textContent='⬇ Download My Coin Site'; btn.disabled=false;
    showStatus('Download failed: '+e.message,'error');
  }
}

async function expandDescription(){
  var desc = document.getElementById('coinDescription').value.trim();
  if(!desc){ alert('Please enter a description first.'); return; }
  var btn    = document.getElementById('aiBtn');
  var result = document.getElementById('aiResult');
  btn.disabled = true; btn.textContent = 'Expanding...';
  result.classList.add('show');
  result.innerHTML = '<em style="color:var(--accent);">Generating your coin story...</em>';

  var coinName  = PROFILE.coin_name   || 'this coin';
  var ticker    = PROFILE.coin_ticker  || '';
  var blockchain= PROFILE.blockchain   || 'Solana';
  var tagline   = PROFILE.coin_tagline || '';

  expandedMission = tagline || coinName + ' — ' + desc.substring(0,80);
  expandedAbout   = coinName+(ticker?' ('+ticker+')':'')+' was created with a clear purpose: '+desc+' Built on the '+blockchain+' blockchain, '+coinName+' combines the power of decentralized technology with a mission that resonates with a growing global community.';
  expandedAbout2  = 'The vision behind '+coinName+' goes beyond the token itself. This is about building something lasting — a community of believers who share a common purpose. '+coinName+' holders are not just investors; they are participants in a movement. Join us.';

  result.innerHTML =
    '<strong style="color:var(--white);display:block;margin-bottom:.8rem;">✓ Your Coin Story</strong>'+
    '<div style="margin-bottom:.6rem;"><span style="font-size:.7rem;color:var(--accent);text-transform:uppercase;display:block;margin-bottom:.2rem;">Mission</span>'+expandedMission+'</div>'+
    '<div style="margin-bottom:.6rem;"><span style="font-size:.7rem;color:var(--accent);text-transform:uppercase;display:block;margin-bottom:.2rem;">About</span>'+expandedAbout+'</div>'+
    '<div><span style="font-size:.7rem;color:var(--accent);text-transform:uppercase;display:block;margin-bottom:.2rem;">Vision</span>'+expandedAbout2+'</div>';

  document.getElementById('downloadSiteBtn').classList.add('show');
  btn.disabled = false; btn.textContent = '✨ Expand with AI';
}

function showStatus(msg, type){
  var el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.className = 'status-msg '+type;
  setTimeout(function(){ el.className='status-msg'; },5000);
}

function logout(){
  localStorage.removeItem('ml_token');
  localStorage.removeItem('ml_refresh');
  localStorage.removeItem('ml_user');
  window.location.href = 'login.html';
}

