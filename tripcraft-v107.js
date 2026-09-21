/* TripCraft V107 - persistent authenticated navigation and reliable trip editing. */
(() => {
  'use strict';

  const VERSION='V107';
  const IDLE_MS=30*60*1000;
  const SESSION_TIMEOUT_MS=3500;
  const LAST_ACTIVITY='tc_v107_last_activity';
  const WINDOW_MARKER='tc_v107_session_window';
  const LEGACY_WINDOW_MARKERS=['tc_v106_session_window','tc_v105_session_window','tc_v104_session_window','tc_v103_session_window'];
  const CUSTOMER='tc_v433_customer';
  const PUBLIC=new Set(['home','how','pricing','legal','login']);
  let client=null;
  let activeUser=null;
  let activityWriteAt=0;
  let logoutRunning=false;

  const $=id=>document.getElementById(id);
  const now=()=>Date.now();
  const storedCustomer=()=>{try{return JSON.parse(localStorage.getItem(CUSTOMER)||'null')}catch(_){return null}};
  const pageFromHash=hash=>{const raw=String(hash||'#home').replace(/^#/,'');return raw.startsWith('trip/')?'trip':(raw.split('?')[0]||'home')};
  const withTimeout=(promise,ms=SESSION_TIMEOUT_MS)=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('timeout')),ms);
    Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)});
  });
  const hasWindowSession=()=>sessionStorage.getItem(WINDOW_MARKER)==='active'||LEGACY_WINDOW_MARKERS.some(key=>sessionStorage.getItem(key)==='active');
  const sessionIsFresh=()=>{const last=Number(localStorage.getItem(LAST_ACTIVITY)||0);return !last||now()-last<IDLE_MS};
  const hasUsableLocalSession=()=>!!(activeUser||(hasWindowSession()&&storedCustomer()&&sessionIsFresh()));
  const getClient=()=>{
    if(client)return client;
    client=window.TripCraftV102?.supabase?.()||null;
    return client;
  };

  function displayName(user){
    const meta=user?.user_metadata||{},profile=meta.tripcraft_profile||{},local=storedCustomer()||{};
    return [profile.firstName||meta.first_name||local.firstName,profile.lastName||meta.last_name||local.lastName].filter(Boolean).join(' ').trim()||user?.email||local.email||'';
  }

  function renderGreeting(user=activeUser){
    const text=displayName(user);
    const desktop=$('tcUserGreeting'),mobile=$('tcMobileUser');
    document.body.classList.toggle('tc-logged-in',!!text);
    if(desktop){if(desktop.textContent!==text)desktop.textContent=text;desktop.setAttribute('role',text?'button':'status');desktop.tabIndex=text?0:-1;desktop.title=text?'לחצו לפתיחת אפשרויות החשבון':''}
    if(mobile){if(mobile.textContent!==text)mobile.textContent=text;mobile.setAttribute('role',text?'button':'status');mobile.tabIndex=text?0:-1}
    if(!text)$('tcV107UserMenu')?.remove();
  }

  function clearSessionMarkers(){
    sessionStorage.removeItem(WINDOW_MARKER);
    LEGACY_WINDOW_MARKERS.forEach(key=>sessionStorage.removeItem(key));
  }

  function adoptAuthenticatedUser(user,refreshActivity=true){
    if(!user)return;
    activeUser=user;
    sessionStorage.setItem(WINDOW_MARKER,'active');
    if(refreshActivity||!Number(localStorage.getItem(LAST_ACTIVITY)||0))localStorage.setItem(LAST_ACTIVITY,String(now()));
    window.tcV101AdoptSessionUser?.(user);
    renderGreeting(user);
    const otp=$('tcOtpStep');
    if(pageFromHash(location.hash)==='login'&&(!otp||otp.hidden))setTimeout(()=>routeNow('#account'),0);
  }

  window.tcV107AdoptAuthenticatedUser=adoptAuthenticatedUser;

  async function logoutNow(){
    try{await withTimeout(getClient()?.auth.signOut()||Promise.resolve(),5000)}catch(_){ }
    activeUser=null;localStorage.removeItem(CUSTOMER);localStorage.removeItem(LAST_ACTIVITY);clearSessionMarkers();$('tcV107UserMenu')?.remove();renderGreeting(null);routeNow('#home');
  }

  function toggleUserMenu(anchor){
    if(!hasUsableLocalSession())return;
    const old=$('tcV107UserMenu');if(old){old.remove();return}
    const menu=document.createElement('div');menu.id='tcV107UserMenu';menu.className='tc-v107-user-menu';menu.innerHTML='<strong>החשבון שלי</strong><button type="button" id="tcV107Logout">התנתק</button>';
    document.body.appendChild(menu);
    const rect=anchor.getBoundingClientRect(),width=190,left=Math.min(window.innerWidth-width-12,Math.max(12,rect.left));
    menu.style.left=left+'px';menu.style.top=Math.min(window.innerHeight-100,rect.bottom+8)+'px';
    $('tcV107Logout').onclick=logoutNow;
  }

  function normalizeDateText(root=document.body){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let node;
    while((node=walker.nextNode())){
      const parent=node.parentElement;
      if(!parent||parent.closest('script,style,textarea,option,[contenteditable="true"]'))continue;
      if(/\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[./]\d{1,2}[./]\d{4}\b/.test(node.nodeValue||''))nodes.push(node);
    }
    nodes.forEach(text=>{
      text.nodeValue=text.nodeValue
        .replace(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g,(_,y,m,d)=>`${d.padStart(2,'0')}-${m.padStart(2,'0')}-${y}`)
        .replace(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g,(_,d,m,y)=>`${d.padStart(2,'0')}-${m.padStart(2,'0')}-${y}`);
    });
  }

  function installLogo(){
    document.querySelectorAll('.tc-brand-logo,img[src*="tripcraft-logo.png"]').forEach(img=>{
      img.src='icons/tripcraft-header-logo.png';
      img.removeAttribute('srcset');
      img.style.display='block';
      img.style.visibility='visible';
      img.style.opacity='1';
      const link=img.closest('a');
      if(link){link.href='#home';link.dataset.tcHomeLogo='1'}
    });
  }

  function placeGreeting(){
    const greeting=$('tcUserGreeting'),login=document.querySelector?.('#tcDesktopNav a[href="#login"]'),header=document.querySelector?.('.tc-header'),lang=header?.querySelector?.('.lang-switch');
    if(!greeting)return;
    const desktop=window.matchMedia?window.matchMedia('(min-width:981px)').matches:(window.innerWidth||1200)>980;
    if(desktop&&login){
      login.insertAdjacentElement('afterend',greeting);
    }else if(header){
      if(lang)header.insertBefore(greeting,lang);else header.appendChild(greeting);
    }
  }

  function closeMobileMenu(){
    const toggle=$('tcNavToggle');if(toggle)toggle.checked=false;
    $('tcMobileMenu')?.setAttribute('aria-hidden','true');
  }

  async function validSession(){
    const sb=getClient();if(!sb)return null;
    try{const result=await withTimeout(sb.auth.getSession());return result?.data?.session||null}catch(_){return null}
  }

  function routeNow(href){
    const target=String(href||'#home'),page=pageFromHash(target),app=$('mainApp');
    if(location.hash!==target)location.hash=target;
    if(app){app.classList.add('page-focus');app.dataset.page=page==='trip'?'account':page}
    window.tcRouteRefresh?.(page);
    if(page==='account')setTimeout(()=>window.tcRenderAccount?.(),0);
    window.scrollTo({top:0,behavior:'auto'});
  }

  function goToLogin(returnTo){
    sessionStorage.setItem('tc_v91_return_after_auth',returnTo||'#account');
    routeNow('#login');
  }

  async function logoutForIdle(){
    if(logoutRunning)return;logoutRunning=true;
    try{await withTimeout(getClient()?.auth.signOut()||Promise.resolve(),5000)}catch(_){ }
    activeUser=null;localStorage.removeItem(CUSTOMER);localStorage.removeItem(LAST_ACTIVITY);clearSessionMarkers();renderGreeting(null);
    sessionStorage.setItem('tc_v91_return_after_auth','#account');location.hash='#login';
    alert('החיבור נסגר לאחר 30 דקות ללא פעילות. יש להיכנס מחדש.');
    logoutRunning=false;
  }

  async function checkIdle(){
    if(!activeUser)return;
    const last=Number(localStorage.getItem(LAST_ACTIVITY)||0);
    if(last&&now()-last>=IDLE_MS)await logoutForIdle();
  }

  function recordActivity(){
    if(!activeUser)return;
    const t=now();if(t-activityWriteAt<5000)return;
    activityWriteAt=t;localStorage.setItem(LAST_ACTIVITY,String(t));
  }

  async function restoreSession(){
    const sb=getClient();
    sb?.auth.onAuthStateChange((event,next)=>{
      if(next?.user){adoptAuthenticatedUser(next.user,false);return}
      /* Only an explicit sign-out clears a live browser-window session. */
      if(event==='SIGNED_OUT'){
        activeUser=null;clearSessionMarkers();localStorage.removeItem(LAST_ACTIVITY);localStorage.removeItem(CUSTOMER);renderGreeting(null);
      }
    });
    const session=await validSession();
    if(!session?.user){
      const cached=storedCustomer();
      if(cached&&hasWindowSession()&&sessionIsFresh()){
        activeUser={email:cached.email||'',user_metadata:{first_name:cached.firstName||'',last_name:cached.lastName||'',tripcraft_profile:cached}};
        adoptAuthenticatedUser(activeUser,false);return;
      }
      activeUser=null;renderGreeting(null);return;
    }
    const last=Number(localStorage.getItem(LAST_ACTIVITY)||0);
    if(last&&now()-last>=IDLE_MS){activeUser=session.user;await logoutForIdle();return}
    adoptAuthenticatedUser(session.user,false);
  }

  function startCleanTrip(){
    localStorage.removeItem('tripcraft_planner_draft_v57');
    window.TripCraftV102?.resetNewTrip?.();
    ['plTripName','plCountries','plCountryOther','plCountrySearch','plDestination','plArrivalAirport','plDepartureAirport','plStart','plEnd'].forEach(id=>{
      const el=$(id);if(el)el.value='';
    });
    document.querySelectorAll('#countryChoices input').forEach(input=>input.checked=false);
    if(window.planner){window.planner.draft=null;window.planner.currentTripId=null;window.planner.step=1}
    window.syncTravelerBands?.();window.plannerShowStep?.(1);
    routeNow('#planner');
    setTimeout(()=>$('plTripName')?.focus(),100);
  }

  function isNewTripLink(link){
    const label=(link.textContent||'').trim();
    return link.classList.contains('planner-color')||/בנה טיול חדש|בנו טיול חדש|Build a New Trip/i.test(label);
  }

  function handleInternalLink(event,link){
    const href=link.dataset.tcHomeLogo==='1'?'#home':link.getAttribute('href');
    if(!href?.startsWith('#'))return;
    event.preventDefault();event.stopImmediatePropagation();closeMobileMenu();
    const page=pageFromHash(href);
    if(page==='login'){
      if(hasUsableLocalSession()){recordActivity();renderGreeting();routeNow('#account');return}
      routeNow('#login');return;
    }
    if(!PUBLIC.has(page)&&!hasUsableLocalSession()){
      goToLogin(href);return;
    }
    if(!PUBLIC.has(page)){sessionStorage.setItem(WINDOW_MARKER,'active');recordActivity();renderGreeting()}
    if(page==='planner'&&isNewTripLink(link)){
      startCleanTrip();return;
    }
    routeNow(href);
  }

  async function handleBuild(event,button){
    event.preventDefault();event.stopImmediatePropagation();
    if(button.dataset.v105Busy==='1')return;
    if(!hasUsableLocalSession()){goToLogin('#planner');return}
    button.dataset.v105Busy='1';button.disabled=true;
    const oldLabel=button.textContent;button.textContent='בודק ובונה טיול...';
    try{
      const session=await validSession();
      if(!session?.user)throw new Error('לא ניתן לאמת כרגע את החיבור לשרת. הטופס נשמר; בדקו חיבור ונסו שוב.')
      adoptAuthenticatedUser(session.user);recordActivity();
      const p=window.plannerData?.();
      if(!p?.tripName||!p?.destination||!p?.start||!p?.end)throw new Error('חסרים שם טיול, יעד או תאריכים. חזרו לשלבים הקודמים והשלימו אותם.');
      const api=window.TripCraftV102;
      if(!api?.generateDraft||!api?.saveDraft)throw new Error('מנוע בניית הטיול לא נטען. יש לרענן את הדף.');
      if(typeof window.runTripBuildProgress==='function')await window.runTripBuildProgress();
      const editingId=window.planner?.currentTripId||window.planner?.draft?.tripId||null;
      const draft=api.generateDraft(p);
      if(editingId)draft.tripId=editingId;
      window.planner.draft=draft;window.planner.currentTripId=editingId;window.renderPlannerDraft?.();
      await withTimeout(Promise.resolve(api.saveDraft()),20000);
    }catch(error){
      console.error('TripCraft V107 build failed',error);
      const message=error?.message==='timeout'?'בדיקת החיבור ארכה יותר מדי. ודאו שיש אינטרנט ונסו שוב.':(error?.message||'שגיאה לא ידועה');
      alert('בניית הטיול נכשלה: '+message);
    }finally{button.dataset.v105Busy='0';button.disabled=false;button.textContent=oldLabel}
  }

  function delegatedActions(event){
    const build=event.target.closest?.('#plannerBuild');
    if(build){handleBuild(event,build);return}
    const commerce=event.target.closest?.('#pricing button[onclick*="tcAdd"],.cart-add');
    if(commerce&&!hasUsableLocalSession()){
      event.preventDefault();event.stopImmediatePropagation();goToLogin('#pricing');return;
    }
    const logo=event.target.closest?.('[data-tc-home-logo="1"]');
    if(logo){event.preventDefault();event.stopImmediatePropagation();closeMobileMenu();routeNow('#home');return}
    const internalLink=event.target.closest?.('a[href^="#"]');
    if(internalLink){handleInternalLink(event,internalLink);return}
    const open=event.target.closest?.('[data-v102-open]');
    if(open){
      event.preventDefault();event.stopImmediatePropagation();recordActivity();
      Promise.resolve(window.TripCraftV102?.openTrip?.(open.dataset.v102Open))
        .then(opened=>{if(opened!==false)routeNow('#planner')})
        .catch(error=>alert('לא ניתן לפתוח את הטיול: '+(error?.message||'שגיאה לא ידועה')));
      return;
    }
    const fresh=event.target.closest?.('#tcV102NewTrip,#tcV99NewTrip');
    if(fresh){event.preventDefault();event.stopImmediatePropagation();recordActivity();startCleanTrip();return}
    const copy=event.target.closest?.('[data-v102-copy]');
    if(copy){
      event.preventDefault();event.stopImmediatePropagation();recordActivity();
      const url=window.TripCraftV102?.tripUrl?.(copy.dataset.v102Copy)||'';
      Promise.resolve(navigator.clipboard?.writeText(url)).catch(()=>{});copy.textContent='הקישור הועתק ✓';return;
    }
  }

  function install(){
    if(!hasWindowSession())document.body.classList.remove('tc-logged-in');
    const style=document.createElement('style');style.id='tc-v107-styles';style.textContent=`
      :root{--img-hero:url('assets/hero.jpg')!important;--img-vietnam:url('assets/vietnam.jpg')!important;--img-greece:url('assets/greece.jpg')!important;--img-dolomites:url('assets/dolomites.jpg')!important;--img-austria:url('assets/austria.jpg')!important;--img-usa:url('assets/hero.jpg')!important}
      .tc-brand-logo{width:84px!important;height:68px!important;min-width:84px!important;object-fit:contain!important;background:#fff!important;border:0!important;padding:0!important;color:transparent!important}
      .tc-user-greeting{color:#d62828!important;font-weight:950!important;white-space:nowrap!important;cursor:pointer!important}
      .mobile-menu-user{color:#d62828!important;font-weight:950!important;cursor:pointer!important}
      body:not(.tc-logged-in) .tc-desktop-nav a:not([href="#home"]):not([href="#how"]):not([href="#pricing"]):not([href="#login"]){display:none!important}
      body:not(.tc-logged-in) #tcMobileMenu a:not([href="#home"]):not([href="#how"]):not([href="#pricing"]):not([href="#login"]){display:none!important}
      body.tc-logged-in .tc-desktop-nav,body.tc-logged-in .tc-desktop-nav a{visibility:visible!important;opacity:1!important}
      body.tc-logged-in .tc-desktop-nav a[href="#login"],body.tc-logged-in #tcMobileMenu a[href="#login"]{display:none!important}
      body:not(.tc-logged-in) #tcUserGreeting,body:not(.tc-logged-in) #tcMobileUser{display:none!important}
      body.tc-logged-in #tcUserGreeting{display:inline-flex!important;align-items:center!important}
      body.tc-logged-in #tcMobileUser{display:block!important}
      body:not(.tc-logged-in) .tc-install{display:none!important}
      body:not(.tc-logged-in) #pricing button[onclick*="tcAdd"]{opacity:.55!important;filter:grayscale(.25)!important;cursor:not-allowed!important}
      body:not(.tc-logged-in) #pricing button[onclick*="tcAdd"]::before{content:'🔒 ';}
      .tc-v107-user-menu{position:fixed;z-index:5000;width:190px;background:#fff;border:1px solid #d7e2e9;border-radius:14px;padding:12px;box-shadow:0 12px 32px rgba(7,27,43,.22);display:grid;gap:10px;color:#173047}
      .tc-v107-user-menu button{border:0;border-radius:10px;padding:10px 12px;background:#d62828;color:#fff;font:inherit;font-weight:900;cursor:pointer}
      @media(min-width:981px){.tc-desktop-nav{display:flex!important}}
      .day-row{grid-template-columns:96px minmax(0,1fr)!important;grid-template-rows:auto auto!important;min-height:0!important;align-items:stretch!important}
      .day-row .day-no{grid-column:1!important;grid-row:1!important;min-width:96px!important;padding:12px 8px!important}
      .day-row .day-main{grid-column:2!important;grid-row:1!important;min-width:0!important;width:100%!important;overflow-wrap:anywhere!important}
      .day-row .day-action{grid-column:1/-1!important;grid-row:2!important;display:flex!important;flex-wrap:wrap!important;justify-content:center!important;align-items:center!important;gap:10px!important;padding:0 16px 16px!important}
      .day-row .day-action button{width:auto!important;min-width:220px!important;max-width:100%!important;padding:11px 22px!important}
      .day-row .day-date{white-space:nowrap!important;word-break:normal!important;direction:ltr!important;unicode-bidi:isolate!important;font-size:12px!important;letter-spacing:0!important}
      .day-row .day-route-line,.day-row h3,.day-row .lodging-chip{max-width:100%!important;overflow-wrap:anywhere!important;word-break:normal!important}
      .day-card{grid-template-columns:96px minmax(0,1fr)!important;grid-template-rows:auto auto!important;min-height:0!important;align-items:stretch!important}
      .day-card .num{grid-column:1!important;grid-row:1!important;min-width:96px!important;padding:12px 8px!important}
      .day-card .num span:last-child{white-space:nowrap!important;word-break:normal!important;direction:ltr!important;unicode-bidi:isolate!important;font-size:12px!important}
      .day-card .photo{display:none!important}
      .day-card .info{grid-column:2!important;grid-row:1!important;min-width:0!important;width:100%!important;overflow-wrap:anywhere!important}
      .day-card .info h3,.day-card .info p,.day-card .lodging-line{max-width:100%!important;overflow-wrap:anywhere!important;word-break:normal!important}
      .day-card .go{grid-column:1/-1!important;grid-row:2!important;display:flex!important;justify-content:center!important;align-items:center!important;padding:0 16px 16px!important}
      .day-card .go button{width:auto!important;min-width:220px!important;max-width:100%!important;padding:11px 22px!important}
      @media(max-width:980px){.tc-header{min-height:102px!important;padding-bottom:28px!important}.tc-user-greeting{position:absolute!important;left:50%!important;bottom:5px!important;transform:translateX(-50%)!important;max-width:82vw!important;overflow:hidden!important;text-overflow:ellipsis!important;text-align:center!important;font-size:14px!important}.tc-brand-logo{width:72px!important;height:60px!important;min-width:72px!important}}
      @media(max-width:620px){.day-row,.day-card{grid-template-columns:78px minmax(0,1fr)!important}.day-row .day-no,.day-card .num{min-width:78px!important;padding:10px 5px!important}.day-row .day-main,.day-card .info{padding:14px 12px!important}.day-row .day-action,.day-card .go{padding:0 12px 14px!important}.day-row .day-action button,.day-card .go button{min-width:0!important;width:100%!important}.day-mini-meta{display:grid!important;grid-template-columns:1fr!important}.day-mini-meta>*{width:100%!important;white-space:normal!important}}
    `;document.head.appendChild(style);
    installLogo();
    placeGreeting();
    window.addEventListener('resize',placeGreeting,{passive:true});
    window.addEventListener('click',delegatedActions,true);
    [$('tcUserGreeting'),$('tcMobileUser')].filter(Boolean).forEach(el=>{
      el.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();toggleUserMenu(el)});
      el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleUserMenu(el)}});
    });
    document.addEventListener('click',event=>{if(!event.target.closest('#tcV107UserMenu,#tcUserGreeting,#tcMobileUser'))$('tcV107UserMenu')?.remove()});
    ['pointerdown','keydown','touchstart','scroll','input','change'].forEach(type=>window.addEventListener(type,recordActivity,{passive:true}));
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkIdle()});
    window.addEventListener('pageshow',()=>{installLogo();checkIdle();renderGreeting();if(pageFromHash(location.hash)==='login'&&hasUsableLocalSession())routeNow('#account')});
    window.addEventListener('hashchange',()=>{installLogo();checkIdle();renderGreeting();if(pageFromHash(location.hash)==='login'&&hasUsableLocalSession())routeNow('#account')});
    const greetingObserver=new MutationObserver(()=>renderGreeting());
    if($('tcUserGreeting'))greetingObserver.observe($('tcUserGreeting'),{childList:true,subtree:true,characterData:true});
    if($('tcMobileUser'))greetingObserver.observe($('tcMobileUser'),{childList:true,subtree:true,characterData:true});
    normalizeDateText();
    const dateObserver=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>normalizeDateText(node.nodeType===Node.TEXT_NODE?node.parentElement:node))));
    dateObserver.observe(document.body,{childList:true,subtree:true});
    const cached=storedCustomer();
    if(cached&&hasWindowSession()&&sessionIsFresh()){
      activeUser={email:cached.email||'',user_metadata:{first_name:cached.firstName||'',last_name:cached.lastName||'',tripcraft_profile:cached}};
      sessionStorage.setItem(WINDOW_MARKER,'active');localStorage.setItem(LAST_ACTIVITY,String(now()));window.tcV101AdoptSessionUser?.(activeUser);renderGreeting();
    }
    setInterval(checkIdle,15000);
    restoreSession();
    document.documentElement.dataset.tripcraftVersion=VERSION;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();

/* V107 - itinerary-aware lodging plan, Booking affiliate routing and public demo. */
(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const norm=value=>String(value||'').trim().toLowerCase();
  const preSelections=window.tcV107PreHotelSelections||{};
  window.tcV107PreHotelSelections=preSelections;
  let saveTimer=0;

  const HOTEL_CATALOG=[
    {match:/loutraki|לוטראקי/i,name:'Club Hotel Casino Loutraki',score:8.5,stars:5,eur:190},
    {match:/loutraki|לוטראקי/i,name:'Wyndham Loutraki Poseidon Resort',score:7.9,stars:5,eur:165},
    {match:/loutraki|לוטראקי/i,name:'Pappas Hotel',score:8.4,stars:3,eur:105},
    {match:/ioannina|יואנינה|אואונינה/i,name:'The Lake Hotel',score:9.2,stars:5,eur:155},
    {match:/ioannina|יואנינה|אואונינה/i,name:'Grand Serai Congress & Spa',score:8.9,stars:5,eur:145},
    {match:/ioannina|יואנינה|אואונינה/i,name:'Saz City Life Hotel',score:9.1,stars:4,eur:115},
    {match:/volos|וולוס/i,name:'Domotel Xenia Volos',score:8.5,stars:5,eur:145},
    {match:/volos|וולוס/i,name:'Aegli Hotel Volos',score:8.9,stars:3,eur:95},
    {match:/volos|וולוס/i,name:'Magnes Hotel',score:9.4,stars:4,eur:120},
    {match:/athens|אתונה/i,name:'The Athens Gate Hotel',score:8.8,stars:4,eur:165},
    {match:/athens|אתונה/i,name:'Electra Metropolis',score:9.1,stars:5,eur:240},
    {match:/athens|אתונה/i,name:'NLH Monastiraki',score:8.7,stars:4,eur:125},
    {match:/tatransk|lomnica|טטרה|לומניצה/i,name:'Hotel International',score:9.0,stars:4,eur:145},
    {match:/tatransk|lomnica|טטרה|לומניצה/i,name:'Grand Hotel Praha',score:9.0,stars:4,eur:170},
    {match:/tatransk|lomnica|טטרה|לומניצה/i,name:'Hotel Lomnica',score:9.5,stars:5,eur:225},
    {match:/budapest|בודפשט/i,name:'La Prima Fashion Hotel',score:8.7,stars:4,eur:160},
    {match:/budapest|בודפשט/i,name:'Hotel Vision Budapest',score:9.4,stars:4,eur:190},
    {match:/budapest|בודפשט/i,name:'D8 Hotel',score:8.9,stars:3,eur:115}
  ];

  function parseIso(value){
    const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match?new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12,0,0):null;
  }
  function iso(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
  function addDays(value,count){const date=parseIso(value)||new Date();date.setDate(date.getDate()+Number(count||0));return iso(date)}
  function displayDate(value){const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return match?`${match[3]}-${match[2]}-${match[1]}`:String(value||'')}
  function nightsBetween(start,end){const a=parseIso(start),b=parseIso(end);return a&&b?Math.max(1,Math.round((b-a)/86400000)):1}
  function rooms(profile){return Math.max(1,Math.ceil(Math.max(1,Number(profile?.people||1))/2))}
  function planKey(segment){return `${segment.town}|${segment.checkIn}`}
  function isGreece(profile){return /יוון|greece|loutraki|לוטראקי|ioannina|יואנינה|אואונינה|volos|וולוס|athens|אתונה/i.test(`${profile?.destination||''} ${(profile?.countries||[]).join(' ')}`)}

  function allocationForGreece(nights){
    const requested=[['לוטראקי',1],['יואנינה',3],['וולוס',2],['אתונה',1]],result=[];
    let left=Math.max(1,nights);
    requested.forEach(([town,wanted],index)=>{
      if(left<=0)return;
      const reserve=Math.max(0,requested.length-index-1);
      const count=index===requested.length-1?left:Math.min(wanted,Math.max(1,left-reserve));
      result.push([town,count]);left-=count;
    });
    if(left>0)result[result.length-1][1]+=left;
    return result;
  }

  function routeAreas(profile,nights){
    if(isGreece(profile))return allocationForGreece(nights);
    let hubs=[];
    try{hubs=typeof window.lodgingHubSequence==='function'?window.lodgingHubSequence(profile,nights+1):[]}catch(_){hubs=[]}
    if(!hubs.length)hubs=[profile?.destination||'אזור המסלול'];
    const count=Math.min(hubs.length,Math.max(1,nights)),base=Math.floor(nights/count),extra=nights%count;
    return hubs.slice(0,count).map((town,index)=>[town,base+(index<extra?1:0)]).filter(x=>x[1]>0);
  }

  function proposedPlan(profile){
    const nights=nightsBetween(profile?.start,profile?.end),areas=routeAreas(profile,nights);let offset=0;
    return areas.map(([town,count],index)=>{
      const segment={id:`stay-${index}-${offset}`,town,nights:count,startDay:offset,checkIn:addDays(profile?.start,offset),checkOut:addDays(profile?.start,offset+count),skipped:false,selectedHotel:null};
      const selected=preSelections[planKey(segment)];
      if(selected?.skipped)segment.skipped=true;
      if(selected?.hotel)segment.selectedHotel={...selected.hotel};
      offset+=count;return segment;
    });
  }

  function genericHotels(town,profile){
    const requested=Number(profile?.hotelStars||0),star=Number.isFinite(requested)&&requested>0?requested:4;
    const base=profile?.lodgingBudget==='luxury'?220:profile?.lodgingBudget==='budget'?85:profile?.lodgingBudget==='verycheap'?55:125;
    return [
      {name:`בחירת Booking המובילה באזור ${town}`,score:9.0,stars:star,eur:base},
      {name:`מלון מרכזי מומלץ באזור ${town}`,score:8.7,stars:Math.max(3,star-1),eur:Math.max(45,base-25)},
      {name:`מלון תמורה טובה באזור ${town}`,score:8.4,stars:Math.max(3,star-1),eur:Math.max(40,base-40)}
    ];
  }

  function candidates(town,profile){
    const known=HOTEL_CATALOG.filter(h=>h.match.test(String(town||''))).map(({match,...hotel})=>hotel);
    return known.length?known:genericHotels(town,profile);
  }

  function affiliateConfigured(){const config=window.TRIPCRAFT_CONFIG||{};return !!(String(config.bookingAffiliateId||'').trim()||String(config.bookingAffiliateTemplate||'').trim())}
  function bookingUrl(hotel,segment,profile){
    const config=window.TRIPCRAFT_CONFIG||{},adults=Math.max(1,Number(profile?.people||1)-Number(profile?.children||0));
    const params=new URLSearchParams({ss:`${hotel?.name||segment.town}, ${segment.town}`,checkin:segment.checkIn,checkout:segment.checkOut,group_adults:String(adults),group_children:String(Number(profile?.children||0)),no_rooms:String(rooms(profile)),label:'tripcraft-v107'});
    const affiliateId=String(config.bookingAffiliateId||'').trim();if(affiliateId)params.set('aid',affiliateId);
    const direct=`https://www.booking.com/searchresults.html?${params.toString()}`;
    const template=String(config.bookingAffiliateTemplate||'').trim();
    if(!template)return direct;
    return template.replaceAll('{url}',encodeURIComponent(direct)).replaceAll('{destination}',encodeURIComponent(segment.town)).replaceAll('{hotel}',encodeURIComponent(hotel?.name||segment.town));
  }

  function affiliateNote(){return affiliateConfigured()?'<span class="tc-v107-affiliate ok">✓ קישור Affiliate של TripCraft</span>':'<span class="tc-v107-affiliate pending">Affiliate טרם הוגדר — הקישור נפתח ב־Booking ללא עמלה</span>'}
  function scoreText(hotel){return hotel.name.startsWith('בחירת Booking')||hotel.name.startsWith('מלון ')?`${hotel.score}+ לפי סינון`:`${hotel.score}`}
  function starsText(stars){return '★'.repeat(Math.max(1,Number(stars||0)))}
  function totalText(hotel,segment,profile){const total=Number(hotel.eur||0)*Number(segment.nights||1)*rooms(profile);return `€${Number(hotel.eur||0).toLocaleString()} ללילה · כ־€${total.toLocaleString()} לכל השהייה`}

  function normalizePlan(draft){
    if(!draft?.plannerProfile)return [];
    if(draft.plannerProfile.lodgingMode==='skip'){draft.hotelPlan=[];return draft.hotelPlan}
    if((!Array.isArray(draft.hotelPlan)||!draft.hotelPlan.length)&&draft.plannerProfile.lodgingMode==='existing')draft.hotelPlan=planFromDays(draft);
    if(!Array.isArray(draft.hotelPlan)||!draft.hotelPlan.length){draft.hotelPlan=proposedPlan(draft.plannerProfile);if(draft.plannerProfile.lodgingMode==='later')draft.hotelPlan.forEach(segment=>segment.skipped=true)}
    draft.hotelPlan=draft.hotelPlan.map((segment,index)=>({...segment,id:segment.id||`stay-${index}-${segment.startDay||0}`,startDay:Number(segment.startDay||0),nights:Math.max(1,Number(segment.nights||1)),checkIn:segment.checkIn||addDays(draft.plannerProfile.start,segment.startDay||0),checkOut:segment.checkOut||addDays(draft.plannerProfile.start,Number(segment.startDay||0)+Number(segment.nights||1))}));
    applyPlanToDays(draft,draft.hotelPlan,false);return draft.hotelPlan;
  }

  function applyPlanToDays(draft,plan,replaceStops=true){
    if(!draft?.days)return;
    const lastNight=Math.max(0,draft.days.length-1);
    for(let i=0;i<lastNight;i++){
      const segment=plan.find(item=>i>=item.startDay&&i<item.startDay+item.nights);
      if(!segment||segment.skipped){draft.days[i].lodging='';draft.days[i].lodgingArea=segment?.town||'';continue}
      const old=draft.days[i].lodging,newName=segment.selectedHotel?.name||segment.town;
      draft.days[i].lodgingArea=segment.town;draft.days[i].lodging=newName;
      if(replaceStops&&(draft.days[i].stops||[]).length){
        draft.days[i].stops.forEach(stop=>{if(stop.place===old||/הגעה למקום הלינה|חזרה למקום הלינה/.test(stop.what||''))stop.place=newName});
      }
    }
  }

  function planFromDays(draft){
    const days=(draft?.days||[]).slice(0,-1),plan=[];let current=null;
    days.forEach((day,index)=>{
      const town=day.lodgingArea||day.lodging||'ללא לינה',hotelName=day.lodging||'';
      if(!current||current.town!==town||current.hotelName!==hotelName){
        current={id:`stay-${plan.length}-${index}`,town,startDay:index,nights:1,checkIn:day.date||addDays(draft.plannerProfile.start,index),checkOut:addDays(day.date||draft.plannerProfile.start,1),skipped:!hotelName,hotelName};plan.push(current);
      }else{current.nights++;current.checkOut=addDays(day.date||draft.plannerProfile.start,1)}
    });
    plan.forEach(segment=>{const found=candidates(segment.town,draft.plannerProfile).find(h=>h.name===segment.hotelName);segment.selectedHotel=found?{...found}:segment.hotelName?{name:segment.hotelName,score:'—',stars:0,eur:0}:null;delete segment.hotelName});
    draft.hotelPlan=plan;return plan;
  }

  function persist(){
    clearTimeout(saveTimer);saveTimer=setTimeout(()=>Promise.resolve(window.TripCraftV102?.saveDraft?.()).catch(error=>console.warn('Hotel plan save failed',error)),450);
  }

  function hotelChoiceHtml(hotel,segment,profile,index,mode){
    const selected=segment.selectedHotel?.name===hotel.name;
    return `<div class="tc-v107-hotel-option${selected?' selected':''}"><div class="tc-v107-hotel-main"><strong>${safe(hotel.name)}</strong><div class="tc-v107-hotel-facts"><span>ציון Booking: ${safe(scoreText(hotel))}</span><span class="tc-v107-stars" aria-label="${hotel.stars} כוכבים">${starsText(hotel.stars)}</span><span>${safe(totalText(hotel,segment,profile))}</span></div></div><div class="tc-v107-hotel-buttons"><a class="btn booking-cta" target="_blank" rel="noopener sponsored" href="${safe(bookingUrl(hotel,segment,profile))}">פתח ב־Booking ↗</a><button class="btn green" type="button" data-v107-${mode}="${safe(segment.id)}" data-hotel-index="${index}">${selected?'נבחר ✓':'בחר מלון'}</button></div></div>`;
  }

  function segmentHtml(segment,profile,mode){
    const list=candidates(segment.town,profile),maxNights=Math.max(1,nightsBetween(segment.checkIn,profile.end));
    return `<article class="tc-v107-stay${segment.skipped?' skipped':''}" data-stay-id="${safe(segment.id)}"><div class="tc-v107-stay-head"><div><h3>📍 ${safe(segment.town)}</h3><p><strong>${segment.nights} ${segment.nights===1?'לילה':'לילות'}</strong> · ${displayDate(segment.checkIn)} עד ${displayDate(segment.checkOut)}</p></div><label>מספר לילות <input type="number" min="1" max="${maxNights}" value="${segment.nights}" data-v107-nights="${safe(segment.id)}"></label></div>${segment.skipped?'<div class="warn">הלינה באזור זה דולגה. אפשר לבחור מלון בכל עת.</div>':''}<div class="tc-v107-options">${list.map((hotel,index)=>hotelChoiceHtml(hotel,segment,profile,index,mode)).join('')}</div><div class="tc-v107-stay-footer"><button class="btn soft" type="button" data-v107-skip="${safe(segment.id)}" data-mode="${mode}">דלג על אזור לינה זה</button>${affiliateNote()}</div></article>`;
  }

  function renderPreApproval(){
    const box=$('preApprovalHotels');if(!box||typeof window.plannerData!=='function')return;
    const profile=window.plannerData();
    if(profile.lodgingMode==='skip'){box.innerHTML='<div class="safe"><strong>דילגתם על לינה.</strong> ניתן לחזור לשלב זה ולשנות את הבחירה.</div>';return}
    if(profile.lodgingMode==='existing'){box.innerHTML=`<div class="safe"><strong>הלינות שכבר הזנתם יישמרו:</strong><div style="margin-top:8px;white-space:pre-line">${safe(profile.existingLodging||'טרם הוזנו מקומות לינה.')}</div></div>`;return}
    const plan=proposedPlan(profile);
    box.innerHTML=`<div class="prehotel-head"><div><strong>חלוקת הלינות שמציע TripCraft</strong><p>אפשר לבחור מלון, לשנות מספר לילות או לדלג. התאריכים יעברו גם לחיפוש Booking.</p></div><span>${plan.reduce((sum,item)=>sum+item.nights,0)} לילות</span></div><div class="tc-v107-data-note">הציון והמחיר הם תמונת מצב לפיילוט. המחיר והציון העדכניים והמחייבים מופיעים ב־Booking בעת פתיחת הקישור.</div>${plan.map(segment=>segmentHtml(segment,profile,'preselect')).join('')}`;
  }

  function renderHotels(){
    const box=$('hotelRecommendations'),status=$('hotelPlanStatus'),draft=window.planner?.draft;if(!box||!status)return;
    if(!draft){status.textContent='בנו טיול כדי לראות את חלוקת הלינות, התאריכים והמלונות המומלצים.';box.innerHTML='';return}
    const plan=normalizePlan(draft),profile=draft.plannerProfile||{};
    if(!plan.length){status.innerHTML='<strong>הטיול נשמר ללא מלונות.</strong> אפשר לחזור לשאלון ולבחור תכנון לינה.';box.innerHTML='';return}
    status.innerHTML=`<strong>${plan.length} אזורי לינה מוצעים</strong> · כל קישור Booking כולל יעד, תאריכי כניסה ויציאה והרכב נוסעים. ${affiliateNote()}`;
    box.className='tc-v107-hotel-plan';box.innerHTML=`<div class="tc-v107-data-note">המלונות, ציוני Booking והמחירים מוצגים כהמלצת פיילוט. לפני בחירה סופית יש לאמת זמינות, מחיר וציון בעמוד Booking שנפתח.</div>${plan.map(segment=>segmentHtml(segment,profile,'select')).join('')}<div class="cta"><a class="btn secondary" href="#planner">חזרה לטיול</a></div>`;
    const focus=sessionStorage.getItem('tc_hotel_focus');if(focus)setTimeout(()=>{[...box.querySelectorAll('.tc-v107-stay')].find(card=>norm(card.textContent).includes(norm(focus)))?.scrollIntoView({behavior:'smooth',block:'center'});sessionStorage.removeItem('tc_hotel_focus')},60);
  }

  function selectedNights(id,root=document){const input=[...(root.querySelectorAll?.('[data-v107-nights]')||[])].find(el=>el.dataset.v107Nights===id);return Math.max(1,Number(input?.value||1))}
  function applyHotel(segmentId,hotelIndex,nightCount){
    const draft=window.planner?.draft;if(!draft)return;
    const plan=normalizePlan(draft),segment=plan.find(item=>item.id===segmentId);if(!segment)return;
    const hotel=candidates(segment.town,draft.plannerProfile)[Number(hotelIndex)];if(!hotel)return;
    const max=Math.max(1,draft.days.length-1-segment.startDay),count=Math.min(max,Math.max(1,Number(nightCount||segment.nights)));
    for(let i=segment.startDay;i<Math.min(draft.days.length-1,segment.startDay+count);i++){
      const day=draft.days[i],old=day.lodging;day.lodgingArea=segment.town;day.lodging=hotel.name;
      (day.stops||[]).forEach(stop=>{if(stop.place===old||/הגעה למקום הלינה|חזרה למקום הלינה/.test(stop.what||''))stop.place=hotel.name});
    }
    draft.hotelPlan=planFromDays(draft);window.renderPlannerDraft?.();renderHotels();persist();
  }
  function skipStay(segmentId,nightCount){
    const draft=window.planner?.draft;if(!draft)return;
    const plan=normalizePlan(draft),segment=plan.find(item=>item.id===segmentId);if(!segment)return;
    const count=Math.max(1,Number(nightCount||segment.nights));for(let i=segment.startDay;i<Math.min(draft.days.length-1,segment.startDay+count);i++)draft.days[i].lodging='';
    draft.hotelPlan=planFromDays(draft);window.renderPlannerDraft?.();renderHotels();persist();
  }

  function openDayDialog(dayIndex){
    const draft=window.planner?.draft,day=draft?.days?.[dayIndex];if(!draft||!day)return;
    normalizePlan(draft);const area=day.lodgingArea||day.lodging||draft.plannerProfile.destination,segment=draft.hotelPlan.find(item=>dayIndex>=item.startDay&&dayIndex<item.startDay+item.nights)||{id:`day-${dayIndex}`,town:area,startDay:dayIndex,nights:1,checkIn:day.date,checkOut:addDays(day.date,1)};
    $('tcV107HotelDialog')?.remove();const modal=document.createElement('div');modal.id='tcV107HotelDialog';modal.className='tc-v107-modal';modal.setAttribute('aria-modal','true');modal.setAttribute('role','dialog');
    modal.innerHTML=`<div class="tc-v107-modal-card"><div class="tc-v107-modal-head"><div><h3>שינוי מלון מיום ${dayIndex+1}</h3><p>${safe(area)} · ${displayDate(day.date)}</p></div><button class="btn soft" type="button" data-v107-close>סגור</button></div><label class="tc-v107-night-count">לכמה לילות? <input id="tcV107DayNights" type="number" min="1" max="${Math.max(1,draft.days.length-1-dayIndex)}" value="${Math.min(segment.nights,Math.max(1,draft.days.length-1-dayIndex))}"></label><div class="tc-v107-options">${candidates(area,draft.plannerProfile).map((hotel,index)=>hotelChoiceHtml(hotel,{...segment,id:`day-${dayIndex}`,town:area,startDay:dayIndex},draft.plannerProfile,index,'dayselect')).join('')}</div><button class="btn soft" type="button" data-v107-day-skip="${dayIndex}">דלג על הלינה בלילות האלה</button><div class="tc-v107-data-note">השינוי יעדכן אוטומטית את כל הלילות שבחרתם ואת הטיול השמור.</div></div>`;
    document.body.appendChild(modal);
  }

  function enhanceDayCards(){
    const draft=window.planner?.draft;if(!draft)return;normalizePlan(draft);
    document.querySelectorAll?.('#plannerDraftDays .day-row').forEach((card,index)=>{
      const day=draft.days[index],main=card.querySelector('.day-main');if(!day||!main)return;
      main.querySelector('.tc-v107-night-row')?.remove();
      const row=document.createElement('div');row.className='tc-v107-night-row';row.innerHTML=day.lodging?`<div><strong>🏨 הלינה בלילה זה</strong><span>${safe(day.lodging)}</span><small>${safe(day.lodgingArea&&day.lodgingArea!==day.lodging?'אזור: '+day.lodgingArea:'')}</small></div><button class="btn soft" type="button" data-v107-change-day="${index}">שנה מלון</button>`:`<div><strong>🏨 לא נבחרה לינה ללילה זה</strong><span>אפשר לבחור עכשיו או לחזור לעמוד בתי המלון.</span></div><button class="btn soft" type="button" data-v107-change-day="${index}">בחר מלון</button>`;
      main.appendChild(row);
    });
  }

  function enhanceOpenDay(dayIndex){
    const day=window.planner?.draft?.days?.[dayIndex],box=$('plannerDayRouteBox');if(!day||!box)return;
    box.querySelector('.tc-v107-day-lodging')?.remove();const panel=document.createElement('div');panel.className='tc-v107-day-lodging';panel.innerHTML=`<div><strong>🏨 לינת הלילה</strong><span>${safe(day.lodging||'טרם נבחר מלון')}</span></div><div><button class="btn soft" type="button" data-v107-change-day="${dayIndex}">שנה מלון</button><button class="btn secondary" type="button" data-v107-open-hotels="${dayIndex}">כל המלונות בטיול</button></div>`;box.appendChild(panel);
  }

  function installDemoLink(){
    document.querySelector?.('#home #tcV107DemoTrip')?.remove();
    const cta=document.querySelector?.('#how .cta');if(!cta||cta.querySelector('#tcV107DemoTrip'))return;
    const link=document.createElement('a');link.id='tcV107DemoTrip';link.className='btn green';link.href='trip-slovakia.html?demo=1';link.target='_blank';link.rel='noopener';link.textContent='צפו בטיול סלובקיה לדוגמה — ללא הרשמה';cta.insertBefore(link,cta.firstChild);
  }

  function installOverrides(){
    const api=window.TripCraftV102;
    if(api?.generateDraft&&!api.generateDraft.tcV107Wrapped){
      const baseGenerate=api.generateDraft.bind(api);const wrapped=profile=>{const draft=baseGenerate(profile);if(profile.lodgingMode==='skip'){draft.hotelPlan=[];return draft}if(profile.lodgingMode==='existing'){draft.hotelPlan=planFromDays(draft);return draft}draft.hotelPlan=proposedPlan(profile);if(profile.lodgingMode==='later')draft.hotelPlan.forEach(segment=>segment.skipped=true);applyPlanToDays(draft,draft.hotelPlan,true);return draft};wrapped.tcV107Wrapped=true;api.generateDraft=wrapped;
    }
    const baseRender=window.renderPlannerDraft;
    if(typeof baseRender==='function'&&!baseRender.tcV107Wrapped){
      const wrapped=function(){if(window.planner?.draft)normalizePlan(window.planner.draft);const result=baseRender.apply(this,arguments);setTimeout(enhanceDayCards,0);return result};wrapped.tcV107Wrapped=true;window.renderPlannerDraft=wrapped;try{renderPlannerDraft=wrapped}catch(_){ }
    }
    const baseEdit=window.plannerEditDay;
    if(typeof baseEdit==='function'&&!baseEdit.tcV107Wrapped){
      const wrapped=function(index){const result=baseEdit.apply(this,arguments);setTimeout(()=>enhanceOpenDay(Number(index)),0);return result};wrapped.tcV107Wrapped=true;window.plannerEditDay=wrapped;try{plannerEditDay=wrapped}catch(_){ }
    }
    window.renderPreApprovalHotels=renderPreApproval;try{renderPreApprovalHotels=renderPreApproval}catch(_){ }
    window.renderHotelRecommendations=renderHotels;try{renderHotelRecommendations=renderHotels}catch(_){ }
    window.openHotelsForDay=index=>{const day=window.planner?.draft?.days?.[index];if(day)sessionStorage.setItem('tc_hotel_focus',day.lodgingArea||day.lodging||'');location.hash='#hotels';setTimeout(renderHotels,40)};try{openHotelsForDay=window.openHotelsForDay}catch(_){ }
  }

  function handleClick(event){
    const pre=event.target.closest?.('[data-v107-preselect]');
    if(pre){event.preventDefault();const plan=proposedPlan(window.plannerData?.()||{}),segment=plan.find(x=>x.id===pre.dataset.v107Preselect);if(!segment)return;const hotel=candidates(segment.town,window.plannerData?.()||{})[Number(pre.dataset.hotelIndex)];preSelections[planKey(segment)]={hotel:{...hotel},skipped:false};renderPreApproval();return}
    const choose=event.target.closest?.('[data-v107-select]');
    if(choose){event.preventDefault();applyHotel(choose.dataset.v107Select,choose.dataset.hotelIndex,selectedNights(choose.dataset.v107Select));return}
    const dayChoose=event.target.closest?.('[data-v107-dayselect]');
    if(dayChoose){event.preventDefault();const index=Number(String(dayChoose.dataset.v107Dayselect).replace('day-','')),draft=window.planner?.draft,day=draft?.days?.[index];if(!day)return;normalizePlan(draft);let segment=draft.hotelPlan.find(x=>index>=x.startDay&&index<x.startDay+x.nights);if(!segment){segment={id:`stay-day-${index}`,town:day.lodgingArea||day.lodging||draft.plannerProfile.destination,startDay:index,nights:1,checkIn:day.date,checkOut:addDays(day.date,1)};draft.hotelPlan.push(segment)}segment.startDay=index;applyHotel(segment.id,dayChoose.dataset.hotelIndex,Number($('tcV107DayNights')?.value||1));$('tcV107HotelDialog')?.remove();setTimeout(()=>enhanceOpenDay(index),0);return}
    const skip=event.target.closest?.('[data-v107-skip]');
    if(skip){event.preventDefault();const mode=skip.dataset.mode;if(mode==='preselect'){const segment=proposedPlan(window.plannerData?.()||{}).find(x=>x.id===skip.dataset.v107Skip);if(segment){preSelections[planKey(segment)]={skipped:true};renderPreApproval()}}else skipStay(skip.dataset.v107Skip,selectedNights(skip.dataset.v107Skip));return}
    const change=event.target.closest?.('[data-v107-change-day]');if(change){event.preventDefault();openDayDialog(Number(change.dataset.v107ChangeDay));return}
    const all=event.target.closest?.('[data-v107-open-hotels]');if(all){event.preventDefault();window.openHotelsForDay(Number(all.dataset.v107OpenHotels));return}
    const daySkip=event.target.closest?.('[data-v107-day-skip]');if(daySkip){event.preventDefault();const index=Number(daySkip.dataset.v107DaySkip),draft=window.planner?.draft,count=Math.max(1,Number($('tcV107DayNights')?.value||1));for(let i=index;i<Math.min(draft.days.length-1,index+count);i++)draft.days[i].lodging='';draft.hotelPlan=planFromDays(draft);$('tcV107HotelDialog')?.remove();window.renderPlannerDraft?.();persist();return}
    if(event.target.closest?.('[data-v107-close]')){$('tcV107HotelDialog')?.remove()}
  }

  function install(){
    const style=document.createElement('style');style.id='tc-v107-hotels-styles';style.textContent=`
      .tc-v107-hotel-plan{display:grid;gap:16px;margin-top:16px}.tc-v107-stay{background:#fff;border:1px solid #cfe0e9;border-radius:20px;padding:17px;box-shadow:0 7px 22px rgba(13,53,87,.07)}.tc-v107-stay.skipped{border-style:dashed}.tc-v107-stay-head{display:flex;justify-content:space-between;gap:14px;align-items:start}.tc-v107-stay-head h3{margin:0 0 5px}.tc-v107-stay-head p{margin:0;color:#526b7c}.tc-v107-stay-head label{font-weight:850;white-space:nowrap}.tc-v107-stay-head input,.tc-v107-night-count input{width:70px;padding:8px;border:1px solid #bfd3df;border-radius:10px;margin-inline-start:7px}.tc-v107-options{display:grid;gap:9px;margin-top:13px}.tc-v107-hotel-option{display:flex;justify-content:space-between;gap:12px;align-items:center;background:#f8fbfd;border:1px solid #dce8ee;border-radius:15px;padding:13px}.tc-v107-hotel-option.selected{background:#eaf8f1;border-color:#86cdb0}.tc-v107-hotel-main{min-width:0}.tc-v107-hotel-facts{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}.tc-v107-hotel-facts span{background:#edf4f7;border-radius:999px;padding:5px 8px;font-size:12px;font-weight:800}.tc-v107-stars{color:#e49b00!important}.tc-v107-hotel-buttons{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.tc-v107-hotel-buttons .btn{padding:9px 12px;font-size:13px}.tc-v107-stay-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}.tc-v107-affiliate{font-size:12px;font-weight:850;border-radius:999px;padding:6px 9px}.tc-v107-affiliate.ok{background:#e6f7ef;color:#12663f}.tc-v107-affiliate.pending{background:#fff2df;color:#8b4c00}.tc-v107-data-note{background:#fff8e8;border:1px solid #ecd79f;border-radius:13px;padding:10px 12px;color:#66501b;font-size:12px;margin:10px 0}.tc-v107-night-row,.tc-v107-day-lodging{display:flex;justify-content:space-between;align-items:center;gap:12px;background:linear-gradient(135deg,#e8f8f0,#f5fcf8);border:2px solid #65bd91;border-radius:14px;padding:12px;margin-top:12px}.tc-v107-night-row div,.tc-v107-day-lodging>div:first-child{display:grid;gap:3px}.tc-v107-night-row small{color:#567063}.tc-v107-modal{position:fixed;inset:0;background:rgba(5,24,38,.7);z-index:10000;display:grid;place-items:center;padding:18px}.tc-v107-modal-card{width:min(820px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:24px;padding:20px;box-shadow:0 24px 60px rgba(0,0,0,.32)}.tc-v107-modal-head{display:flex;justify-content:space-between;gap:12px;align-items:start}.tc-v107-modal-head h3{margin:0}.tc-v107-modal-head p{margin:4px 0 12px}.tc-v107-night-count{display:block;font-weight:900;margin:8px 0 14px}
      @media(max-width:700px){.tc-v107-stay-head,.tc-v107-hotel-option,.tc-v107-night-row,.tc-v107-day-lodging{flex-direction:column;align-items:stretch}.tc-v107-hotel-buttons{display:grid;grid-template-columns:1fr 1fr}.tc-v107-hotel-buttons .btn{width:100%;min-width:0}.tc-v107-stay-head label{white-space:normal}.tc-v107-modal{padding:7px}.tc-v107-modal-card{padding:14px;border-radius:18px}}
    `;document.head.appendChild(style);
    installOverrides();installDemoLink();window.addEventListener('click',handleClick);
    const days=$('plannerDraftDays');if(days)new MutationObserver(()=>setTimeout(enhanceDayCards,0)).observe(days,{childList:true,subtree:true});
    window.addEventListener('hashchange',()=>{if(location.hash==='#hotels')setTimeout(renderHotels,30);if(location.hash==='#how')installDemoLink()});
    if(location.hash==='#hotels')renderHotels();if(location.hash==='#how')installDemoLink();
    window.TripCraftV107Hotels={proposedPlan,candidates,bookingUrl,normalizePlan,applyHotel,skipStay,renderHotels,openDayDialog,affiliateConfigured};
    document.documentElement.dataset.tripcraftVersion='V107';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
