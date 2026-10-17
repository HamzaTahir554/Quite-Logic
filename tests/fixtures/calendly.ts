import type { Page } from "@playwright/test";

// Deterministic third-party stand-in: exercises the official API/event contract.
// It never contacts Calendly's booking API or creates a real appointment.
export const widgetScript = `window.Calendly = {
  initInlineWidget: function(options) {
    var frame = document.createElement('iframe');
    frame.src = options.url;
    frame.style.cssText = 'width:100%;height:100%;border:0;display:block;';
    options.parentElement.appendChild(frame);
  }
};`;

export const calendarFixture = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Calendar test fixture</title><style>
*{box-sizing:border-box}body{margin:0;padding:28px 24px;background:#303944;color:#f0f1f8;font:14px/1.6 Arial,sans-serif;min-width:320px}h1{font-size:23px;margin:12px 0 22px}h2{font-size:18px;margin:20px 0}p{color:#c8d5e5}button,input,textarea{font:inherit}button{min-height:44px;padding:10px 14px;border:1px solid #98bdf060;border-radius:10px;color:#f0f1f8;background:#4b5c70;cursor:pointer}button[aria-pressed=true],button[type=submit]{background:#245fb8;border-color:#94bcfa}.choices{display:flex;flex-wrap:wrap;gap:10px}label{display:block;margin:16px 0}input,textarea{display:block;margin-top:6px;width:100%;padding:12px;color:#f0f1f8;background:#41515f;border:1px solid #aecdf380;border-radius:8px}footer{margin-top:36px;color:#c3d4e7;font-size:12px}small{font-size:10px;letter-spacing:.08em;color:#a9caff}[hidden]{display:none!important}:focus-visible{outline:2px solid #b4d4ff;outline-offset:3px}</style></head><body>
<small>CALENDAR TEST FIXTURE — NO APPOINTMENTS CREATED</small>
<div id="choose"><h1>Select a date & time</h1><p>30-minute conversation · Your selected timezone</p><h2>Choose a date</h2><div class="choices"><button id="date" aria-pressed="false">Tuesday, 20 October</button></div><div id="slots" hidden><h2>Available times</h2><div class="choices"><button id="time" aria-pressed="false">10:00 AM</button><button id="other-time">11:00 AM</button></div></div></div>
<form id="details" hidden><button type="button" id="back">← Choose another time</button><h1>Enter your details</h1><p>Tuesday, 20 October · 10:00 AM · Test timezone</p><label>Name<input name="name" autocomplete="name" required></label><label>Email<input name="email" type="email" autocomplete="email" required></label><label>What would you like to discuss?<textarea name="context" rows="3"></textarea></label><button type="submit">Schedule Event</button></form>
<div id="success" hidden><h1>You are scheduled</h1><p>30-minute conversation</p><p>Tuesday, 20 October · 10:00 AM · Test timezone</p><p>A test confirmation was shown. Nothing was sent.</p></div>
<footer>Powered by Calendly</footer><script>
function send(event,payload){parent.postMessage({event:event,payload:payload||{}},'*')}
send('calendly.event_type_viewed');
document.querySelector('#date').onclick=function(){this.setAttribute('aria-pressed','true');document.querySelector('#slots').hidden=false};
document.querySelector('#time').onclick=function(){this.setAttribute('aria-pressed','true');document.querySelector('#choose').hidden=true;document.querySelector('#details').hidden=false;send('calendly.date_and_time_selected')};
document.querySelector('#other-time').onclick=document.querySelector('#time').onclick;
document.querySelector('#back').onclick=function(){document.querySelector('#choose').hidden=false;document.querySelector('#details').hidden=true;send('calendly.event_type_viewed')};
document.querySelector('#details').onsubmit=function(e){e.preventDefault();if(!this.reportValidity())return;this.hidden=true;document.querySelector('#success').hidden=false;send('calendly.event_scheduled',{event:{uri:'https://api.calendly.com/scheduled_events/test'},invitee:{uri:'https://api.calendly.com/scheduled_events/test/invitees/test'}})};
</script></body></html>`;

export async function mockCalendly(page: Page) {
  await page.route(
    "https://assets.calendly.com/assets/external/widget.js",
    (route) =>
      route.fulfill({ contentType: "text/javascript", body: widgetScript }),
  );
  await page.route("https://calendly.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: calendarFixture }),
  );
}
