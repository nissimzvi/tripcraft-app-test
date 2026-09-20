/* TripCraft V90 auth + cloud trips flow.
   Uses public Supabase client configuration only. */
(() => {
  'use strict';
  const V='V101';
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
  async function tcAuthRequest(endpoint,payload){
    const c=cfg();
    if(!c.supabaseUrl||!c.supabaseAnonKey)throw new Error('חסרה הגדרת Supabase');
    const base=String(c.supabaseUrl).replace(/\/$/,'');
    const url=base+'/auth/v1/'+endpoint;
    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(),15000);
    try{
      const res=await fetch(url,{method:'POST',mode:'cors',cache:'no-store',credentials:'omit',signal:ctl.signal,headers:{'Content-Type':'application/json','apikey':c.supabaseAnonKey,'X-Client-Info':'tripcraft-v101'},body:JSON.stringify(payload||{})});
      const text=await res.text();
      let data={};
      try{data=text?JSON.parse(text):{}}catch(_){data={message:text}}
      if(!res.ok){const msg=data?.msg||data?.message||data?.error_description||data?.error||('HTTP '+res.status);const er=new Error(msg);er.status=res.status;er.details=data;throw er}
      return data;
    }catch(err){
      if(err?.name==='AbortError')throw new Error('פג זמן החיבור ל-Supabase לאחר 15 שניות');
      if(err instanceof TypeError)throw new Error('כשל רשת מול Supabase ('+url+'): '+(err.message||'Load failed'));
      throw err;
    }finally{clearTimeout(timer)}
  }
  function tcExplainAuthError(err){
    const m=String(err?.message||err||'שגיאה לא ידועה');
    if(/Load failed|Failed to fetch|NetworkError|כשל רשת/i.test(m))return m+' — בדקו שה-Project URL ב-Supabase נכון ושהאתר יכול להגיע אליו.';
    if(/Error sending confirmation email|confirmation email|email rate limit|smtp/i.test(m))return 'Supabase לא הצליח לשלוח את מייל האימות. יש לבדוק Authentication → Email/SMTP → Logs בפרויקט Supabase.';
    return m;
  }
  function localCustomer(){try{return JSON.parse(localStorage.getItem('tc_v433_customer')||'null')}catch(e){return null}}
  function writeLocalCustomer(u){if(u)localStorage.setItem('tc_v433_customer',JSON.stringify(u));else localStorage.removeItem('tc_v433_customer')}
  function userToCustomer(user){
    const m=user?.user_metadata||{},p=m.tripcraft_profile||{};
    return {id:user?.id||'',email:user?.email||'',firstName:p.firstName||m.first_name||'',lastName:p.lastName||m.last_name||'',phone:p.phone||m.phone||'',method:'otp',isAdmin:user?.app_metadata?.role==='admin'};
  }
  function loggedIn(){return !!sessionUser}
  function pageFromHash(hash=location.hash){const raw=(hash||'#home').replace(/^#/,'');return raw.startsWith('trip/')?'trip':(raw.split('?')[0]||'home')}
  function authReturn(hash){sessionStorage.setItem('tc_v91_return_after_auth',hash||'#account')}
  function goLogin(hash){authReturn(hash);sessionStorage.removeItem('tc_build_after_login');sessionStorage.removeItem('tc_return_after_login');location.hash='#login';setTimeout(()=>byId('tcAuthEmailPrimary')?.focus(),120)}

  function resetPlannerForNewTrip(){
    localStorage.removeItem('tripcraft_planner_draft_v57');
    const root=byId('planner');
    root?.querySelectorAll('input').forEach(el=>{if(el.type==='checkbox'||el.type==='radio')el.checked=el.defaultChecked;else el.value=el.defaultValue||'';});
    root?.querySelectorAll('select').forEach(el=>{const i=[...el.options].findIndex(o=>o.defaultSelected);el.selectedIndex=i>=0?i:0;});
    root?.querySelectorAll('textarea').forEach(el=>el.value=el.defaultValue||'');
    root?.querySelectorAll('#travelerBands .traveler-band').forEach(row=>{const out=row.querySelector('output');if(out)out.textContent=row.dataset.band==='adult'?'2':'0'});
    if(window.planner){window.planner.draft=null;window.planner.currentTripId=null;window.planner.step=1;}
    byId('plannerResult')?.classList.remove('show');
    if(byId('plannerDraftDays'))byId('plannerDraftDays').innerHTML='';
    if(byId('plannerShareBox'))byId('plannerShareBox').style.display='none';
    try{window.syncTravelerBands?.();window.plannerShowStep?.(1);}catch(_){ }
    document.querySelectorAll('#planner input,#planner select,#planner textarea').forEach(el=>el.dispatchEvent(new Event('change',{bubbles:true})));
  }
  function startNewTrip(){resetPlannerForNewTrip();location.hash='#planner';setTimeout(()=>byId('plTripName')?.focus(),120)}

  function installAuthUI(){
    const entry=byId('tcAuthEntry'); if(!entry)return;
    entry.innerHTML=`
      <div class="page-visual login-visual"><div><h2>כניסה והרשמה</h2><p>מזינים אימייל פעם אחת. המערכת בודקת אם החשבון קיים ושולחת קוד OTP למייל.</p></div></div>
      <div class="safe pilot-feedback-note"><strong>פיילוט TripCraft:</strong> הפרטים נדרשים כדי לשמור את הטיול שלכם, לאפשר עדכונים ולקבל פידבקים ומשוב שיעזרו לנו לשפר את המערכת. כל השדות חובה למעט טלפון.</div>
      <div class="auth-grid" style="grid-template-columns:minmax(0,720px);justify-content:center">
        <div class="auth-card" id="tcV90EmailCard">
          <h3>כניסה ל-TripCraft</h3>
          <div class="field"><label>אימייל <span class="req-star">*</span></label><input id="tcAuthEmailPrimary" type="email" autocomplete="email" inputmode="email" placeholder="name@example.com"></div>
          <div id="tcAuthLookupStatus" class="statusbar" aria-live="polite"></div>
          <button id="tcAuthContinue" class="btn secondary" type="button">בדוק והמשך</button>
        </div>
      </div>`;
    let reg=byId('tcV90RegisterStep');
    if(!reg){
      reg=document.createElement('div');reg.id='tcV90RegisterStep';reg.hidden=true;
      reg.innerHTML=`<div class="page-visual login-visual"><div><h2>הרשמה חדשה</h2><p>האימייל עדיין לא רשום. נשלים כמה פרטים קצרים ונמשיך לאימות.</p></div></div>
        <div class="auth-grid" style="grid-template-columns:minmax(0,720px);justify-content:center"><div class="auth-card" style="width:100%">
          <button id="tcV90RegisterBack" class="otp-back-btn" type="button">← חזור לשינוי האימייל</button>
          <div class="safe" style="margin:12px 0 18px"><strong>פתיחת חשבון TripCraft</strong><br>הפרטים ישמשו לשמירת הטיולים שלכם ולכניסה חוזרת לחשבון.</div>
          <div class="field"><label>אימייל</label><input id="tcV85EmailMirror" type="email" readonly dir="ltr" style="font-weight:800;text-align:center"></div>
          <div class="formgrid" style="margin-top:14px">
            <div class="field"><label>שם פרטי <span class="req-star">*</span></label><input id="tcV85FirstName" autocomplete="given-name"></div>
            <div class="field"><label>שם משפחה <span class="req-star">*</span></label><input id="tcV85LastName" autocomplete="family-name"></div>
            <div class="field" style="grid-column:1/-1"><label>טלפון (לא חובה)</label><input id="tcV85Phone" inputmode="tel" autocomplete="tel"></div>
          </div>
          <button id="tcV85CreateAndSend" class="btn secondary" type="button" style="width:100%;margin-top:10px">הירשם והמשך לאימות</button>
        </div></div>`;
      entry.insertAdjacentElement('afterend',reg);
    }
    const otp=byId('tcOtpStep');
    if(otp){
      const demo=byId('tcOtpDemo'); if(demo)demo.style.display='none';
      const codeInput=byId('tcOtpCode'); if(codeInput){codeInput.maxLength=6;codeInput.placeholder='000000';codeInput.setAttribute('aria-label','קוד אימות בן 6 ספרות');codeInput.setAttribute('dir','ltr');codeInput.style.textAlign='center';}
      const subtitle=otp.querySelector('.otp-subtitle'); if(subtitle)subtitle.textContent='הזינו את קוד האימות שנשלח אל:';
      byId('tcOtpBack')?.addEventListener('click',v85BackFromOtp,true);
      byId('tcVerifyOtp')?.addEventListener('click',v85VerifyOtp,true);
      byId('tcResendOtp')?.addEventListener('click',v85ResendOtp,true);
      byId('tcOtpCode')?.addEventListener('input',e=>{const clean=String(e.target.value||'').replace(/\D/g,'').slice(0,6);if(e.target.value!==clean)e.target.value=clean;byId('tcOtpStatus').textContent='';});
      byId('tcOtpCode')?.addEventListener('paste',e=>{
        e.preventDefault();
        const raw=(e.clipboardData||window.clipboardData)?.getData('text')||'';
        const clean=String(raw).replace(/\D/g,'').slice(0,6);
        e.currentTarget.value=clean;
        byId('tcOtpStatus').textContent=clean.length===6?'':'יש להדביק קוד בן 6 ספרות.';
        setTimeout(()=>e.currentTarget.setSelectionRange?.(clean.length,clean.length),0);
      });
      byId('tcOtpCode')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();v85VerifyOtp(e)}});
    }
    byId('tcAuthContinue')?.addEventListener('click',v85CheckEmail);
    byId('tcV85CreateAndSend')?.addEventListener('click',v85CreateAndSend);
    byId('tcV90RegisterBack')?.addEventListener('click',()=>{byId('tcV90RegisterStep').hidden=true;byId('tcAuthEntry').hidden=false;setTimeout(()=>byId('tcAuthEmailPrimary')?.focus(),100)});
    byId('tcAuthEmailPrimary')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();v85CheckEmail()}});
  }

  function setLookup(msg,kind=''){
    const el=byId('tcAuthLookupStatus'); if(!el)return;
    el.className='statusbar'+(kind?' '+kind:''); el.textContent=msg||'';
  }
  function authBusy(on,label){const b=byId('tcAuthContinue');if(!b)return;b.disabled=!!on;b.textContent=on?(label||'בודק...'):'בדוק והמשך'}
  function openOtp(ctx){
    authCtx=ctx;
    byId('tcAuthEntry').hidden=true; if(byId('tcV90RegisterStep'))byId('tcV90RegisterStep').hidden=true; byId('tcOtpStep').hidden=false;
    byId('tcOtpEmailDisplay').textContent=ctx.email;
    byId('tcOtpHint').textContent=ctx.isNew?'ההרשמה נפתחה. קוד אימות נשלח למייל.':'המשתמש קיים. קוד אימות נשלח למייל.';
    byId('tcOtpCode').value=''; byId('tcOtpStatus').textContent='';
    startResendTimer(60);
    window.scrollTo({top:byId('login')?.offsetTop||0,behavior:'smooth'});
    setTimeout(()=>{byId('tcOtpCode')?.focus({preventScroll:true});byId('tcOtpCode')?.select?.()},220);
  }
  function v85BackFromOtp(e){if(e){e.preventDefault();e.stopImmediatePropagation()} clearInterval(resendTimer);byId('tcOtpStep').hidden=true;if(byId('tcV90RegisterStep'))byId('tcV90RegisterStep').hidden=true;byId('tcAuthEntry').hidden=false;setTimeout(()=>byId('tcAuthEmailPrimary')?.focus(),120)}
  function startResendTimer(sec){
    clearInterval(resendTimer);resendLeft=sec;const b=byId('tcResendOtp');if(!b)return;
    const paint=()=>{if(resendLeft>0){b.disabled=true;b.textContent=`שלח קוד חדש בעוד ${resendLeft} שנ׳`}else{b.disabled=false;b.textContent='שלח קוד חדש'}};paint();
    resendTimer=setInterval(()=>{resendLeft--;paint();if(resendLeft<=0)clearInterval(resendTimer)},1000);
  }
  async function v85CheckEmail(){
    const email=cleanEmail(byId('tcAuthEmailPrimary')?.value); if(!validEmail(email)){alert('נא להזין כתובת אימייל תקינה.');byId('tcAuthEmailPrimary')?.focus();return}
    const client=supabaseClient(); if(!client){setLookup('שירות האימות לא נטען. יש לרענן את הדף ולנסות שוב.','err');return}
    authBusy(true,'בודק משתמש...');setLookup('בודק אם האימייל כבר רשום...');
    try{
      await tcAuthRequest('otp',{email,create_user:false});
      setLookup('המשתמש קיים. קוד נשלח למייל.','ok');openOtp({email,isNew:false,profile:null});return;
    }catch(err){
      const msg=String(err?.message||'');
      if(/Signups not allowed for otp|Signups not allowed|User not found|not found|signup/i.test(msg)){
        setLookup('האימייל אינו רשום עדיין. עוברים להרשמה קצרה.','ok');
        byId('tcV85EmailMirror').value=email;byId('tcAuthEntry').hidden=true;byId('tcV90RegisterStep').hidden=false;window.scrollTo({top:byId('login')?.offsetTop||0,behavior:'smooth'});setTimeout(()=>byId('tcV85FirstName')?.focus({preventScroll:true}),180);return;
      }
      setLookup('לא ניתן לבדוק את האימייל: '+tcExplainAuthError(err),'err');console.error(err)
    }finally{authBusy(false)}
  }
  async function v85CreateAndSend(){
    const email=cleanEmail(byId('tcAuthEmailPrimary')?.value),first=(byId('tcV85FirstName')?.value||'').trim(),last=(byId('tcV85LastName')?.value||'').trim(),phone=(byId('tcV85Phone')?.value||'').trim();
    if(!first||!last||!validEmail(email)){alert('שם פרטי, שם משפחה ואימייל הם שדות חובה.');return}
    const client=supabaseClient(); if(!client){alert('שירות האימות לא זמין.');return}
    const btn=byId('tcV85CreateAndSend');btn.disabled=true;btn.textContent='שולח קוד...';
    try{
      const profile={firstName:first,lastName:last,phone};
      await tcAuthRequest('otp',{email,create_user:true,data:{tripcraft_profile:profile,first_name:first,last_name:last,phone}});
      openOtp({email,isNew:true,profile});
    }catch(err){alert('שליחת הקוד נכשלה: '+tcExplainAuthError(err));console.error(err)}finally{btn.disabled=false;btn.textContent='הרשם ושלח קוד'}
  }
  async function v85ResendOtp(e){if(e){e.preventDefault();e.stopImmediatePropagation()} if(!authCtx||resendLeft>0)return;const b=byId('tcResendOtp');b.disabled=true;b.textContent='שולח...';try{const payload={email:authCtx.email,create_user:!!authCtx.isNew};if(authCtx.isNew&&authCtx.profile)payload.data={tripcraft_profile:authCtx.profile,first_name:authCtx.profile.firstName,last_name:authCtx.profile.lastName,phone:authCtx.profile.phone||''};await tcAuthRequest('otp',payload);byId('tcOtpStatus').textContent='קוד חדש נשלח.';startResendTimer(60);setTimeout(()=>byId('tcOtpCode')?.focus(),80)}catch(err){byId('tcOtpStatus').textContent='שליחה חוזרת נכשלה: '+tcExplainAuthError(err);b.disabled=false;b.textContent='שלח קוד חדש'}}
  function navigateAfterAuth(ret){
    const target=ret||'#account';
    const otp=byId('tcOtpStep'), entry=byId('tcAuthEntry'), reg=byId('tcV90RegisterStep');
    if(otp)otp.hidden=true; if(entry)entry.hidden=false; if(reg)reg.hidden=true;
    try{history.replaceState(null,'',target);}catch(_){location.hash=target;}
    // Force both the legacy page renderer and the current route gate to refresh even if the hash is unchanged.
    try{window.dispatchEvent(new HashChangeEvent('hashchange'));}catch(_){window.dispatchEvent(new Event('hashchange'));}
    setTimeout(()=>{
      const page=(target.replace(/^#/,'').split('?')[0]||'account');
      const app=byId('mainApp'); if(app){app.classList.add('page-focus');app.dataset.page=page;}
      window.tcRouteRefresh?.(page);
      window.scrollTo({top:0,behavior:'instant'});
    },30);
  }

  async function v85VerifyOtp(e){
    if(e){e.preventDefault();e.stopImmediatePropagation()}
    const token=String(byId('tcOtpCode')?.value||'').replace(/\D/g,'');if(token.length!==6){byId('tcOtpStatus').textContent=`קוד האימות חייב להכיל 6 ספרות. כרגע הוזנו ${token.length}.`;byId('tcOtpCode')?.focus();return}
    if(!authCtx){byId('tcOtpStatus').textContent='חסרים פרטי האימות. חזרו למסך הקודם.';return}
    const b=byId('tcVerifyOtp');b.disabled=true;b.textContent='מאמת...';
    try{
      const data=await tcAuthRequest('verify',{email:authCtx.email,token,type:'email'});
      const user=data?.user;if(!user)throw new Error('האימות הצליח אך לא התקבל משתמש מ-Supabase');
      sessionUser=user;writeLocalCustomer(userToCustomer(user));
      const client=supabaseClient();if(client&&data?.access_token&&data?.refresh_token){try{await client.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token})}catch(_){}}
      clearInterval(resendTimer);byId('tcOtpStatus').textContent='האימות הצליח.';
      const ret=sessionStorage.getItem('tc_v91_return_after_auth')||'#account';sessionStorage.removeItem('tc_v91_return_after_auth');
      await loadCloudTrips();
      const directTrip=String(ret).startsWith('#trip/');
      if(directTrip)navigateAfterAuth(ret);else if(cloudTrips.length)navigateAfterAuth('#account');else{resetPlannerForNewTrip();navigateAfterAuth('#planner');}
      setTimeout(()=>{window.tcRenderAccount?.();window.tcRenderHeaderUser?.()},80);
    }catch(err){byId('tcOtpStatus').textContent='קוד שגוי או שפג תוקפו: '+tcExplainAuthError(err);console.error(err)}finally{b.disabled=false;b.textContent='אמת והמשך'}
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
    byId('tcV85CopyTrip').onclick=async()=>{try{await navigator.clipboard.writeText(url);byId('tcV85CopyTrip').textContent='הקישור הועתק ✓';setTimeout(()=>byId('tcV85CopyTrip').textContent='העתק קישור',1500)}catch(e){byId('tcV85TripLink').select();document.execCommand('copy');byId('tcV85CopyTrip').textContent='הקישור הועתק ✓'}};
  }
  function unlockPlannerResult(){
    document.querySelectorAll('.preview-locked').forEach(x=>x.classList.remove('preview-locked'));document.querySelectorAll('.preview-lock-banner').forEach(x=>x.remove());
    const meta=byId('plannerResultMeta');if(meta&&window.planner?.draft){const t=window.planner.draft;meta.textContent=`${t.days.length} ימים · ${t.plannerProfile?.people||''} נוסעים · ${t.plannerProfile?.group||''} · הטיול המלא פתוח בפיילוט`}
    const save=byId('plannerSaveTrip');if(save){save.textContent='העתק קישור לטיול';save.onclick=async()=>{const id=window.planner?.currentTripId||await saveDraftToCloud();if(id)showTripLink(id);else alert('כדי לשמור קישור קבוע יש להשלים את טבלת הטיולים ב-Supabase.')}}
  }
  function prefillPlanner(draft){
    resetPlannerForNewTrip();
    const p=draft?.plannerProfile||{};const set=(id,v)=>{const el=byId(id);if(el&&v!==undefined&&v!==null){el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));}};
    const setDate=(id,v)=>{set(id,v||'');if(!v)return;const [y,m,d]=String(v).split('-');set(id+'Year',y);set(id+'Month',m);set(id+'Day',d);};
    set('plTripName',p.tripName||draft?.name||'');set('plDestination',p.destination||'');set('plArrivalAirport',p.arrivalAirport||'');set('plDepartureAirport',p.departureAirport||'');setDate('plStart',p.start);setDate('plEnd',p.end);set('plPeople',p.people||2);set('plChildren',p.children||0);set('plGroup',p.group||'couple');set('plPace',p.pace||'balanced');set('plWalk',p.walk||'');set('plDrive',p.drive||'');set('plDayLength',p.dayLength||'full');set('plMust',p.must||'');set('plFree',p.free||'');set('plExistingLodging',p.existingLodging||'');set('plLodgingStyle',p.lodgingStyle||'smart');set('plHotelStars',p.hotelStars||'any');set('plLodgingPriority',p.lodgingPriority||'balanced');set('plLodgingDetour',p.lodgingDetour||'10');
    const check=(selector,vals)=>{const s=new Set(vals||[]);document.querySelectorAll(selector).forEach(x=>x.checked=s.has(x.value))};check('#countryChoices input',p.countries);check('#transportChoices input',p.transports);check('#interestChoices input',p.interests);check('#tripPriorityChoices input',p.priorities);check('#avoidChoices input',String(p.avoid||'').split(',').map(x=>x.trim()).filter(Boolean));check('#lodgingTypeChoices input',p.lodgingTypes);check('#lodgingFilterChoices input',p.lodgingFilters);
    document.querySelectorAll('input[name="plGroupChoice"]').forEach(x=>x.checked=x.value===(p.group||'couple'));
    document.querySelectorAll('input[name="plLodgingMode"]').forEach(x=>x.checked=x.value===(p.lodgingMode||'recommend'));
    document.querySelectorAll('input[name="plLodgingBudget"]').forEach(x=>x.checked=x.value===(p.lodgingBudget||'mid'));
    try{const bands=p.ageBands||{};document.querySelectorAll('#travelerBands .traveler-band').forEach(card=>{const out=card.querySelector('output');if(out)out.textContent=Number(bands[card.dataset.band]||0)});window.syncTravelerBands?.()}catch(e){}
  }
  async function openCloudTrip(id){
    if(!loggedIn()){goLogin('#trip/'+encodeURIComponent(id));return}
    if(!cloudTripsReady)await loadCloudTrips();const rec=cloudTrips.find(x=>x.id===id);if(!rec){alert(tableReady?'הטיול לא נמצא בחשבון הזה.':'טבלת הטיולים בענן עדיין לא הוגדרה.');location.hash='#account';return}
    const draft=JSON.parse(JSON.stringify(rec.draft));prefillPlanner(draft);window.planner.draft=draft;window.planner.currentTripId=id;location.hash='#planner';setTimeout(()=>{window.renderPlannerDraft?.();unlockPlannerResult();showTripLink(id);byId('plannerResult')?.scrollIntoView({behavior:'smooth',block:'start'})},120)
  }
  function renderCloudAccount(){
    const box=byId('tcAccountBody');if(!box)return;if(!sessionUser){box.innerHTML='<div class="safe">כדי לראות את הטיולים יש להיכנס עם אימייל ו-OTP.</div>';return}
    const u=userToCustomer(sessionUser),loading=!cloudTripsReady?'<div class="safe">טוען את הטיולים שלך...</div>':'';
    const tableWarn=!tableReady?'<div class="warn">שמירת טיולים בענן עדיין לא הופעלה. יש להריץ פעם אחת את הקובץ supabase-setup.sql ב-Supabase.</div>':'';
    const list=cloudTrips.length?cloudTrips.map(p=>`<div class="safe" style="margin-bottom:12px"><h3 style="margin:0 0 8px">${window.esc?window.esc(p.name||p.id):p.name||p.id}</h3><div><b>יעד:</b> ${window.esc?window.esc(p.destination||'—'):p.destination||'—'}</div><div><b>תאריכים:</b> ${p.start_date||'—'} – ${p.end_date||'—'}</div><div style="margin-top:8px"><b>קישור אישי:</b> <span dir="ltr">${tripUrl(p.id)}</span></div><div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn secondary" type="button" data-open-trip="${p.id}">פתח ועדכן טיול</button><button class="btn soft" type="button" data-copy-trip="${p.id}">העתק קישור</button></div></div>`).join(''):'<div class="warn">עדיין אין טיולים בחשבון. אפשר לבנות טיול חדש.</div>';
    const safe=window.esc||((value)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])));
    box.innerHTML=`<div class="account-card"><h3>${safe(u.firstName||'')} ${safe(u.lastName||'')}</h3><p>${safe(u.email||'')}${u.phone?' · '+safe(u.phone):''}</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn planner-color" id="tcV99NewTrip" type="button">בניית טיול חדש</button><button class="btn soft" id="tcV85Logout">התנתק</button></div></div><h3 style="margin-top:24px">הטיולים שלי</h3><p>בחרו טיול קיים כדי לטעון את כל הנתונים שהוזנו, או התחילו טיול חדש עם שאלון נקי.</p>${tableWarn}${loading}${list}`;
    byId('tcV99NewTrip').onclick=startNewTrip;
    byId('tcV85Logout').onclick=async()=>{await supabaseClient()?.auth.signOut();sessionUser=null;writeLocalCustomer(null);location.hash='#home'};
    box.querySelectorAll('[data-open-trip]').forEach(b=>b.onclick=()=>openCloudTrip(b.dataset.openTrip));box.querySelectorAll('[data-copy-trip]').forEach(b=>b.onclick=()=>navigator.clipboard?.writeText(tripUrl(b.dataset.copyTrip)));
  }
  function handleCurrentRoute(){
    const raw=(location.hash||'#home').replace(/^#/,'');
    if(raw.startsWith('trip/')){const id=decodeURIComponent(raw.slice(5));if(!loggedIn()){goLogin('#trip/'+encodeURIComponent(id));return}openCloudTrip(id);return}
    const page=raw.split('?')[0]||'home';if(PROTECTED.has(page)&&!loggedIn()){goLogin('#'+page);return}if(page==='account')renderCloudAccount();
  }
  function installRouteGate(){
    document.addEventListener('click',e=>{
      const a=e.target.closest('a[href^="#"]');
      if(!a)return;
      const href=a.getAttribute('href'),page=pageFromHash(href),current=pageFromHash(location.hash||'#home');
      const protectedTarget=(page==='trip'||PROTECTED.has(page));
      // V94: every protected action launched from the Home page must pass through email/OTP,
      // even when Supabase still has a persisted session from an earlier test.
      if(protectedTarget && (current==='home' || !loggedIn())){
        e.preventDefault();e.stopImmediatePropagation();goLogin(href);return;
      }
      if(page==='planner'&&loggedIn()){e.preventDefault();e.stopImmediatePropagation();if(cloudTrips.length){location.hash='#account';setTimeout(renderCloudAccount,0);}else startNewTrip();}
    },true);
    window.addEventListener('hashchange',()=>setTimeout(handleCurrentRoute,0));
  }
  function wrapPlanner(){
    if(typeof window.renderPlannerDraft==='function'){const base=window.renderPlannerDraft;window.renderPlannerDraft=function(){const r=base.apply(this,arguments);unlockPlannerResult();if(window.planner?.currentTripId)showTripLink(window.planner.currentTripId);return r};try{renderPlannerDraft=window.renderPlannerDraft}catch(e){}}
    if(typeof window.buildPlannerDraft==='function'){const baseBuild=window.buildPlannerDraft;window.buildPlannerDraft=async function(){const r=await baseBuild.apply(this,arguments);unlockPlannerResult();Promise.resolve(saveDraftToCloud()).catch(e=>console.warn('Background cloud save failed',e));return r};try{buildPlannerDraft=window.buildPlannerDraft}catch(e){}}
    if(typeof window.tcLockImportPreview==='function'){window.tcLockImportPreview=function(){};try{tcLockImportPreview=window.tcLockImportPreview}catch(e){}}
    const result=byId('plannerResult');if(result){let t=null;new MutationObserver(()=>{if(!window.planner?.currentTripId||!sessionUser)return;clearTimeout(t);t=setTimeout(()=>saveDraftToCloud(),1000)}).observe(result,{childList:true,subtree:true,characterData:true})}
  }
  async function init(){
    installAuthUI();installRouteGate();wrapPlanner();
    await syncSession();
    window.tcRenderAccount=renderCloudAccount;try{tcRenderAccount=renderCloudAccount}catch(e){}
    window.tcOpenPurchasedTrip=openCloudTrip;try{tcOpenPurchasedTrip=openCloudTrip}catch(e){}
    window.tcStartNewTrip=startNewTrip;
    handleCurrentRoute();
    document.documentElement.dataset.tripcraftVersion=V;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
