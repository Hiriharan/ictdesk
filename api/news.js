export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.forexfactory.com/',
    'Origin': 'https://www.forexfactory.com'
  };

  for (const url of [
    'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
    'https://nfs.faireconomy.media/ff_calendar_nextweek.json'
  ]) {
    try {
      const r = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length) {
          const events = data.filter(e => e.impact === 'High').map(e => ({
            date: e.date, currency: e.country, event: e.title,
            actual: e.actual || '', forecast: e.forecast || '', previous: e.previous || '',
            source: 'forexfactory'
          }));
          if (events.length > 0) return res.status(200).json({ ok: true, events, source: 'forexfactory' });
        }
      }
    } catch(e) {}
  }

  try {
    const today = new Date();
    const mon = new Date(today);
    mon.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
    const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
    const fmt = d => d.toISOString().split('T')[0];
    const r = await fetch(`https://tradingeconomics.com/calendar/json?c=guest:guest&d1=${fmt(mon)}&d2=${fmt(sun)}&importance=3`, { headers, signal: AbortSignal.timeout(12000) });
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data) && data.length) {
        const events = data.map(e => ({ date: e.Date||'', currency: e.Currency||'', event: e.Event||e.Indicator||'', actual: e.Actual??'', forecast: e.Forecast??e.TEForecast??'', previous: e.Previous??'', source: 'tradingeconomics' })).filter(e => e.currency && e.event);
        if (events.length > 0) return res.status(200).json({ ok: true, events, source: 'tradingeconomics' });
      }
    }
  } catch(e) {}

  const now = new Date();
  const ws = new Date(now);
  ws.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  const staticEvents = [
    {day:1,h:9,m:0,cur:'EUR',name:'German CPI m/m'},
    {day:1,h:14,m:0,cur:'USD',name:'ISM Manufacturing PMI'},
    {day:2,h:9,m:30,cur:'GBP',name:'Claimant Count Change'},
    {day:2,h:13,m:30,cur:'USD',name:'Core CPI m/m'},
    {day:2,h:13,m:30,cur:'USD',name:'CPI m/m'},
    {day:3,h:9,m:30,cur:'GBP',name:'CPI y/y'},
    {day:3,h:13,m:30,cur:'USD',name:'Core PPI m/m'},
    {day:3,h:13,m:30,cur:'USD',name:'PPI m/m'},
    {day:3,h:18,m:0,cur:'USD',name:'FOMC Meeting Minutes'},
    {day:4,h:12,m:45,cur:'EUR',name:'ECB Rate Decision'},
    {day:4,h:13,m:30,cur:'EUR',name:'ECB Press Conference'},
    {day:4,h:13,m:30,cur:'USD',name:'Unemployment Claims'},
    {day:4,h:13,m:30,cur:'USD',name:'Retail Sales m/m'},
    {day:5,h:9,m:30,cur:'GBP',name:'GDP m/m'},
    {day:5,h:13,m:30,cur:'USD',name:'Non-Farm Payrolls'},
    {day:5,h:13,m:30,cur:'USD',name:'Unemployment Rate'},
    {day:5,h:13,m:30,cur:'USD',name:'Average Hourly Earnings m/m'},
  ].map(e => {
    const d = new Date(ws);
    d.setUTCDate(ws.getUTCDate() + e.day - 1);
    d.setUTCHours(e.h, e.m, 0, 0);
    return { date: d.toISOString(), currency: e.cur, event: e.name, actual:'', forecast:'', previous:'', source:'static' };
  });

  return res.status(200).json({ ok: true, events: staticEvents, source: 'static' });
}
