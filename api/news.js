export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
    // Try Forex Factory official JSON feed first
    const ffRes = await fetch(
      `https://nfs.faireconomy.media/ff_calendar_thisweek.json?version=${Date.now()}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.forexfactory.com/'
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (ffRes.ok) {
      const data = await ffRes.json();
      const events = data
        .filter(e => e.impact === 'High')
        .map(e => ({
          date: e.date,
          currency: e.country,
          event: e.title,
          actual: e.actual || '',
          forecast: e.forecast || '',
          previous: e.previous || '',
          source: 'forexfactory'
        }));
      return res.status(200).json({ ok: true, events, source: 'forexfactory' });
    }
  } catch (e) {}

  // Fallback: Trading Economics guest feed
  try {
    const today = new Date();
    const monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const fmt = d => d.toISOString().split('T')[0];

    const teRes = await fetch(
      `https://tradingeconomics.com/calendar/json?c=guest:guest&d1=${fmt(monday)}&d2=${fmt(sunday)}&importance=3`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://tradingeconomics.com/'
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (teRes.ok) {
      const data = await teRes.json();
      if (Array.isArray(data) && data.length) {
        const events = data.map(e => ({
          date: e.Date || '',
          currency: e.Currency || '',
          event: e.Event || e.Indicator || '',
          actual: e.Actual ?? '',
          forecast: e.Forecast ?? e.TEForecast ?? '',
          previous: e.Previous ?? '',
          source: 'tradingeconomics'
        })).filter(e => e.currency && e.event);
        return res.status(200).json({ ok: true, events, source: 'tradingeconomics' });
      }
    }
  } catch (e) {}

  // Both failed
  return res.status(200).json({
    ok: false,
    events: [],
    error: 'All sources unavailable'
  });
}
