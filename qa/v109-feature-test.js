const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

class Classes{
  constructor(){this.values=new Set()}
  toggle(name,on){on?this.values.add(name):this.values.delete(name)}
  contains(name){return this.values.has(name)}
}
class Element{
  constructor(id,value=''){this.id=id;this.value=value;this.dataset={};this.style={};this.classList=new Classes();this.listeners={};this.checked=false;this.textContent='';this.disabled=false}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
  dispatchEvent(event){event.target=this;for(const fn of this.listeners[event.type]||[])fn(event);return true}
  querySelector(selector){return selector==='span'?this.span||null:null}
  querySelectorAll(){return[]}
  closest(){return null}
  appendChild(){}
}

const ids={};
for(const [id,value] of Object.entries({plPeople:'4',plGroup:'זוג',plRooms:'1',plHotelStars:'any',plStart:'2030-06-10',plEnd:'2030-06-09'}))ids[id]=new Element(id,value);
ids.plGroupInterpretation=new Element('plGroupInterpretation');ids.plGroupInterpretation.span=new Element('roomsText');
ids.plRoomsHint=new Element('plRoomsHint');
ids.plannerSaveTrip=new Element('plannerSaveTrip');ids.plannerDiscardTrip=new Element('plannerDiscardTrip');ids.tcV108SaveNotice=new Element('tcV108SaveNotice');

const stars=['any','3','4','5','apartment'].map(value=>{const el=new Element('',value);el.checked=value==='any';return el});
const body=new Element('body'),head=new Element('head'),documentEvents={};
const document={
  readyState:'complete',body,head,documentElement:{dataset:{}},
  getElementById:id=>ids[id]||null,
  querySelectorAll:selector=>selector==='#hotelStarChoices input'?stars:[],
  querySelector:()=>null,
  createElement:()=>new Element(),
  addEventListener:(type,fn)=>{(documentEvents[type]??=[]).push(fn)}
};
const location={hash:'#planner'};
const windowEvents={};
let resetCount=0;
const window={
  location,planner:{draft:{plannerProfile:{}},currentTripId:null},
  TripCraftV102:{resetNewTrip:()=>{resetCount++}},
  plannerData:()=>({group:'זוג'}),
  addEventListener:(type,fn)=>{(windowEvents[type]??=[]).push(fn)},
  tcRouteRefresh:()=>{}
};
const context={window,document,location,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},confirm:()=>false,alert:()=>{},console,Date,Promise,
  Event:class{constructor(type,options={}){this.type=type;Object.assign(this,options)}preventDefault(){}stopImmediatePropagation(){}},
  MutationObserver:class{observe(){}},setTimeout,clearTimeout,CSS:{escape:String}};
vm.createContext(context);
const source=fs.readFileSync('tripcraft-v109.js','utf8');
const feature=source.split('/* TripCraft V109 - room-aware hotels, future-date rules, explicit save and safe deletion. */')[1]
  .split('/* V109 - itinerary-aware lodging plan, Booking affiliate routing and public demo. */')[0];
vm.runInContext(`/* TripCraft V109 - room-aware hotels, future-date rules, explicit save and safe deletion. */${feature}`,context);

const api=window.TripCraftV108State;
assert.ok(api,'feature state API must install');
assert.strictEqual(ids.plRooms.value,'2','four travelers marked as a couple group must default to two rooms');
assert.match(ids.plGroupInterpretation.span.textContent,/2 זוגות/);
assert.match(ids.plGroupInterpretation.span.textContent,/2 חדרים/);
assert.strictEqual(ids.plEnd.min,'2030-06-10','return date must not precede the departure date');
assert.strictEqual(ids.plEnd.value,'','an invalid return date must be cleared');
assert.match(ids.plStart.min,/^\d{4}-\d{2}-\d{2}$/,'departure date must receive a current-date minimum');

stars.forEach(box=>box.checked=['3','4'].includes(box.value));
const selected=api.syncStars();
assert.deepStrictEqual(Array.from(selected),['3','4'],'hotel levels must support multiple selections');
const profile=window.plannerData();
assert.strictEqual(profile.rooms,2);
assert.deepStrictEqual(Array.from(profile.hotelStarLevels),['3','4']);

api.markBuilt(window.planner.draft);
assert.ok(body.classList.contains('tc-v108-built'));
assert.ok(body.classList.contains('tc-v108-unsaved'));
assert.strictEqual(api.shouldGuardNavigation('#home'),true);
assert.strictEqual(api.shouldGuardNavigation('#planner'),false);
api.markSaved();
assert.strictEqual(api.shouldGuardNavigation('#home'),false);
assert.ok(!body.classList.contains('tc-v108-unsaved'));
assert.strictEqual(resetCount,0);

console.log('V109 feature tests: PASS (dates, couples, rooms, multi-star selection and unsaved guard)');
