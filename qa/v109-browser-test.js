const {chromium}=require('playwright');
const assert=require('assert');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  page.on('pageerror',error=>{throw error});
  await page.route(/^https:\/\//,route=>route.abort());
  await page.addInitScript(()=>{
    const user={id:'u-v108',email:'pilot@example.com',created_at:'2026-09-01T00:00:00Z',user_metadata:{first_name:'ניסים',last_name:'צבי',tripcraft_profile:{firstName:'ניסים',lastName:'צבי'}}};
    const profile={tripName:'טיול קיים',destination:'יוון',countries:['יוון'],start:'2026-10-10',end:'2026-10-17',people:4,children:0,group:'זוג',ageBands:{adult:4,young:0,teen:0,kid:0,baby:0,dogs:0},transports:['car'],transport:'car',dayLength:'full',pace:'balanced',walk:'1–3 שעות',drive:'עד 4 שעות',interests:['נופים וטבע'],priorities:['מסלול יעיל ללא נסיעות מיותרות'],must:'',avoid:'',free:'',lodgingMode:'recommend',lodgingTypes:['hotel'],lodgingBudget:'mid',lodgingFilters:['breakfast'],lodgingPriority:'balanced',lodgingDetour:'10',lodgingStyle:'smart',hotelStars:'3',hotelStarLevels:['3','4'],includeHotels:true,rooms:2,couples:2,groupDisplay:'2 זוגות'};
    const draft={tripId:'TC-EXISTING',name:'טיול קיים',plannerProfile:profile,days:[{date:'2026-10-10',title:'יום ראשון',lodging:'מלון לדוגמה',lodgingArea:'אתונה',stops:[{time:'09:00',place:'Acropolis Athens',what:'ביקור',duration:'שעתיים',drive:'20 דקות',travelMode:'driving',pricing:{adult:65,child:32,senior:45,status:'הערכה'}}]},{date:'2026-10-11',title:'יום שני',lodging:'',stops:[]}]};
    window.__db=[{id:'TC-EXISTING',user_id:user.id,name:'טיול קיים',destination:'יוון',start_date:profile.start,end_date:profile.end,draft,created_at:'2026-09-01T00:00:00Z',updated_at:'2026-09-01T00:00:00Z'}];
    const callbacks=[];
    const filtered=(filters)=>window.__db.filter(row=>filters.every(([k,v])=>row[k]===v));
    const query=(mode)=>{
      const filters=[];
      const q={
        select(){return q},eq(k,v){filters.push([k,v]);return q},order(){return Promise.resolve({data:filtered(filters),error:null})},
        maybeSingle(){const data=filtered(filters)[0]||null;return Promise.resolve({data,error:null})},
        then(resolve,reject){try{if(mode==='delete'){const ids=new Set(filtered(filters).map(x=>x.id));window.__db=window.__db.filter(x=>!ids.has(x.id));return Promise.resolve(resolve({data:null,error:null}))}return Promise.resolve(resolve({data:filtered(filters),error:null}))}catch(error){return reject?.(error)}}
      };return q;
    };
    const client={
      auth:{getSession:async()=>({data:{session:{user}}}),onAuthStateChange:fn=>{callbacks.push(fn);return{data:{subscription:{unsubscribe(){}}}}},signOut:async()=>{},signInWithOtp:async()=>({error:null}),verifyOtp:async()=>({data:{user,session:{user}},error:null})},
      from:()=>({select:()=>query('select'),delete:()=>query('delete'),upsert:async row=>{const i=window.__db.findIndex(x=>x.id===row.id);if(i>=0)window.__db[i]={...window.__db[i],...row};else window.__db.unshift({...row,created_at:row.updated_at});return{error:null}}})
    };
    window.supabase={createClient:()=>client};
    localStorage.setItem('tc_v433_customer',JSON.stringify({id:user.id,firstName:'ניסים',lastName:'צבי',email:user.email}));
    localStorage.setItem('tc_v108_last_activity',String(Date.now()));
    sessionStorage.setItem('tc_v108_session_window','active');
  });

  await page.goto('http://127.0.0.1:8765/index.html#planner',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.tripcraftVersion==='V109'&&window.TripCraftV108State);

  assert.strictEqual(await page.evaluate(()=>document.documentElement.dataset.tripcraftMobileFix),'V109-final');
  assert.ok((await page.locator('.tc-brand-logo').getAttribute('src')).includes('tripcraft-logo-v109.png'));
  assert.ok(await page.locator('.tc-brand-logo').evaluate(img=>img.complete&&img.naturalWidth>0),'logo must load on mobile');
  assert.ok((await page.locator('.tc-brand-logo').boundingBox()).width>=78,'mobile logo must be visibly sized');
  assert.strictEqual(await page.locator('#transportChoices').innerText().then(x=>x.includes('רכב שכור')),false);
  assert.strictEqual(await page.locator('#lodgingFilterChoices input[value="breakfast"]').isChecked(),true);
  assert.strictEqual(await page.locator('#lodgingFilterChoices input[value="half_board"]').count(),1);
  assert.strictEqual(await page.locator('#lodgingFilterChoices input[value="all_inclusive"]').count(),1);

  const today=await page.evaluate(()=>{const d=new Date(),o=d.getTimezoneOffset()*60000;return new Date(d-o).toISOString().slice(0,10)});
  assert.strictEqual(await page.locator('#plStart').getAttribute('min'),today);
  await page.locator('#plStart').fill('2026-10-10');await page.locator('#plStart').dispatchEvent('change');
  assert.strictEqual(await page.locator('#plEnd').getAttribute('min'),'2026-10-10');

  await page.evaluate(()=>{
    document.querySelector('input[name="plGroupChoice"][value="זוג"]').click();
    document.querySelector('[data-band="adult"] output').textContent='4';
    document.querySelector('#plAgesBands').value=JSON.stringify({adult:4,young:0,teen:0,kid:0,baby:0,dogs:0});
    document.querySelector('#plPeople').value='4';
    delete document.querySelector('#plRooms').dataset.userEdited;
    window.TripCraftV108State.syncRooms(true);
  });
  const composition=await page.evaluate(()=>window.plannerData());
  assert.strictEqual(composition.couples,2);assert.strictEqual(composition.rooms,2);assert.strictEqual(composition.groupDisplay,'2 זוגות');
  assert.ok((await page.locator('#plGroupInterpretation').innerText()).includes('2 זוגות'));

  await page.locator('#hotelStarChoices input[value="3"]').check();
  await page.locator('#hotelStarChoices input[value="4"]').check();
  const stars=await page.evaluate(()=>window.plannerData().hotelStarLevels);
  assert.deepStrictEqual(stars.sort(),['3','4']);

  await page.evaluate(()=>{
    document.querySelector('#plTripName').value='V109 QA';document.querySelector('#plDestination').value='יוון';
    document.querySelector('#plStart').value='2026-10-10';document.querySelector('#plEnd').value='2026-10-17';
    window.plannerShowStep(7);
  });
  const beforeBuild=await page.evaluate(()=>window.__db.length);
  await page.locator('#plannerBuild').click();
  await page.waitForFunction(()=>document.body.classList.contains('tc-v108-unsaved'));
  assert.strictEqual(await page.evaluate(()=>window.__db.length),beforeBuild,'build must not auto-save');
  assert.strictEqual(await page.locator('#plannerBuild').isVisible(),false);
  assert.strictEqual(await page.locator('#plannerPrev').isVisible(),false);
  assert.strictEqual(await page.locator('#plannerNext').isVisible(),false);
  assert.strictEqual(await page.locator('#plannerSaveTrip').isVisible(),true);
  assert.strictEqual(await page.locator('#plannerDiscardTrip').isVisible(),true);

  await page.locator('#plannerDraftDays .day-action button').first().click();
  await page.waitForFunction(()=>document.querySelector('#plannerDayModal')?.classList.contains('show'));
  await page.locator('#plannerDayChatInput').tap();
  assert.strictEqual(await page.evaluate(()=>document.activeElement?.id),'plannerDayChatInput','day chat must accept mobile focus');
  await page.locator('#plannerDayChatInput').fill('בקשה ליום');
  await page.locator('#plannerDayChatSend').click();
  assert.ok((await page.locator('#plannerDayChatLog').innerText()).includes('בקשה ליום'));
  await page.locator('#plannerDayModalClose').click();

  await page.locator('#plannerGlobalPostInput').tap();
  assert.strictEqual(await page.evaluate(()=>document.activeElement?.id),'plannerGlobalPostInput','global post input must accept mobile focus');
  await page.locator('#plannerGlobalPostInput').fill('המלצה למסלול במרכז העיר');
  await page.locator('#plannerGlobalPostReview').click();
  assert.ok((await page.locator('#plannerGlobalPostResult').innerText()).includes('הצעת שיבוץ'));

  await page.locator('#plannerChatInput').tap();
  assert.strictEqual(await page.evaluate(()=>document.activeElement?.id),'plannerChatInput','trip chat must accept mobile focus');
  await page.locator('#plannerChatInput').fill('נא לעדכן את המסלול');
  await page.locator('#plannerChatSend').click();
  assert.ok((await page.locator('#plannerChatLog').innerText()).includes('נא לעדכן את המסלול'));
  const actionStyle=await page.locator('.tc-v108-result-actions').evaluate(el=>({position:getComputedStyle(el).position,columns:getComputedStyle(el).gridTemplateColumns}));
  assert.strictEqual(actionStyle.position,'fixed');
  assert.strictEqual(actionStyle.columns.split(' ').length,2,'save and discard must share one compact row');

  page.once('dialog',dialog=>dialog.dismiss());
  await page.locator('#tcDesktopNav a[href="#home"]').click();
  await page.waitForTimeout(50);assert.strictEqual(new URL(page.url()).hash,'#planner','dismissed unsaved warning must keep planner open');

  await page.locator('#plannerSaveTrip').click();
  await page.waitForFunction(()=>!document.body.classList.contains('tc-v108-unsaved')&&document.querySelector('#tcV102TripLink'));
  assert.strictEqual(await page.evaluate(()=>window.__db.length),beforeBuild+1,'explicit save must insert the trip');
  assert.ok((await page.locator('#tcV102TripLink').inputValue()).includes('#trip/TC-'));
  await page.locator('#tcDesktopNav a[href="#account"]').click();await page.waitForTimeout(250);
  assert.ok(await page.locator('[data-v108-delete]').count()>=2,'every account trip must get a delete action');

  await page.locator('[data-v102-open="TC-EXISTING"]').click();await page.waitForTimeout(250);
  await page.evaluate(()=>window.TripCraftV108State.markDirty());
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#plannerDiscardTrip').click();await page.waitForTimeout(200);
  assert.strictEqual(new URL(page.url()).hash,'#account');
  assert.strictEqual(await page.evaluate(()=>window.__db.some(x=>x.id==='TC-EXISTING')),true,'discard must not delete a previously saved trip');

  await page.locator('[data-v102-open="TC-EXISTING"]').click();await page.waitForTimeout(250);
  assert.strictEqual(await page.locator('#plRooms').inputValue(),'2');
  assert.strictEqual(await page.locator('#hotelStarChoices input[value="3"]').isChecked(),true);
  assert.strictEqual(await page.locator('#hotelStarChoices input[value="4"]').isChecked(),true);
  assert.strictEqual(await page.locator('#plannerNext').isVisible(),true,'opened trip must remain editable through the wizard');

  await page.locator('#tcDesktopNav a[href="#account"]').click();await page.waitForTimeout(200);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-v108-delete="TC-EXISTING"]').click();await page.waitForTimeout(150);
  page.once('dialog',dialog=>dialog.accept());
  await page.waitForTimeout(50);
  assert.strictEqual(await page.evaluate(()=>window.__db.some(x=>x.id==='TC-EXISTING')),false);

  const booking=await page.evaluate(()=>{
    const api=window.TripCraftV108Hotels,profile={people:4,children:0,rooms:2,hotelStarLevels:['3','4']};
    return api.bookingUrl({name:'QA Hotel',score:9,stars:4,eur:100},{town:'Athens',checkIn:'2026-10-10',checkOut:'2026-10-12'},profile);
  });
  assert.ok(booking.includes('no_rooms=2')&&booking.includes('group_adults=4'));

  console.log('V109 browser QA: PASS (logo, dates, couples/rooms, hotel filters, explicit save, guard, edit and delete)');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
