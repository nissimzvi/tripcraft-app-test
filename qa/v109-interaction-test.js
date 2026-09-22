const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

class Events{
  constructor(){this.listeners={}}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
  dispatch(type,event={}){for(const fn of this.listeners[type]||[])fn(event)}
}
class Classes{
  constructor(){this.values=new Set()}
  add(...v){v.forEach(x=>this.values.add(x))}
  remove(...v){v.forEach(x=>this.values.delete(x))}
  toggle(v,on){on===undefined?(this.values.has(v)?this.values.delete(v):this.values.add(v)):(on?this.values.add(v):this.values.delete(v))}
  contains(v){return this.values.has(v)}
}
class Element extends Events{
  constructor(id=''){super();this.id=id;this.dataset={};this.classList=new Classes();this.style={};this.attributes={};this.textContent='';this.disabled=false}
  setAttribute(k,v){this.attributes[k]=String(v)}
  removeAttribute(k){delete this.attributes[k]}
  getAttribute(k){return this.attributes[k]??null}
  querySelector(){return null}
  querySelectorAll(){return []}
  closest(selector){return this.matches?.(selector)?this:null}
  getBoundingClientRect(){return{left:20,bottom:40}}
  remove(){this.removed=true}
}
class Store{
  constructor(){this.data={}}
  getItem(k){return Object.prototype.hasOwnProperty.call(this.data,k)?this.data[k]:null}
  setItem(k,v){this.data[k]=String(v)}
  removeItem(k){delete this.data[k]}
  clear(){this.data={}}
}

const elements={};
for(const id of ['mainApp','tcUserGreeting','tcMobileUser','tcNavToggle','tcMobileMenu','plannerBuild','plannerSaveTrip','plannerDiscardTrip'])elements[id]=new Element(id);
elements.mainApp.classList.add('page-focus');
const logo=new Element('logo');logo.classList.add('tc-brand-logo');logo.src='icons/icon-192.png';
const body=new Element('body'),head=new Element('head'),documentEvents=new Events();
let styleText='';
head.appendChild=node=>{if(node.id==='tc-v108-styles')styleText=node.textContent};
const document={
  readyState:'complete',body,head,documentElement:{dataset:{}},
  getElementById:id=>elements[id]||null,
  querySelectorAll:selector=>selector.includes('.tc-brand-logo')?[logo]:[],
  createElement:tag=>new Element(tag),
  createTreeWalker:()=>({nextNode:()=>null}),
  addEventListener:(...args)=>documentEvents.addEventListener(...args),
  visibilityState:'visible'
};
const location={_hash:'#home',get hash(){return this._hash},set hash(v){this._hash=v}};
const localStorage=new Store(),sessionStorage=new Store(),windowEvents=new Events();
let sessionUser=null,saveCount=0,renderCount=0,openCount=0,resetCount=0,authCallback=null;
const auth={
  getSession:async()=>({data:{session:sessionUser?{user:sessionUser}:null}}),
  signOut:async()=>{sessionUser=null},
  onAuthStateChange:fn=>{authCallback=fn;return{data:{subscription:{unsubscribe(){}}}}}
};
const api={
  supabase:()=>({auth}),generateDraft:p=>({name:p.tripName,plannerProfile:p,days:[]}),
  saveDraft:async()=>{saveCount++},resetNewTrip:()=>{resetCount++},openTrip:async()=>{openCount++;return true},tripUrl:id=>'https://example.test/#trip/'+id
};
const window=Object.assign(windowEvents,{
  innerWidth:390,innerHeight:844,location,TripCraftV102:api,planner:{currentTripId:null,draft:null},
  plannerData:()=>({tripName:'בדיקה',destination:'ישראל',start:'2026-10-01',end:'2026-10-02'}),
  renderPlannerDraft:()=>{renderCount++},runTripBuildProgress:async()=>{},scrollTo:()=>{},
  tcRouteRefresh:()=>{},tcRenderAccount:()=>{},tcV101AdoptSessionUser:()=>{}
});
const alerts=[];
const context={window,document,location,localStorage,sessionStorage,navigator:{clipboard:{writeText:async()=>{}}},URLSearchParams,CSS:{escape:value=>String(value)},
  alert:m=>alerts.push(m),console,MutationObserver:class{observe(){}},NodeFilter:{SHOW_TEXT:4},Node:{TEXT_NODE:3},
  setInterval:()=>0,setTimeout,clearTimeout,Date,Promise};
vm.createContext(context);
vm.runInContext(fs.readFileSync('tripcraft-v109.js','utf8'),context,{filename:'tripcraft-v109.js'});

const target=(kind,href,text='')=>{
  const el=new Element(kind);el.textContent=text;if(href)el.attributes.href=href;
  el.matches=selector=>{
    if(selector==='#plannerBuild')return kind==='build';
    if(selector.includes('#pricing button'))return kind==='commerce';
    if(selector==='[data-tc-home-logo="1"]')return kind==='logo';
    if(selector==='a[href^="#"]')return kind==='link';
    if(selector==='[data-v102-open]')return kind==='open';
    if(selector==='#tcV102NewTrip,#tcV99NewTrip')return kind==='fresh';
    if(selector==='[data-v102-copy]')return kind==='copy';
    return false;
  };
  return el;
};
const click=el=>{const event={target:el,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};window.dispatch('click',event);return event};

(async()=>{
  await new Promise(r=>setTimeout(r,0));
  assert.strictEqual(document.documentElement.dataset.tripcraftVersion,'V109');
  assert.ok(styleText.includes('[href="#pricing"]')&&styleText.includes('.tc-install'));
  assert.strictEqual(logo.src,'tripcraft-logo-v109.png?v=109-final');

  click(target('link','#how'));assert.strictEqual(location.hash,'#how','public link must route immediately');
  click(target('link','#planner','בנה טיול חדש'));assert.strictEqual(location.hash,'#login','protected link must require login');
  click(target('commerce'));assert.strictEqual(location.hash,'#login','cart addition must require login');

  sessionUser={id:'u1',email:'test@example.com',user_metadata:{first_name:'ניסים',last_name:'צבי'}};
  localStorage.setItem('tc_v433_customer',JSON.stringify({firstName:'ניסים',lastName:'צבי',email:'test@example.com'}));
  authCallback('SIGNED_IN',{user:sessionUser});
  assert.strictEqual(sessionStorage.getItem('tc_v108_session_window'),'active','OTP/auth event must activate the whole application immediately');
  assert.strictEqual(elements.tcUserGreeting.textContent,'ניסים צבי','header must show only the full name');
  click(target('link','#login'));assert.strictEqual(location.hash,'#account','login must never reopen while the session is active');await new Promise(r=>setTimeout(r,0));
  click(target('link','#planner','בנה טיול חדש'));assert.strictEqual(location.hash,'#planner','authenticated planner link must open');
  assert.ok(resetCount>0,'new trip must call the clean reset flow');
  click(target('link','#cart'));assert.strictEqual(location.hash,'#cart','authenticated cart link must open');
  click(target('logo','#home'));assert.strictEqual(location.hash,'#account','logo must return an authenticated user to the account');

  location.hash='#planner';elements.mainApp.dataset.page='account';
  const open=target('open');open.dataset.v102Open='TC-1';click(open);await new Promise(r=>setTimeout(r,0));
  assert.strictEqual(openCount,1,'existing trip button must call openTrip');
  assert.strictEqual(elements.mainApp.dataset.page,'planner','edit must display the planner even when the hash was already #planner');
  window.planner.currentTripId='TC-EXISTING';
  click(Object.assign(elements.plannerBuild,{matches:s=>s==='#plannerBuild'}));
  await new Promise(r=>setTimeout(r,20));
  assert.strictEqual(renderCount,1,'build must render the generated trip');
  assert.strictEqual(saveCount,0,'build must not save before the user explicitly chooses Save Trip');
  assert.ok(body.classList.contains('tc-v108-unsaved'),'a generated but unsaved trip must be marked unsaved');
  assert.strictEqual(window.planner.currentTripId,'TC-EXISTING','editing must keep the same Trip ID');
  elements.plannerSaveTrip.dispatch('click',{preventDefault(){},stopImmediatePropagation(){}});
  await new Promise(r=>setTimeout(r,0));
  assert.strictEqual(saveCount,1,'the explicit Save Trip action must persist the trip');
  assert.ok(!body.classList.contains('tc-v108-unsaved'),'a saved trip must clear the unsaved-navigation guard');
  assert.ok(styleText.includes('body.tc-logged-in .tc-desktop-nav a[href="#login"]'),'login button must be hidden after authentication');
  const hotels=window.TripCraftV108Hotels;
  assert.ok(hotels,'V109 hotel planning API must be installed');
  const greeceProfile={destination:'יוון',countries:['יוון'],start:'2026-10-01',end:'2026-10-08',people:4,children:0,rooms:2,hotelStars:'3,4',hotelStarLevels:['3','4'],lodgingBudget:'mid'};
  const hotelPlan=hotels.proposedPlan(greeceProfile);
  assert.deepStrictEqual(Array.from(hotelPlan,x=>x.town),['לוטראקי','יואנינה','וולוס','אתונה'],'Greece plan must contain the proposed four lodging areas');
  assert.deepStrictEqual(Array.from(hotelPlan,x=>x.nights),[1,3,2,1],'Greece plan must allocate the requested 1/3/2/1 nights');
  assert.strictEqual(hotelPlan[1].checkIn,'2026-10-02');assert.strictEqual(hotelPlan[1].checkOut,'2026-10-05');
  const ioannina=hotels.candidates('יואנינה',greeceProfile);
  assert.ok(ioannina.every(h=>h.name&&h.score&&h.stars&&h.eur),'every proposed hotel must include name, Booking score, stars and price');
  window.TRIPCRAFT_CONFIG={bookingAffiliateId:'123456',bookingAffiliateTemplate:''};
  const booking=hotels.bookingUrl(ioannina[0],hotelPlan[1],greeceProfile);
  assert.ok(booking.includes('aid=123456')&&booking.includes('checkin=2026-10-02')&&booking.includes('checkout=2026-10-05'),'Booking links must carry affiliate ID and suggested dates');
  assert.ok(booking.includes('no_rooms=2')&&booking.includes('group_adults=4'),'Booking links must carry the selected room and traveler counts');
  assert.strictEqual(alerts.length,0,'happy path must not alert an error');
  console.log('V109 interaction tests: PASS (session, explicit save, hotel allocation, rooms, affiliate link and dates)');
})().catch(error=>{console.error(error);process.exitCode=1});
