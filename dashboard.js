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

