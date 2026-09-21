/* TripCraft V106 - persistent authenticated navigation and reliable trip editing. */
(() => {
  'use strict';

  const VERSION='V106';
  const IDLE_MS=30*60*1000;
  const SESSION_TIMEOUT_MS=3500;
  const LAST_ACTIVITY='tc_v106_last_activity';
  const WINDOW_MARKER='tc_v106_session_window';
  const LEGACY_WINDOW_MARKERS=['tc_v105_session_window','tc_v104_session_window','tc_v103_session_window'];
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
    if(!text)$('tcV106UserMenu')?.remove();
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

  window.tcV106AdoptAuthenticatedUser=adoptAuthenticatedUser;

  async function logoutNow(){
    try{await withTimeout(getClient()?.auth.signOut()||Promise.resolve(),5000)}catch(_){ }
    activeUser=null;localStorage.removeItem(CUSTOMER);localStorage.removeItem(LAST_ACTIVITY);clearSessionMarkers();$('tcV106UserMenu')?.remove();renderGreeting(null);routeNow('#home');
  }

  function toggleUserMenu(anchor){
    if(!hasUsableLocalSession())return;
    const old=$('tcV106UserMenu');if(old){old.remove();return}
    const menu=document.createElement('div');menu.id='tcV106UserMenu';menu.className='tc-v106-user-menu';menu.innerHTML='<strong>החשבון שלי</strong><button type="button" id="tcV106Logout">התנתק</button>';
    document.body.appendChild(menu);
    const rect=anchor.getBoundingClientRect(),width=190,left=Math.min(window.innerWidth-width-12,Math.max(12,rect.left));
    menu.style.left=left+'px';menu.style.top=Math.min(window.innerHeight-100,rect.bottom+8)+'px';
    $('tcV106Logout').onclick=logoutNow;
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
      console.error('TripCraft V106 build failed',error);
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
    const style=document.createElement('style');style.id='tc-v106-styles';style.textContent=`
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
      .tc-v106-user-menu{position:fixed;z-index:5000;width:190px;background:#fff;border:1px solid #d7e2e9;border-radius:14px;padding:12px;box-shadow:0 12px 32px rgba(7,27,43,.22);display:grid;gap:10px;color:#173047}
      .tc-v106-user-menu button{border:0;border-radius:10px;padding:10px 12px;background:#d62828;color:#fff;font:inherit;font-weight:900;cursor:pointer}
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
    document.addEventListener('click',event=>{if(!event.target.closest('#tcV106UserMenu,#tcUserGreeting,#tcMobileUser'))$('tcV106UserMenu')?.remove()});
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
