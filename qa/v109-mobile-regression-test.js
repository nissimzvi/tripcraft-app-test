const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const english=fs.readFileSync('index-en.html','utf8');
const fix=fs.readFileSync('tripcraft-v109-mobile-fixes.js','utf8');

assert.strictEqual(html,english,'Hebrew and English entry files must use the same application build');
assert.ok(html.includes('tripcraft-v109-mobile-fixes.js?v=109-final-mobile'),'final mobile fixes must load');
assert.ok(html.indexOf('tripcraft-v109-mobile-fixes.js')>html.indexOf('tripcraft-v109-final.js'),'mobile fixes must load last');

['plannerGlobalPostInput','plannerChatInput','plannerDayChatInput','plannerDayTitleInput'].forEach(id=>{
  assert.ok(fix.includes(`'${id}'`),`${id} must be enabled for iPhone keyboard focus`);
});
assert.ok(fix.includes("document.addEventListener('touchend'"),'touch input support must be installed');
assert.ok(fix.includes("document.addEventListener('focusin'"),'focused controls must be kept above the keyboard');
assert.ok(fix.includes("#plannerDraftDays .day-action button:first-child"),'day opening must use delegated mobile handling');
assert.ok(fix.includes("grid-template-columns:minmax(0,1fr) minmax(0,1fr)"),'save and discard must be in one row');
assert.ok(fix.includes("position:fixed!important"),'final actions must remain visible');
assert.ok(fix.includes("location.hash = '#account'"),'discard must return to the user account');
assert.ok(fix.includes("TripCraftV102?.saveDraft"),'save must use the persistent trip API');
assert.ok(fix.includes("previously saved trip")&&fix.includes('טיול שנשמר בעבר'),'discard warning must promise preservation in both languages');
assert.ok(fix.includes("tripcraftMobileFix = 'V109-final'"),'build marker must identify the final V109 mobile fix');

console.log('V109 mobile regression tests: PASS (day, keyboard, fixed actions, save/discard and bilingual status)');
