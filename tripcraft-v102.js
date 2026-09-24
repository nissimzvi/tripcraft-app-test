/* TripCraft V102 - complete pilot itinerary, cloud persistence and editable trips. */
(() => {
  'use strict';

  const VERSION='V102';
  const TABLE='tripcraft_trips';
  const LOCAL_TRIPS='tc_v433_purchases';
  const DEMO_ACCESS_PERCENT=100;
  const FUTURE_PAID_PREVIEW_PERCENT=20;
  let client=null;
  let currentDay=-1;

  const $=id=>document.getElementById(id);
  const safe=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const config=()=>window.TRIPCRAFT_CONFIG||{};
  const deepCopy=value=>JSON.parse(JSON.stringify(value));
  function displayDate(value){
    const s=String(value||'').trim(),iso=s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/),local=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if(iso)return `${iso[3].padStart(2,'0')}/${iso[2].padStart(2,'0')}/${iso[1]}`;
    if(local)return `${local[1].padStart(2,'0')}/${local[2].padStart(2,'0')}/${local[3]}`;
    return s||'—';
  }

  function supabase(){
    if(client)return client;
    const c=config();
    if(!c.supabaseUrl||!c.supabaseAnonKey||!window.supabase?.createClient)return null;
    client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }

  function publicBase(){
    const configured=String(config().publicAppUrl||'').trim();
    if(configured)return configured.replace(/#.*$/,'').replace(/\/?$/,'/');
    if(location.protocol==='http:'||location.protocol==='https:')return location.href.replace(/#.*$/,'');
    return 'https://nissimzvi.github.io/tripcraft-app-test/';
  }
  function tripUrl(id){return publicBase()+'#trip/'+encodeURIComponent(id)}
  function newTripId(){return 'TC-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)).toUpperCase()}
  function isoDate(start,offset){const d=new Date(start+'T12:00:00');d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10)}
  function numberOfDays(start,end){const a=new Date(start+'T12:00:00'),b=new Date(end+'T12:00:00');return Math.max(1,Math.min(30,Math.round((b-a)/86400000)+1))}

  function ensureSeniorBand(){
    const root=$('travelerBands');
    if(!root||root.querySelector('[data-band="senior"]'))return;
    const node=document.createElement('div');
    node.className='traveler-band';node.dataset.band='senior';
    node.innerHTML='<div><strong>Senior</strong><small>65+</small></div><div class="band-counter"><button type="button" data-delta="-1">−</button><output>0</output><button type="button" data-delta="1">+</button></div>';
    root.insertBefore(node,root.querySelector('[data-band="dogs"]'));
    node.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
      const out=node.querySelector('output');out.textContent=Math.max(0,Math.min(20,(Number(out.textContent)||0)+Number(btn.dataset.delta||0)));
      window.syncTravelerBands?.();
    }));
  }

  function profile(){
    const p=typeof window.plannerData==='function'?window.plannerData():{};
    p.ageBands=p.ageBands||{};
    p.ages=[];
    const representative={adult:45,young:27,senior:70,teen:16,kid:8,baby:1};
    Object.entries(p.ageBands).forEach(([band,count])=>{if(representative[band]!==undefined)for(let i=0;i<Number(count||0);i++)p.ages.push(representative[band])});
    p.people=Object.entries(p.ageBands).filter(([k])=>k!=='dogs').reduce((sum,[,v])=>sum+Number(v||0),0)||Number(p.people||0);
    p.children=['teen','kid','baby'].reduce((sum,k)=>sum+Number(p.ageBands[k]||0),0);
    return p;
  }

  function stopCatalog(destination,must){
    const d=String(destination||'').toLowerCase();let list;
    if(/ישראל|israel|jerusalem|ירושלים/.test(d))list=['העיר העתיקה ירושלים','שוק מחנה יהודה','גן לאומי קיסריה','נמל תל אביב','יפו העתיקה','שמורת עין גדי','מצדה','כנרת'];
    else if(/טירול|tyrol|tirol|אוסטר/.test(d))list=['Innsbruck Old Town','Nordkette Innsbruck','Achensee','Seefeld in Tirol','Mittenwald','Ötztal','AQUA DOME Längenfeld','Mayrhofen'];
    else if(/בודפשט|budapest/.test(d))list=['Buda Castle','Fisherman’s Bastion Budapest','Hungarian Parliament Building','Danube Promenade Budapest','Great Market Hall Budapest','Heroes Square Budapest','Széchenyi Thermal Bath'];
    else if(/פראג|prague/.test(d))list=['Old Town Square Prague','Charles Bridge Prague','Prague Castle','Petrin Hill Prague','Vysehrad Prague','Wenceslas Square Prague','National Museum Prague'];
    else if(/יוון|greece|athens|אתונה/.test(d))list=['Acropolis Athens','Plaka Athens','Ancient Agora Athens','National Archaeological Museum Athens','Lake Vouliagmeni','Cape Sounion'];
    else if(/ניו יורק|new york/.test(d))list=['Times Square','Central Park','The Metropolitan Museum of Art','The High Line New York','Chelsea Market','Brooklyn Bridge','DUMBO Brooklyn'];
    else list=[`${destination} מרכז העיר`,`${destination} העיר העתיקה`,`${destination} שוק מקומי`,`${destination} תצפית`,`${destination} פארק מרכזי`,`${destination} מוזיאון`,`${destination} אזור טבע`];
    const required=String(must||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
    required.reverse().forEach(x=>{if(!list.some(y=>y.toLowerCase()===x.toLowerCase()))list.unshift(x)});
    return list;
  }

  function timeFor(index,pace){
    const relaxed=['09:30','11:30','13:30','15:30','17:30'];
    const regular=['09:00','10:45','12:30','14:30','16:30'];
    const active=['08:30','10:15','12:00','14:00','16:00','18:00'];
    const source=pace==='relaxed'?relaxed:(pace==='active'?active:regular);
    return source[Math.min(index,source.length-1)];
  }

  function pricingFor(place){
    const x=String(place||'').toLowerCase();
    if(/old town|עיר העתיקה|market|שוק|promenade|טיילת|bridge|גשר|park|פארק|תצפית|viewpoint|נמל|יפו/.test(x))return{adult:0,child:0,senior:0,status:'ללא כרטיס / חינם משוער'};
    if(/museum|מוזיאון/.test(x))return{adult:75,child:35,senior:55,status:'הערכה — יש לאמת מחיר עדכני'};
    if(/aqua|thermal|bath|ספא|מרחצ/.test(x))return{adult:150,child:105,senior:125,status:'הערכה — יש לאמת מחיר עדכני'};
    if(/castle|מצדה|קיסריה|acropolis|agora|טירה|גן לאומי/.test(x))return{adult:65,child:32,senior:45,status:'הערכה — יש לאמת מחיר עדכני'};
    return{adult:null,child:null,senior:null,status:'מחיר אינו זמין — נדרשת בדיקה'};
  }

  function travelMode(p,place){
    const text=(String(place||'')+' '+String(p.transport||'')+' '+(p.transports||[]).join(' ')).toLowerCase();
    if(/walking|הליכה|ברגל/.test(text))return'walking';
    return'car';
  }

  function makeStop(p,place,index,last=false){
    const mode=travelMode(p,place),cost=pricingFor(place);
    return{
      time:timeFor(index,p.pace),place,
      what:last?'סיום נעים של היום וחזרה מסודרת למקום הלינה.':`ביקור ב־${place}, היכרות עם המקום והנקודות המרכזיות בקצב שמתאים להרכב המטיילים.`,
      duration:last?'45 דקות':(index===2?'שעה וחצי':'שעה ורבע'),
      drive:last?'—':(mode==='walking'?'כ־15 דקות הליכה':'כ־25 דקות נסיעה'),
      travelMode:mode,pricing:cost,waze:place
    };
  }

  function rainDay(p,dayIndex,catalog){
    const indoor=[`${p.destination} מוזיאון מרכזי`,`${p.destination} שוק מקורה`,`${p.destination} מרכז מבקרים`];
    const stops=indoor.map((place,i)=>makeStop({...p,transport:'walking'},place,i));
    return{title:'חלופה ליום גשום באזור '+(catalog[dayIndex%catalog.length]||p.destination),stops};
  }

  function generateDraft(p){
    const count=numberOfDays(p.start,p.end),catalog=stopCatalog(p.destination,p.must),hasFlights=!!(p.arrivalAirport||p.departureAirport);
    const dailyStops=p.dayLength==='half'?2:(p.pace==='active'?5:4),days=[];
    for(let dayIndex=0;dayIndex<count;dayIndex++){
      const places=[];
      if(dayIndex===0&&hasFlights)places.push(p.arrivalAirport||p.destination);
      for(let j=0;j<dailyStops;j++)places.push(catalog[(dayIndex*dailyStops+j)%catalog.length]);
      if(dayIndex===count-1&&hasFlights)places.push(p.departureAirport||p.arrivalAirport);
      const unique=places.filter((x,i,a)=>x&&a.indexOf(x)===i);
      const stops=unique.map((place,i)=>makeStop(p,place,i,i===unique.length-1));
      const lodging=typeof window.chooseLodging==='function'?window.chooseLodging(p,dayIndex,count):'';
      days.push({date:isoDate(p.start,dayIndex),title:`יום ${dayIndex+1} – ${catalog[(dayIndex*dailyStops)%catalog.length]||p.destination}`,lodging,stops,rainAlternative:rainDay(p,dayIndex,catalog)});
    }
    return{
      name:p.tripName||p.destination,country:(p.countries||[]).join(', '),year:String(p.start||'').slice(0,4),sourceType:'planner',plannerProfile:deepCopy(p),
      generationMode:'demo-full',demoAccessPercent:DEMO_ACCESS_PERCENT,futurePaidPreviewPercent:FUTURE_PAID_PREVIEW_PERCENT,
      changeCount:0,maxChanges:10,days
    };
  }

  function counts(p){
    const b=p.ageBands||{};
    return{adults:Number(b.adult||0)+Number(b.young||0),children:Number(b.teen||0)+Number(b.kid||0)+Number(b.baby||0),seniors:Number(b.senior||0)};
  }
  function stopTotal(stop,p){
    const n=counts(p),c=stop.pricing||pricingFor(stop.place);
    if([c.adult,c.child,c.senior].some(x=>x===null||x===undefined))return null;
    return c.adult*n.adults+c.child*n.children+c.senior*n.seniors;
  }
  function dayTotal(day,p){const values=(day.stops||[]).map(s=>stopTotal(s,p)).filter(v=>v!==null);return values.length?values.reduce((a,b)=>a+b,0):null}

  function mapsRoute(stops){
    const pts=(stops||[]).map(s=>s.place).filter(Boolean);if(pts.length<2)return'#';
    const mode=(stops||[]).every(s=>s.travelMode==='walking')?'walking':'driving';
    return'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(pts[0])+'&destination='+encodeURIComponent(pts[pts.length-1])+(pts.length>2?'&waypoints='+pts.slice(1,-1).map(encodeURIComponent).join('|'):'')+'&travelmode='+mode;
  }
  function mapsTo(from,to,mode){return'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(from)+'&destination='+encodeURIComponent(to)+'&travelmode='+(mode==='walking'?'walking':'driving')}
  function wazeTo(place){return'https://www.waze.com/ul?q='+encodeURIComponent(place)+'&navigate=yes'}

  function priceHtml(stop,p){
    const n=counts(p),c=stop.pricing||pricingFor(stop.place),total=stopTotal(stop,p);
    if(total===null)return`<div class="v102-price"><strong>עלות:</strong> ${safe(c.status||'מחיר אינו זמין — נדרשת בדיקה')}</div>`;
    return`<div class="v102-price"><strong>עלות אטרקציה:</strong> מבוגר ${c.adult} ₪ × ${n.adults} · ילד ${c.child} ₪ × ${n.children} · Senior ${c.senior} ₪ × ${n.seniors} · <strong>סה״כ ${total.toLocaleString()} ₪</strong><small>${safe(c.status)}</small></div>`;
  }
  function stopsHtml(stops,p){
    return(stops||[]).map((st,i)=>{
      const next=stops[i+1],mode=st.travelMode==='walking'?'walking':'driving';
      return`<article class="planner-detail-stop v102-stop"><h4>${safe(st.time||'')} · ${safe(st.place)}</h4><div><strong>מה עושים:</strong> ${safe(st.what||'')}</div><div class="v102-stop-meta"><span>⏱ זמן במקום: ${safe(st.duration||'לא צוין')}</span>${next?`<span>${mode==='walking'?'🚶':'🚗'} מעבר: ${safe(st.drive||'דורש בדיקה')}</span>`:''}</div>${priceHtml(st,p)}<div class="navbuttons">${next?`<a target="_blank" rel="noopener" href="${mapsTo(st.place,next.place,mode)}">Google Maps ${mode==='walking'?'בהליכה':'בנסיעה'}</a>${mode==='driving'?`<a target="_blank" rel="noopener" href="${wazeTo(next.place)}">Waze לנקודה הבאה</a>`:''}`:''}<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(st.place)}">Google Maps לנקודה</a></div><div class="stop-edit-row"><button class="edit" type="button" onclick="plannerEditStop(${i})">עדכן נקודה</button><button class="remove" type="button" onclick="plannerRemoveStop(${i})">הסר נקודה</button></div></article>`;
    }).join('')||'<div class="warn">אין עדיין נקודות ביום הזה.</div>';
  }

  function renderDayEditor(){
    if(currentDay<0||!window.planner?.draft?.days?.[currentDay])return;
    const draft=window.planner.draft,day=draft.days[currentDay],p=draft.plannerProfile||{},route=mapsRoute(day.stops),total=dayTotal(day,p);
    $('plannerDayRouteBox').innerHTML=`<strong>${safe(displayDate(day.date))} · ${safe(day.title)}</strong>${route!=='#'?`<div style="margin-top:10px"><a class="btn secondary" href="${route}" target="_blank" rel="noopener">מסלול היום ב-Google Maps</a></div>`:''}${day.lodging?`<div style="margin-top:10px"><strong>🏨 לינה:</strong> ${safe(day.lodging)}</div>`:''}<div class="v102-day-total"><strong>סה״כ עלות אטרקציות ליום:</strong> ${total===null?'דורש בדיקה':total.toLocaleString()+' ₪ לכל המשתתפים'}</div>`;
    $('plannerDayDistanceWarning').innerHTML='';
    $('plannerDayStopsEditor').innerHTML=stopsHtml(day.stops,p)+`<details class="v102-rain"><summary>חלופה ליום גשום</summary><h4>${safe(day.rainAlternative?.title||'חלופה מקורה באזור היום')}</h4>${mapsRoute(day.rainAlternative?.stops)!=='#'?`<a class="btn soft" target="_blank" rel="noopener" href="${mapsRoute(day.rainAlternative.stops)}">מסלול חלופת הגשם ב-Google Maps</a>`:''}${stopsHtml(day.rainAlternative?.stops||[],p)}</details>`;
  }
  function openDay(index){
    const draft=window.planner?.draft;if(!draft?.days?.[index])return;
    currentDay=index;try{plannerEditingDay=index}catch(_){ }
    const day=draft.days[index],modal=$('plannerDayModal');
    $('plannerDayModalTitle').textContent=`יום ${index+1} · ${displayDate(day.date)}`;$('plannerDayTitleInput').value=day.title||'';
    renderDayEditor();modal.classList.add('show');modal.setAttribute('aria-hidden','false');
  }

  function renderDraft(){
    const draft=window.planner?.draft;if(!draft)return;
    const p=draft.plannerProfile||{},result=$('plannerResult');result?.classList.add('show');
    if($('plannerResultTitle'))$('plannerResultTitle').textContent=draft.name||'טיול';
    if($('plannerResultMeta'))$('plannerResultMeta').textContent=`${draft.days.length} ימים · ${p.people||0} נוסעים · פיילוט: הטיול המלא פתוח`;
    if($('plannerChangeQuota'))$('plannerChangeQuota').textContent='גרסת דמו: 100% מהטיול · ללא נעילה';
    const colors=['#2f80ed','#27ae60','#f2994a','#9b51e0','#eb5757'];
    $('plannerDraftDays').innerHTML=draft.days.map((day,i)=>{
      const total=dayTotal(day,p),route=mapsRoute(day.stops),line=(day.stops||[]).map(x=>x.place).join(' ← ');
      return`<article class="day-row" style="--day:${colors[i%colors.length]}"><div class="day-no"><span>יום</span><b>${i+1}</b><span class="day-date">${safe(displayDate(day.date))}</span></div><div class="day-main day-summary-card"><h3>${safe(day.title)}</h3><div class="day-route-line">${safe(line)}</div><div class="day-mini-meta">${route!=='#'?`<a href="${route}" target="_blank" rel="noopener">🗺 מסלול היום ב-Google Maps</a>`:''}<span>💰 ${total===null?'עלות דורשת בדיקה':total.toLocaleString()+' ₪'}</span><span>🌧 חלופה ליום גשום</span></div>${day.lodging?`<span class="lodging-chip">🏨 לינה: ${safe(day.lodging)}</span>`:''}</div><div class="day-action"><button class="btn ai-color" type="button" onclick="plannerEditDay(${i})">פתח פירוט יום</button></div></article>`;
    }).join('');
    window.renderPlannerBudget?.();
    result?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function localSave(row,email){
    let list=[];try{list=JSON.parse(localStorage.getItem(LOCAL_TRIPS)||'[]')}catch(_){ }
    const rec={tripId:row.id,tripName:row.name,destination:row.destination,start:row.start_date,end:row.end_date,personalUrl:tripUrl(row.id),tripDraft:row.draft,date:row.updated_at,customer:{id:row.user_id,email}};
    const idx=list.findIndex(x=>x.tripId===row.id);if(idx>=0)list[idx]=rec;else list.unshift(rec);
    localStorage.setItem(LOCAL_TRIPS,JSON.stringify(list));
  }

  async function saveDraft(){
    const sb=supabase();if(!sb)throw new Error('שירות Supabase לא נטען');
    const {data:{session}}=await sb.auth.getSession();if(!session?.user)throw new Error('יש להיכנס ולאמת OTP לפני שמירת הטיול');
    const draft=window.planner?.draft;if(!draft)throw new Error('לא נוצר טיול לשמירה');
    const p=draft.plannerProfile||{},id=window.planner.currentTripId||draft.tripId||newTripId();
    window.planner.currentTripId=id;draft.tripId=id;
    const row={id,user_id:session.user.id,name:draft.name||p.tripName||'טיול',destination:p.destination||'',start_date:p.start||null,end_date:p.end||null,draft:deepCopy(draft),updated_at:new Date().toISOString()};
    const {error}=await sb.from(TABLE).upsert(row,{onConflict:'id'});
    if(error)throw new Error(/relation|does not exist|42P01/i.test(error.message||'')?'טבלת tripcraft_trips עדיין לא הוקמה. יש להריץ ב-Supabase את SUPABASE_SETUP_V109.sql.':error.message);
    localSave(row,session.user.email||'');showLink(id,true);return id;
  }

  function showLink(id,saved){
    const result=$('plannerResult');if(!result||!id)return;
    let box=$('tcV102ShareBox');if(!box){box=document.createElement('div');box.id='tcV102ShareBox';box.className='safe';box.style.margin='14px 0';result.querySelector('.planner-result-head')?.insertAdjacentElement('afterend',box)}
    const url=tripUrl(id);
    box.innerHTML=`<strong>${saved?'הטיול נשמר בבסיס הנתונים ✓':'קישור הטיול'}</strong><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px"><input id="tcV102TripLink" value="${safe(url)}" readonly dir="ltr" style="flex:1;min-width:240px;padding:11px;border:1px solid #cfdde6;border-radius:12px"><button class="btn secondary" id="tcV102CopyTrip" type="button">העתק קישור</button></div><small>Trip ID: ${safe(id)} · הקישור הקבוע נטען מהחשבון ומאפשר פתיחה ועריכה.</small>`;
    $('tcV102CopyTrip').onclick=async()=>{try{await navigator.clipboard.writeText(url)}catch(_){$('tcV102TripLink').select();document.execCommand('copy')}$('tcV102CopyTrip').textContent='הקישור הועתק ✓'};
  }

  async function build(e){
    e?.preventDefault();e?.stopImmediatePropagation();
    const button=$('plannerBuild');if(!button||button.dataset.v102Busy==='1')return;
    const sb=supabase(),session=sb?(await sb.auth.getSession()).data.session:null;
    if(!session?.user){sessionStorage.setItem('tc_v91_return_after_auth','#planner');location.hash='#login';return}
    const p=profile();
    if(!p.tripName||!p.destination||!p.start||!p.end){alert('חסרים שם טיול, יעד או תאריכים. חזרו לשלבים הקודמים והשלימו אותם.');return}
    button.dataset.v102Busy='1';button.disabled=true;const label=button.textContent;button.textContent='בונה ושומר טיול...';
    try{
      if(typeof window.runTripBuildProgress==='function')await window.runTripBuildProgress();
      window.planner.currentTripId=null;window.planner.draft=generateDraft(p);renderDraft();
      await saveDraft();
    }catch(err){console.error(err);alert('בניית הטיול נכשלה: '+(err?.message||'שגיאה לא ידועה'))}
    finally{button.dataset.v102Busy='0';button.disabled=false;button.textContent=label}
  }

  function setValue(id,value){const el=$(id);if(!el)return;el.value=value??'';el.dispatchEvent(new Event('change',{bubbles:true}))}
  function setDate(id,value){setValue(id,value||'');if(value){const [y,m,d]=String(value).split('-');setValue(id+'Year',y);setValue(id+'Month',m);setValue(id+'Day',d)}}
  function resetNewTrip(){
    localStorage.removeItem('tripcraft_planner_draft_v57');
    const root=$('planner');root?.querySelectorAll('input').forEach(el=>{if(el.type==='checkbox'||el.type==='radio')el.checked=el.defaultChecked;else el.value=el.defaultValue||''});
    root?.querySelectorAll('select').forEach(el=>{const n=[...el.options].findIndex(o=>o.defaultSelected);el.selectedIndex=n>=0?n:0});root?.querySelectorAll('textarea').forEach(el=>el.value=el.defaultValue||'');
    root?.querySelectorAll('.traveler-band').forEach(row=>{const out=row.querySelector('output');if(out)out.textContent=row.dataset.band==='adult'?'2':'0'});
    setValue('plDestination','');setValue('plTripName','');setValue('plArrivalAirport','');setValue('plDepartureAirport','');
    window.syncTravelerBands?.();if(window.planner){window.planner.draft=null;window.planner.currentTripId=null;window.planner.step=1}$('plannerResult')?.classList.remove('show');
    window.plannerShowStep?.(1);location.hash='#planner';setTimeout(()=>$('plTripName')?.focus(),100);
  }
  function prefill(draft){
    resetNewTrip();const p=draft.plannerProfile||{};
    setValue('plTripName',p.tripName||draft.name||'');setValue('plDestination',p.destination||'');setValue('plArrivalAirport',p.arrivalAirport||'');setValue('plDepartureAirport',p.departureAirport||'');setDate('plStart',p.start);setDate('plEnd',p.end);
    ['People','Children','Group','Pace','Walk','Drive','DayLength','Must','Free','ExistingLodging','LodgingStyle','HotelStars','LodgingPriority','LodgingDetour'].forEach(s=>{const key=s.charAt(0).toLowerCase()+s.slice(1);if(p[key]!==undefined)setValue('pl'+s,p[key])});
    if(p.includeHotels!==undefined)setValue('plIncludeHotels',p.includeHotels?'yes':'no');
    const check=(selector,values)=>{const chosen=new Set(values||[]);document.querySelectorAll(selector).forEach(el=>{el.checked=chosen.has(el.value);el.dispatchEvent(new Event('change',{bubbles:true}))})};
    check('#countryChoices input',p.countries);check('#transportChoices input',p.transports);check('#interestChoices input',p.interests);check('#tripPriorityChoices input',p.priorities);check('#avoidChoices input',String(p.avoid||'').split(',').map(x=>x.trim()).filter(Boolean));check('#lodgingTypeChoices input',p.lodgingTypes);check('#lodgingFilterChoices input',p.lodgingFilters);
    document.querySelectorAll('input[name="plGroupChoice"]').forEach(el=>el.checked=el.value===(p.group||'couple'));document.querySelectorAll('input[name="plLodgingMode"]').forEach(el=>el.checked=el.value===(p.lodgingMode||'recommend'));document.querySelectorAll('input[name="plLodgingBudget"]').forEach(el=>el.checked=el.value===(p.lodgingBudget||'mid'));
    document.querySelectorAll('#travelerBands .traveler-band').forEach(row=>{const out=row.querySelector('output');if(out)out.textContent=Number((p.ageBands||{})[row.dataset.band]||0)});window.syncTravelerBands?.();
  }

  async function loadTrips(){
    const sb=supabase();if(!sb)return{user:null,trips:[],error:'שירות Supabase לא נטען'};
    const {data:{session}}=await sb.auth.getSession();if(!session?.user)return{user:null,trips:[]};
    const {data,error}=await sb.from(TABLE).select('id,name,destination,start_date,end_date,draft,created_at,updated_at').order('updated_at',{ascending:false});
    return{user:session.user,trips:data||[],error:error?.message||''};
  }
  async function openTrip(id){
    const result=await loadTrips();const rec=result.trips.find(x=>x.id===id);if(!rec){alert('הטיול לא נמצא בחשבון הזה.');return false}
    const draft=deepCopy(rec.draft);prefill(draft);window.planner.draft=draft;window.planner.currentTripId=id;
    location.hash='#planner';
    const app=$('mainApp');if(app){app.classList.add('page-focus');app.dataset.page='planner'}
    window.tcRouteRefresh?.('planner');window.plannerShowStep?.(1);window.scrollTo({top:0,behavior:'auto'});
    setTimeout(()=>{renderDraft();showLink(id,true)},100);return true;
  }
  async function renderAccount(){
    const box=$('tcAccountBody');if(!box)return;box.innerHTML='<div class="safe">טוען את הטיולים שלך...</div>';
    const {user,trips,error}=await loadTrips();
    if(!user){box.innerHTML='<div class="safe">כדי לראות את הטיולים יש להיכנס עם אימייל ו-OTP.</div>';return}
    const meta=user.user_metadata||{},profileData=meta.tripcraft_profile||{},display=[profileData.firstName||meta.first_name,profileData.lastName||meta.last_name].filter(Boolean).join(' ');
    const warning=error?`<div class="warn">${/relation|does not exist|42P01/i.test(error)?'טבלת הטיולים עדיין לא הוקמה. הריצו את SUPABASE_SETUP_V109.sql ב-Supabase.':safe(error)}</div>`:'';
    const list=trips.length?trips.map(t=>`<div class="safe v102-trip-card"><h3>${safe(t.name||t.id)}</h3><div><b>לאן:</b> ${safe(t.destination||'—')}</div><div><b>תאריכים:</b> ${safe(displayDate(t.start_date))} – ${safe(displayDate(t.end_date))}</div><div><b>לינק שנוצר:</b> <span dir="ltr">${safe(tripUrl(t.id))}</span></div><div class="cta"><button class="btn secondary" data-v102-open="${safe(t.id)}" type="button">פתח / ערוך טיול</button><button class="btn soft" data-v102-copy="${safe(t.id)}" type="button">העתק קישור</button></div></div>`).join(''):'<div class="warn">עדיין אין טיולים בחשבון. בחרו „בניית טיול חדש”.</div>';
    box.innerHTML=`<div class="account-card"><h3>${safe(display||'החשבון שלי')}</h3><p>${safe(user.email||'')}</p><div class="cta"><button class="btn planner-color" id="tcV102NewTrip" type="button">בניית טיול חדש</button><button class="btn soft" id="tcV102Logout" type="button">התנתק</button></div></div><h3 style="margin-top:24px">הטיולים שלי</h3><p>טיול קיים ממלא מחדש את כל הבחירות המקוריות. טיול חדש נפתח נקי, למעט ברירות המחדל.</p>${warning}${list}`;
    $('tcV102NewTrip').onclick=resetNewTrip;$('tcV102Logout').onclick=async()=>{await supabase()?.auth.signOut();location.hash='#home'};
    box.querySelectorAll('[data-v102-open]').forEach(btn=>btn.onclick=()=>openTrip(btn.dataset.v102Open));
    box.querySelectorAll('[data-v102-copy]').forEach(btn=>btn.onclick=async()=>{await navigator.clipboard?.writeText(tripUrl(btn.dataset.v102Copy));btn.textContent='הקישור הועתק ✓'});
  }

  function route(){
    const raw=(location.hash||'#home').replace(/^#/,'');
    if(raw==='account')setTimeout(()=>window.TripCraftV113?.renderAccount?.(),80);
    if(raw.startsWith('trip/'))setTimeout(()=>openTrip(decodeURIComponent(raw.slice(5))),120);
  }
  function install(){
    const style=document.createElement('style');style.id='tc-v102-styles';style.textContent=`
      .v102-stop-meta{display:flex;gap:8px;flex-wrap:wrap;margin:9px 0;color:#526a7b}.v102-stop-meta span{background:#eef5f8;border-radius:999px;padding:6px 9px}
      .v102-price{margin-top:10px;padding:10px 12px;background:#f7fbfd;border:1px solid #dce7ed;border-radius:12px}.v102-price small{display:block;margin-top:5px;color:#647987}
      .v102-day-total{margin-top:12px;padding-top:10px;border-top:1px solid #cfe2d8}.v102-rain{margin-top:18px;background:#f5f2ff;border:1px solid #d9d0f2;border-radius:16px;padding:14px}.v102-rain summary{cursor:pointer;font-weight:900;color:#5d3fa0}
      .v102-trip-card{overflow-wrap:anywhere}.tc-brand-logo{display:block!important;visibility:visible!important;opacity:1!important;object-fit:contain!important;background:#fff!important}
      #tcV85ShareBox,#plannerShareBox{display:none!important}
      @media(max-width:620px){.tc-header .brand{display:flex!important}.tc-brand-logo{width:64px!important;height:50px!important;min-width:64px!important}.v102-stop-meta{display:grid}.v102-rain{padding:10px}}
    `;document.head.appendChild(style);
    ensureSeniorBand();
    const button=$('plannerBuild');button?.addEventListener('click',build,true);
    if($('plannerSaveTrip'))$('plannerSaveTrip').onclick=async e=>{e.preventDefault();try{await saveDraft()}catch(err){alert('שמירת הטיול נכשלה: '+err.message)}};
    window.plannerEditDay=openDay;try{plannerEditDay=openDay}catch(_){ }
    window.plannerRenderDayEditor=renderDayEditor;try{plannerRenderDayEditor=renderDayEditor}catch(_){ }
    window.renderPlannerDraft=renderDraft;try{renderPlannerDraft=renderDraft}catch(_){ }
    window.tcRenderAccount=renderAccount;window.tcStartNewTrip=resetNewTrip;
    // V101 finishes an async session restore after this overlay may already be installed.
    // Re-assert the V102 public handlers after that restore completes.
    setTimeout(()=>{if(window.TripCraftV113)window.tcRenderAccount=window.TripCraftV113.renderAccount;window.tcStartNewTrip=resetNewTrip;if(location.hash==='#account')window.TripCraftV113?.renderAccount?.()},600);
    window.TripCraftV102={VERSION,TABLE,DEMO_ACCESS_PERCENT,FUTURE_PAID_PREVIEW_PERCENT,generateDraft,saveDraft,renderAccount,openTrip,resetNewTrip,tripUrl,supabase};
    window.addEventListener('hashchange',()=>{route();if(location.hash==='#account')setTimeout(()=>window.TripCraftV113?.renderAccount?.(),700)});route();document.documentElement.dataset.tripcraftVersion=VERSION;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
