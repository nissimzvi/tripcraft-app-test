const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html'),htmlEn=read('index-en.html');
const v108=read('tripcraft-v109.js'),finalJs=read('tripcraft-v109-final.js');

assert.strictEqual(html,htmlEn,'Hebrew and English entry files must use the same tested application shell');
assert.doesNotMatch(html,/href="#import"/,'Mobile must not expose Import Trip');
assert.doesNotMatch(html,/class="home-option"/,'Legacy lower home option cards must be removed');
assert.match(html,/class="tc-home-demo"[^>]+href="trip-slovakia\.html"/,'Home must include the public sample trip');
assert.match(html,/class="btn tc-home-account"[^>]+href="#account"/,'Home must include My Trips for authenticated users');
assert.match(html,/planner\.step===1&&plannerStep1Part===1\)\{location\.hash='#account'/,'Planner Back must return to the account from the first step');
assert.match(v108,/const target=hasUsableLocalSession\(\)\?'#account':'#home'/,'Logo must route authenticated users to account');
assert.match(finalJs,/height:calc\(100svh - 102px\)/,'Mobile home must fit the viewport');
assert.match(finalJs,/overflow-x:hidden!important/,'Horizontal movement must be prevented');
assert.match(finalJs,/#tcAccountBody \.v102-trip-card>\.cta\{display:grid!important;grid-template-columns:repeat\(3/,'Trip actions must share one row');
assert.match(finalJs,/\.lang-link\.active\{display:none!important\}/,'Only the alternate language control must be visible');
assert.match(finalJs,/MutationObserver/,'Dynamically rendered English content must be localized');
assert.match(finalJs,/HEBREW\.test\(out\).*fallbackFor/s,'English guard must remove untranslated interface fragments');

const htmlFiles=[];
function walk(dir){for(const name of fs.readdirSync(dir)){if(name==='qa')continue;const file=path.join(dir,name),stat=fs.statSync(file);if(stat.isDirectory())walk(file);else if(name.endsWith('.html'))htmlFiles.push(file)}}
walk(root);
for(const file of htmlFiles){const source=fs.readFileSync(file,'utf8');if(source.includes('TripCraft'))assert.match(source,/tripcraft-logo-v109\.png\?v=109-final/,`${path.relative(root,file)} must use the final logo asset`)}

console.log(`V109 final acceptance tests: PASS (${htmlFiles.length} pages, final logo and mobile requirements verified)`);
