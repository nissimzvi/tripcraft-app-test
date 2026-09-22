const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const config = fs.readFileSync(path.join(root, 'tripcraft-config.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'tripcraft-v109.js'), 'utf8');
const he = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const en = fs.readFileSync(path.join(root, 'index-en.html'), 'utf8');
const tag = 'https://www.anrdoezrs.net/am/101885723/include/allCj/sid/tripcraft_booking/impressions/page/am.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(config.includes("cjPublisherTagEnabled: true"), 'CJ tag is not enabled in config');
assert(config.includes("cjPublisherId: '101885723'"), 'CJ publisher ID is missing');
assert(config.includes("cjSid: 'tripcraft_booking'"), 'CJ SID is missing');
assert(he.includes(tag), 'CJ tag is missing from Hebrew entry page');
assert(en.includes(tag), 'CJ tag is missing from English entry page');
assert(app.includes('config.cjPublisherTagEnabled'), 'Affiliate status does not recognize CJ');
assert(app.includes('https://www.booking.com/searchresults.html?'), 'Booking search links are missing');

console.log('V109 CJ/Booking integration tests: PASS');
