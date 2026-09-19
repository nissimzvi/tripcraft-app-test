/* TripCraft V86 auth + cloud trips flow.
   Uses public Supabase client configuration only. */
(() => {
  'use strict';
  const V='V86';
  const PROTECTED=new Set(['planner','account','import','cart','hotels','trips']);
  let sb=null, sessionUser=null, authCtx=null, resendTimer=null, resendLeft=0, cloudTrips=[], cloudTripsReady=false, tableReady=true;

  function byId(id){return document.getElementById(id)}
  function cleanEmail(v){return String(v||'').trim().toLowerCase()}
  function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(v))}
  function cfg(){return window.TRIPCRAFT_CONFIG||{}}
  function supabaseClient(){
    if(sb)return sb;
    const c=cfg();
    if(!c.supabaseUrl||!c.supabaseAnonKey||!window.supabase?.createClient)return null;
    sb=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }
  function localCustomer(){try{return JSON.parse(localStorage.getItem('tc_v433_customer')||'null')}catch(e){return null}}
  function writeLocalCustomer(u){if(u)localStorage.setItem('tc_v433_customer',JSON.stringify(u));else localStorage.removeItem('tc_v433_customer')}
  function userToCustomer(user){
    const m=user?.user_metadata||{},p=m.tripcraft_profile||{};
    return {id:user?.id||'',email:user?.email||'',firstName:p.firstName||m.first_name||'',lastName:p.lastName||m.last_name||'',phone:p.phone||m.phone||'',method:'otp'};
  }
  function loggedIn(){return !!sessionUser}
  function pageFromHash(hash=location.hash){const raw=(hash||'#home').replace(/^#/,'');return raw.startsWith('trip/')?'trip':(raw.split('?')[0]||'home')}
  function authReturn(hash){sessionStorage.setItem('tc_v86_return_after_auth',hash||'#account')}
  function goLogin(hash){authReturn(hash);sessionStorage.removeItem('tc_build_after_login');sessionStorage.removeItem('tc_return_after_login');location.hash='#login';setTimeout(()=>byId('tcAuthEmailPrimary')?.focus(),120)}

  function installAuthUI(){
    const entry=byId('tcAuthEntry'); if(!entry)return;
    entry.innerHTML=`
      <div class="page-visual login-visual"><div><h2>כניסה והרשמה</h2><p>מזינים אימייל פעם אחת. המערכת בודקת אם החשבון קיים ושולחת קוד OTP בן 6 ספרות.</p></div></div>
      <div class="safe pilot-feedback-note"><strong>פיילוט TripCraft:</strong> הפרטים נדרשים כדי לשמור את הטיול שלכם, לאפשר עדכונים ולקבל פידבקים ומשוב שיעזרו לנו לשפר את המערכת. כל השדות חובה למעט טלפון.</div>
      <div class="auth-grid" style="grid-template-columns:minmax(0,720px);justify-content:center">
        <div class="auth-card" id="tcV85EmailCard">
          <h3>כניסה ל-TripCraft</h3>
          <div class="field"><label>אימייל <span class="req-star">*</span></label><input id="tcAuthEmailPrimary" type="email" autocomplete="email" inputmode="email" placeholder="name@example.com"></div>
          <div id="tcAuthLookupStatus" class="statusbar" aria-live="polite"></div>
          <button id="tcAuthContinue" class="btn secondary" type="button">בדוק והמשך</button>
        </div>
        <div class="auth-card" id="tcV85NewFields" hidden>
          <h3>הרשמה חדשה</h3>
          <div class="safe" style="margin-bottom:12px">האימייל עדיין לא רשום. השלימו את הפרטים ונשלח קוד אימות.</div>
          <div class="formgrid">
            <div class="field"><label>שם פרטי <span class="req-star">*</span></label><input id="tcV85FirstName" autocomplete="given-name"></div>
            <div class="field"><label>שם משפחה <span class="req-star">*</span></label><input id="tcV85LastName" autocomplete="family-name"></div>
            <div class="field"><label>טלפון (לא חובה)</label><input id="tcV85Phone" inputmode="tel" autocomplete="tel"></div>
            <div class="field"><label>אימייל</label><input id="tcV85EmailMirror" type="email" readonly></div>
          </div>
          <button id="tcV85CreateAndSend" class="btn secondary" type="button">הרשם ושלח קוד</button>
        </div>
      </div>`;
    const otp=byId('tcOtpStep');
    if(otp){
      const demo=byId('tcOtpDemo'); if(demo)demo.style.display='none';
      const subtitle=otp.querySelector('.otp-subtitle'); if(subtitle)subtitle.textContent='הזינו את הקוד בן 6 הספרות שנשלח אל:';
      byId('tcOtpBack')?.addEventListener('click',v85BackFromOtp,true);
      byId('tcVerifyOtp')?.addEventListener('click',v85VerifyOtp,true);
      byId('tcResendOtp')?.addEventListener('click',v85ResendOtp,true);
      byId('tcOtpCode')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();v85VerifyOtp(e)}});
    }
    byId('tcAuthContinue')?.addEventListener('click',v85CheckEmail);
    byId('tcV85CreateAndSend')?.addEventListener('click',v85CreateAndSend);
    byId('tcAuthEmailPrimary')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();v85CheckEmail()}});
  }

  function setLookup(msg,kind=''){
    const el=byId('tcAuthLookupStatus'); if(!el)return;
    el.className='statusbar'+(kind?' '+kind:''); el.textContent=msg||'';
  }
  function authBusy(on,label){const b=byId('tcAuthContinue');if(!b)return;b.disabled=!!on;b.textContent=on?(label||'בודק...'):'בדוק והמשך'}
  function openOtp(ctx){
    authCtx=ctx;
    byId('tcAuthEntry').hidden=true; byId('tcOtpStep').hidden=false;
    byId('tcOtpEmailDisplay').textContent=ctx.email;
    byId('tcOtpHint').textContent=ctx.isNew?'ההרשמה נפתחה. קוד אימות נשלח למייל.':'המשתמש קיים. קוד אימות נשלח למייל.';
    byId('tcOtpCode').value=''; byId('tcOtpStatus').textContent='';
    startResendTimer(60);
    window.scrollTo({top:byId('login')?.offsetTop||0,behavior:'smooth'});
    setTimeout(()=>{byId('tcOtpCode')?.focus({preventScroll:true});byId('tcOtpCode')?.select?.()},220);
  }
  function v85BackFromOtp(e){if(e){e.preventDefault();e.stopImmediatePropagation()} clearInterval(resendTimer);byId('tcOtpStep').hidden=true;byId('tcAuthEntry').hidden=false;setTimeout(()=>byId('tcAuthEmailPrimary')?.focus(),120)}
  function startResendTimer(sec){
    clearInterval(resendTimer);resendLeft=sec;const b=byId('tcResendOtp');if(!b)return;
    const paint=()=>{if(resendLeft>0){b.disabled=true;b.textContent=`שלח קוד חדש בעוד ${resendLeft} שנ׳`}else{b.disabled=false;b.textContent='שלח קוד חדש'}};paint();
    resendTimer=setInterval(()=>{resendLeft--;paint();if(resendLeft<=0)clearInterval(resendTimer)},1000);
  }
  async function v85CheckEmail(){
    const email=cleanEmail(byId('tcAuthEmailPrimary')?.value); if(!validEmail(email)){alert('נא להזין כתובת אימייל תקינה.');byId('tcAuthEmailPrimary')?.focus();return}
    const client=supabaseClient(); if(!client){setLookup('שירות האימות לא נטען. יש לרענן את הדף ולנסות שוב.','err');return}
    authBusy(true,'בודק משתמש...');setLookup('בודק אם האימייל כבר רשום...');byId('tcV85NewFields').hidden=true;
    try{
      const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:false}});
      if(!error){setLookup('המשתמש קיים. קוד נשלח למייל.','ok');openOtp({email,isNew:false,profile:null});return}
      const msg=String(error.message||'');
      if(/Signups not allowed for otp|otp_disabled|User not found|not found/i.test(msg)){
        setLookup('האימייל אינו רשום עדיין. השלימו הרשמה קצרה.','ok');
        byId('tcV85EmailMirror').value=email;byId('tcV85NewFields').hidden=false;setTimeout(()=>byId('tcV85FirstName')?.focus(),100);return;
      }
      setLookup('לא ניתן לבדוק את האימייל: '+msg,'err');
    }catch(err){setLookup('שגיאת תקשורת לשירות האימות: '+(err?.message||'Load failed'),'err');console.error(err)}finally{authBusy(false)}
  }
  async function v85CreateAndSend(){
    const email=cleanEmail(byId('tcAuthEmailPrimary')?.value),first=(byId('tcV85FirstName')?.value||'').trim(),last=(byId('tcV85LastName')?.value||'').trim(),phone=(byId('tcV85Phone')?.value||'').trim();
    if(!first||!last||!validEmail(email)){alert('שם פרטי, שם משפחה ואימייל הם שדות חובה.');return}
    const client=supabaseClient(); if(!client){alert('שירות האימות לא זמין.');return}
    const btn=byId('tcV85CreateAndSend');btn.disabled=true;btn.textContent='שולח קוד...';
    try{
      const profile={firstName:first,lastName:last,phone};
      const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true,data:{tripcraft_profile:profile,first_name:first,last_name:last,phone}}});
      if(error)throw error;openOtp({email,isNew:true,profile});
    }catch(err){alert('שליחת הקוד נכשלה: '+(err?.message||'שגיאה לא ידועה'));console.error(err)}finally{btn.disabled=false;btn.textContent='הרשם ושלח קוד'}
  }
  async function v85ResendOtp(e){if(e){e.preventDefault();e.stopImmediatePropagation()} if(!authCtx||resendLeft>0)return;const client=supabaseClient();if(!client)return;const b=byId('tcResendOtp');b.disabled=true;b.textContent='שולח...';try{const opt={shouldCreateUser:!!authCtx.isNew};if(authCtx.isNew&&authCtx.profile)opt.data={tripcraft_profile:authCtx.profile,first_name:authCtx.profile.firstName,last_name:authCtx.profile.lastName,phone:authCtx.profile.phone||''};const {error}=await client.auth.signInWithOtp({email:authCtx.email,options:opt});if(error)throw error;byId('tcOtpStatus').textContent='קוד חדש נשלח.';startResendTimer(60);setTimeout(()=>byId('tcOtpCode')?.focus(),80)}catch(err){byId('tcOtpStatus').textContent='שליחה חוזרת נכשלה: '+(err?.message||'');b.disabled=false;b.textContent='שלח קוד חדש'}}
  async function v85VerifyOtp(e){
    if(e){e.preventDefault();e.stopImmediatePropagation()} if(!authCtx)return;
    const token=(byId('tcOtpCode')?.value||'').trim();if(!/^\d{6}$/.test(token)){alert('נא להזין קוד בן 6 ספרות.');byId('tcOtpCode')?.focus();return}
    const client=supabaseClient();if(!client){alert('שירות האימות לא זמין.');return}
    const b=byId('tcVerifyOtp');b.disabled=true;b.textContent='מאמת...';
    try{
      const {data,error}=await client.auth.verifyOtp({email:authCtx.email,token,type:'email'});if(error)throw error;
      let user=data?.user;if(!user){const g=await client.auth.getUser();user=g.data?.user}
      if(authCtx.isNew&&authCtx.profile){const md={...(user?.user_metadata||{}),tripcraft_profile:authCtx.profile,first_name:authCtx.profile.firstName,last_name:authCtx.profile.lastName,phone:authCtx.profile.phone||''};const up=await client.auth.updateUser({data:md});if(!up.error&&up.data?.user)user=up.data.user}
      sessionUser=user;writeLocalCustomer(userToCustomer(user));authCtx=null;clearInterval(resendTimer);await loadCloudTrips();
      byId('tcOtpStep').hidden=true;byId('tcAuthEntry').hidden=false;if(typeof window.tcRenderHeaderUser==='function')window.tcRenderHeaderUser();
      const ret=sessionStorage.getItem('tc_v86_return_after_auth')||'#account';sessionStorage.removeItem('tc_v86_return_after_auth');
      location.hash=ret;setTimeout(()=>handleCurrentRoute(),50);
    }catch(err){alert('קוד OTP שגוי או שפג תוקפו. אפשר לבקש קוד חדש.');console.error(err);byId('tcOtpCode')?.focus()}finally{b.disabled=false;b.textContent='אמת והמשך'}
  }

  async function syncSession(){
    const client=supabaseClient(); if(!client)return;
    const {data}=await client.auth.getSession();sessionUser=data?.session?.user||null;
    if(sessionUser){writeLocalCustomer(userToCustomer(sessionUser));await loadCloudTrips()}else{writeLocalCustomer(null);cloudTrips=[];cloudTripsReady=true}
    client.auth.onAuthStateChange((_event,session)=>{sessionUser=session?.user||null;if(sessionUser){writeLocalCustomer(userToCustomer(sessionUser));setTimeout(loadCloudTrips,0)}else{writeLocalCustomer(null);cloudTrips=[];cloudTripsReady=true}});
  }
  async function loadCloudTrips(){
    cloudTripsReady=false;tableReady=true;const client=supabaseClient();if(!client||!sessionUser){cloudTrips=[];cloudTripsReady=true;return}
    try{
      const {data,error}=await client.from('tripcraft_trips').select('id,name,destination,start_date,end_date,draft,updated_at').order('updated_at',{ascending:false});
      if(error){if(/does not exist|relation .*tripcraft_trips|42P01/i.test(String(error.message||'')))tableReady=false;throw error}
      cloudTrips=Array.isArray(data)?data:[];
    }catch(err){console.warn('TripCraft cloud trips unavailable',err);cloudTrips=[]}finally{cloudTripsReady=true;if(location.hash==='#account')renderCloudAccount()}
  }
  function tripId(){return 'TC-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)).toUpperCase()}
  function tripUrl(id){return location.origin+location.pathname+'#trip/'+encodeURIComponent(id)}
  async function saveDraftToCloud(){
    if(!sessionUser||!window.planner?.draft)return null;const client=supabaseClient();if(!client)return null;
    const d=window.planner.draft,p=d.plannerProfile||{},id=window.planner.currentTripId||tripId();window.planner.currentTripId=id;
    const row={id,user_id:sessionUser.id,name:d.name||p.tripName||'טיול',destination:p.destination||'',start_date:p.start||null,end_date:p.end||null,draft:JSON.parse(JSON.stringify(d)),updated_at:new Date().toISOString()};
    const {error}=await client.from('tripcraft_trips').upsert(row,{onConflict:'id'});if(error){if(/does not exist|relation .*tripcraft_trips|42P01/i.test(String(error.message||'')))tableReady=false;console.warn('Cloud save failed',error);return null}
    const idx=cloudTrips.findIndex(x=>x.id===id);if(idx>=0)cloudTrips[idx]={...cloudTrips[idx],...row};else cloudTrips.unshift(row);tableReady=true;showTripLink(id);return id;
  }
  function showTripLink(id){
    const result=byId('plannerResult');if(!result||!id)return;let box=byId('tcV85ShareBox');if(!box){box=document.createElement('div');box.id='tcV85ShareBox';box.className='safe';box.style.margin='14px 0';result.querySelector('.planner-result-head')?.insertAdjacentElement('afterend',box)}
    const url=tripUrl(id);box.innerHTML=`<strong>קישור אישי לטיול</strong><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px"><input id="tcV85TripLink" value="${url.replace(/"/g,'&quot;')}" readonly dir="ltr" style="flex:1;min-width:240px;padding:11px;border:1px solid #cfdde6;border-radius:12px"><button class="btn secondary" id="tcV85CopyTrip" type="button">העתק קישור</button></div><small>הקישור פותח את אותו טיול לאחר אימות המשתמש וממלא את הנתונים לעריכה.</small>`;
    byId('tcV85CopyTrip').onclick=async()=>{try{await navigator.clipboard.writeText(url);byId('tcV85CopyTrip').textContent='הועתק ✓';setTimeout(()=>byId('tcV85CopyTrip').textContent='העתק קישור',1200)}catch(e){byId('tcV85TripLink').select();document.execCommand('copy')}};
  }
  function unlockPlannerResult(){
    document.querySelectorAll('.preview-locked').forEach(x=>x.classList.remove('preview-locked'));document.querySelectorAll('.preview-lock-banner').forEach(x=>x.remove());
    const meta=byId('plannerResultMeta');if(meta&&window.planner?.draft){const t=window.planner.draft;meta.textContent=`${t.days.length} ימים · ${t.plannerProfile?.people||''} נוסעים · ${t.plannerProfile?.group||''} · הטיול המלא פתוח בפיילוט`}
    const save=byId('plannerSaveTrip');if(save){save.textContent='העתק קישור לטיול';save.onclick=async()=>{const id=window.planner?.currentTripId||await saveDraftToCloud();if(id)showTripLink(id);else alert('כדי לשמור קישור קבוע יש להשלים את טבלת הטיולים ב-Supabase.')}}
  }
  function prefillPlanner(draft){
    const p=draft?.plannerProfile||{};const set=(id,v)=>{const el=byId(id);if(el&&v!==undefined&&v!==null)el.value=v};
    set('plTripName',p.tripName||draft?.name||'');set('plDestination',p.destination||'');set('plArrivalAirport',p.arrivalAirport||'');set('plDepartureAirport',p.departureAirport||'');set('plStart',p.start||'');set('plEnd',p.end||'');set('plGroup',p.group||'couple');set('plPace',p.pace||'balanced');set('plWalk',p.walk||'');set('plDrive',p.drive||'');set('plMust',p.must||'');set('plFree',p.free||'');set('plExistingLodging',p.existingLodging||'');
    const check=(selector,vals)=>{const s=new Set(vals||[]);document.querySelectorAll(selector).forEach(x=>x.checked=s.has(x.value))};check('#countryChoices input',p.countries);check('#transportChoices input',p.transports);check('#interestChoices input',p.interests);check('#tripPriorityChoices input',p.priorities);check('#avoidChoices input',String(p.avoid||'').split(',').map(x=>x.trim()).filter(Boolean));
    try{const bands=p.ageBands||{};document.querySelectorAll('#travelerBands .traveler-band').forEach(card=>{const out=card.querySelector('output');if(out)out.textContent=Number(bands[card.dataset.band]||0)});window.syncTravelerBands?.()}catch(e){}
  }
  async function openCloudTrip(id){
    if(!loggedIn()){goLogin('#trip/'+encodeURIComponent(id));return}
    if(!cloudTripsReady)await loadCloudTrips();const rec=cloudTrips.find(x=>x.id===id);if(!rec){alert(tableReady?'הטיול לא נמצא בחשבון הזה.':'טבלת הטיולים בענן עדיין לא הוגדרה.');location.hash='#account';return}
    window.planner.draft=JSON.parse(JSON.stringify(rec.draft));window.planner.currentTripId=id;prefillPlanner(window.planner.draft);location.hash='#planner';setTimeout(()=>{window.renderPlannerDraft?.();unlockPlannerResult();showTripLink(id);byId('plannerResult')?.scrollIntoView({behavior:'smooth',block:'start'})},120)
  }
  function renderCloudAccount(){
    const box=byId('tcAccountBody');if(!box)return;if(!sessionUser){box.innerHTML='<div class="safe">כדי לראות את הטיולים יש להיכנס עם אימייל ו-OTP.</div>';return}
    const u=userToCustomer(sessionUser),loading=!cloudTripsReady?'<div class="safe">טוען את הטיולים שלך...</div>':'';
    const tableWarn=!tableReady?'<div class="warn">שמירת טיולים בענן עדיין לא הופעלה. יש להריץ פעם אחת את הקובץ supabase-setup.sql ב-Supabase.</div>':'';
    const list=cloudTrips.length?cloudTrips.map(p=>`<div class="safe" style="margin-bottom:12px"><h3 style="margin:0 0 8px">${window.esc?window.esc(p.name||p.id):p.name||p.id}</h3><div><b>יעד:</b> ${window.esc?window.esc(p.destination||'—'):p.destination||'—'}</div><div><b>תאריכים:</b> ${p.start_date||'—'} – ${p.end_date||'—'}</div><div style="margin-top:8px"><b>קישור אישי:</b> <span dir="ltr">${tripUrl(p.id)}</span></div><div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn secondary" type="button" data-open-trip="${p.id}">פתח ועדכן טיול</button><button class="btn soft" type="button" data-copy-trip="${p.id}">העתק קישור</button></div></div>`).join(''):'<div class="warn">עדיין אין טיולים בחשבון. אפשר לבנות טיול חדש.</div>';
    box.innerHTML=`<div class="account-card"><h3>${u.firstName||''} ${u.lastName||''}</h3><p>${u.email}${u.phone?' · '+u.phone:''}</p><button class="btn soft" id="tcV85Logout">התנתק</button></div><h3 style="margin-top:24px">הטיולים שלי</h3>${tableWarn}${loading}${list}`;
    byId('tcV85Logout').onclick=async()=>{await supabaseClient()?.auth.signOut();sessionUser=null;writeLocalCustomer(null);location.hash='#home'};
    box.querySelectorAll('[data-open-trip]').forEach(b=>b.onclick=()=>openCloudTrip(b.dataset.openTrip));box.querySelectorAll('[data-copy-trip]').forEach(b=>b.onclick=()=>navigator.clipboard?.writeText(tripUrl(b.dataset.copyTrip)));
  }
  function handleCurrentRoute(){
    const raw=(location.hash||'#home').replace(/^#/,'');
    if(raw.startsWith('trip/')){const id=decodeURIComponent(raw.slice(5));if(!loggedIn()){goLogin('#trip/'+encodeURIComponent(id));return}openCloudTrip(id);return}
    const page=raw.split('?')[0]||'home';if(PROTECTED.has(page)&&!loggedIn()){goLogin('#'+page);return}if(page==='account')renderCloudAccount();
  }
  function installRouteGate(){
    document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const href=a.getAttribute('href'),page=pageFromHash(href);if((page==='trip'||PROTECTED.has(page))&&!loggedIn()){e.preventDefault();e.stopImmediatePropagation();goLogin(href);return}if(page==='planner'&&loggedIn()){window.planner.currentTripId=null}},true);
    window.addEventListener('hashchange',()=>setTimeout(handleCurrentRoute,0));
  }
  function wrapPlanner(){
    if(typeof window.renderPlannerDraft==='function'){const base=window.renderPlannerDraft;window.renderPlannerDraft=function(){const r=base.apply(this,arguments);unlockPlannerResult();if(window.planner?.currentTripId)showTripLink(window.planner.currentTripId);return r};try{renderPlannerDraft=window.renderPlannerDraft}catch(e){}}
    if(typeof window.buildPlannerDraft==='function'){const baseBuild=window.buildPlannerDraft;window.buildPlannerDraft=async function(){const r=await baseBuild.apply(this,arguments);unlockPlannerResult();await saveDraftToCloud();return r};try{buildPlannerDraft=window.buildPlannerDraft}catch(e){}}
    if(typeof window.tcLockImportPreview==='function'){window.tcLockImportPreview=function(){};try{tcLockImportPreview=window.tcLockImportPreview}catch(e){}}
    const result=byId('plannerResult');if(result){let t=null;new MutationObserver(()=>{if(!window.planner?.currentTripId||!sessionUser)return;clearTimeout(t);t=setTimeout(()=>saveDraftToCloud(),1000)}).observe(result,{childList:true,subtree:true,characterData:true})}
  }
  async function init(){
    installAuthUI();installRouteGate();wrapPlanner();
    await syncSession();
    window.tcRenderAccount=renderCloudAccount;try{tcRenderAccount=renderCloudAccount}catch(e){}
    window.tcOpenPurchasedTrip=openCloudTrip;try{tcOpenPurchasedTrip=openCloudTrip}catch(e){}
    handleCurrentRoute();
    document.documentElement.dataset.tripcraftVersion=V;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
