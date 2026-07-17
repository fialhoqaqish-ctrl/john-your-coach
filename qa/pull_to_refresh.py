import asyncio, json, os, re
from collections import Counter
from pathlib import Path
from playwright.async_api import async_playwright

SHOTS = Path("/tmp/browser/qa/shots"); SHOTS.mkdir(parents=True, exist_ok=True)
BASE_API = "https://mock.john.local"

DASHBOARD = {
  "readiness": {"state": "ready", "score": 82, "driver": "Solid sleep + easy day yesterday"},
  "coach_line": "Keep it easy today.",
  "steps": {"today": 8123, "target": 10000, "days": [
    {"date":"2026-07-11","steps":9000},{"date":"2026-07-12","steps":10500},
    {"date":"2026-07-13","steps":6000},{"date":"2026-07-14","steps":8500},
    {"date":"2026-07-15","steps":11200},{"date":"2026-07-16","steps":7800},
    {"date":"2026-07-17","steps":8123}]},
  "fitness_verdict": {"word":"HOLDING","pct":2,"confidence":"medium"},
  "efficiency": {"week":[],"month":[
    {"period":"2026-06-01","median_pace_sec":330},
    {"period":"2026-06-15","median_pace_sec":322},
    {"period":"2026-07-01","median_pace_sec":318}],"quarter":[]},
  "rhythm": {"weeks":[
    {"week":"2026-06-15","volume":3},{"week":"2026-06-22","volume":5},
    {"week":"2026-06-29","volume":6},{"week":"2026-07-06","volume":4}],
    "band_min":4,"band_max":8},
  "wellness": {"rhr_series":[{"date":"2026-07-10","rhr":52},{"date":"2026-07-17","rhr":50}]},
  "body": {"vo2max_series":[{"date":"2026-06-01","vo2max":48.1},{"date":"2026-07-01","vo2max":49.2}],
           "weight":[{"date":f"2026-07-{d:02d}","weight":78.0 - d*0.05} for d in range(1,18)]},
  "nutrition": {"protein_g":110,"protein_target_g":150,"history":[
    {"date":f"2026-07-{d:02d}","protein_g":120+d,"target":150} for d in range(1,15)]},
  "sleep_series":[{"date":f"2026-07-{d:02d}","hours":7 + (d%3)*0.4} for d in range(11,18)],
  "next_race":{"name":"Berlin Marathon","date":"2026-09-27"},
  "goals":[{"name":"Sub-3:15 Berlin","score":72,"note":"On track"}],
  "north_star":{"line":"Run Berlin under 3:15.","detail":"Then keep training year round.","review_date":"2026-08-01"}
}

async def main():
  results = {"tabs": {}}
  async with async_playwright() as pw:
    browser = await pw.chromium.launch(headless=True)
    ctx = await browser.new_context(viewport={"width":390,"height":1600}, is_mobile=True, has_touch=True, device_scale_factor=2)
    page = await ctx.new_page()

    calls = Counter()
    async def handle(route):
      url = route.request.url
      path = url.replace(BASE_API,"")
      calls[path] += 1
      if path.startswith("/api/dashboard"):
        await route.fulfill(status=200, content_type="application/json", body=json.dumps(DASHBOARD))
      elif path.startswith("/api/messages"):
        await route.fulfill(status=200, content_type="application/json", body=json.dumps({"messages":[]}))
      elif path.startswith("/api/today"):
        await route.fulfill(status=200, content_type="application/json", body=json.dumps({"sessions":[]}))
      elif path.startswith("/api/workout"):
        await route.fulfill(status=200, content_type="application/json", body=json.dumps({"exercises":[]}))
      else:
        await route.fulfill(status=200, content_type="application/json", body="{}")
    await ctx.route(f"{BASE_API}/**", handle)

    await page.goto("http://localhost:8080/login", wait_until="domcontentloaded")
    await page.evaluate(f"""
      localStorage.setItem('john.base', {json.dumps(BASE_API)});
      localStorage.setItem('john.token', 'test-token');
    """)

    async def pull(page):
      # Touchscreen drag from top downward
      ts = page.touchscreen
      # sequence of moves via CDP: playwright touchscreen only has tap; use dispatch
      await page.evaluate("""async () => {
        const el = document.querySelector("main") || document.body;
        function t(type, y){
          const touch = new Touch({identifier:1,target:el,clientX:120,clientY:y});
          const ev = new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[touch],targetTouches:type==='touchend'?[]:[touch],changedTouches:[touch]});
          el.dispatchEvent(ev);
        }
        t('touchstart',10);
        for (let y=20;y<=260;y+=20){ t('touchmove',y); await new Promise(r=>setTimeout(r,16)); }
        await new Promise(r=>setTimeout(r,50));
        t('touchend',260);
      }""")

    for tab, path in [("today","/today"),("trends","/trends"),("body","/body"),("plan","/plan")]:
      calls.clear()
      await page.goto(f"http://localhost:8080{path}", wait_until="networkidle")
      # wait for initial dashboard fetch
      await page.wait_for_timeout(400)
      initial_dashboard = sum(v for k,v in calls.items() if k.startswith("/api/dashboard"))
      # ensure at top
      await page.evaluate("window.scrollTo(0,0)")
      scroll_before = await page.evaluate("window.scrollY")

      calls.clear()
      await pull(page)
      # spinner visible during refresh
      await page.wait_for_timeout(120)
      spinner_visible = await page.evaluate("""
        (() => {
          const s = document.querySelector('.animate-spin');
          if(!s) return false;
          const p = s.closest('[aria-hidden]');
          if(!p) return true;
          const style = getComputedStyle(p);
          return parseFloat(style.opacity) > 0.1;
        })()
      """)
      await page.wait_for_timeout(900)
      after_dashboard = sum(v for k,v in calls.items() if k.startswith("/api/dashboard"))
      scroll_after = await page.evaluate("window.scrollY")
      await page.screenshot(path=str(SHOTS/f"{tab}.png"))
      results["tabs"][tab] = {
        "initial_dashboard_fetches": initial_dashboard,
        "refetched_dashboard": after_dashboard,
        "spinner_visible_mid_pull": spinner_visible,
        "scroll_preserved": scroll_before == scroll_after,
        "scroll_before": scroll_before, "scroll_after": scroll_after,
        "all_calls": dict(calls),
      }

    # Extra: preserve state — toggle nothing complex but confirm localStorage 'john.token' still present
    token_ok = await page.evaluate("localStorage.getItem('john.token')") == "test-token"
    results["token_preserved"] = token_ok

    # Reduced motion: verify pull still refetches (should still work — reduced motion applies to swipe animation)
    await browser.close()
  print(json.dumps(results, indent=2))

asyncio.run(main())
