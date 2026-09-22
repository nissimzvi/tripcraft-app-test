const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html');
const htmlEn=read('index-en.html');
const js=read('tripcraft-v109.js');
const finalJs=read('tripcraft-v109-final.js');
const sw=read('sw.js');

assert.strictEqual(html,htmlEn,'index.html and index-en.html must stay identical');
assert.match(html,/<title>TripCraft V109<\/title>/);
assert.match(html,/tripcraft-v109\.js\?v=109/);
assert.doesNotMatch(html,/tripcraft-v107\.js/);
assert.match(html,/tripcraft-logo-v109\.png\?v=109-final/);
assert.match(html,/tripcraft-v109-final\.js\?v=109-final/);
assert.doesNotMatch(html,/href="#import"/);
assert.match(html,/trip-slovakia\.html/);
assert.match(html,/id="plStart" type="date"/);
assert.match(html,/id="plEnd" type="date"/);
assert.match(html,/id="plRooms"[^>]*type="number"/);
assert.match(html,/value="breakfast" checked/);
assert.match(html,/value="half_board"/);
assert.match(html,/value="all_inclusive"/);
assert.match(html,/id="hotelStarChoices"/);
assert.match(html,/id="plannerSaveTrip"/);
assert.match(html,/id="plannerDiscardTrip"/);
assert.doesNotMatch(html,/רכב שכור/);

assert.match(js,/const IDLE_MS=30\*60\*1000/);
assert.match(js,/start\.min=today;end\.min=start\.value\|\|today/);
assert.match(js,/info\.couples>1\?`\$\{info\.couples\} זוגות`/);
assert.match(js,/p\.rooms=Math\.max/);
assert.match(js,/p\.hotelStarLevels=syncStars\(\)/);
assert.match(js,/tc-v108-built #planner>\.planner-actions/);
assert.match(js,/הטיול עדיין לא נשמר/);
assert.match(js,/בטוח למחוק את הטיול/);
assert.match(js,/\.delete\(\)\.eq\('id',id\)\.eq\('user_id',session\.user\.id\)/);
assert.match(js,/function displayDate\(value\).*?`\$\{match\[3\]\}-\$\{match\[2\]\}-\$\{match\[1\]\}`/s);
assert.match(js,/no_rooms:String\(rooms\(profile\)\)/);

const buildBlock=js.match(/async function handleBuild[\s\S]*?\n  function delegatedActions/)?.[0]||'';
assert.ok(buildBlock,'handleBuild implementation must exist');
assert.doesNotMatch(buildBlock,/await\s+[^;\n]*saveDraft\s*\(/,'Build must not persist before explicit Save Trip');
assert.match(buildBlock,/markBuilt/,'Build must mark the draft as unsaved');

assert.match(finalJs,/#import,.focus-title\.import,a\[href="#import"\]/);
assert.match(finalJs,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(finalJs,/height:calc\(100svh - 102px\)/);
assert.match(sw,/const CACHE='tripcraft-v109-final'/);
for(const required of ['./index.html','./index-en.html','./tripcraft-v109.js','./tripcraft-v109-final.js','./tripcraft-logo-v109.png']){
  assert.ok(sw.includes(`'${required}'`),`service worker must cache ${required}`);
}

const htmlFiles=[];
function walk(dir){
  for(const name of fs.readdirSync(dir)){
    if(name==='qa')continue;
    const file=path.join(dir,name),stat=fs.statSync(file);
    if(stat.isDirectory())walk(file);else if(name.endsWith('.html'))htmlFiles.push(file);
  }
}
walk(root);
const missing=[];
for(const file of htmlFiles){
  const source=fs.readFileSync(file,'utf8');
  for(const match of source.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)){
    let ref=match[1];
    if(!ref||/^(?:https?:|mailto:|tel:|javascript:|data:|#)/i.test(ref)||ref.includes('${'))continue;
    ref=ref.split(/[?#]/)[0];
    const target=path.resolve(path.dirname(file),ref);
    if(!fs.existsSync(target))missing.push(`${path.relative(root,file)} -> ${match[1]}`);
  }
}
assert.deepStrictEqual(missing,[],'all local HTML resources must exist');

console.log(`V109 static tests: PASS (${htmlFiles.length} HTML files, all local resources resolved)`);
