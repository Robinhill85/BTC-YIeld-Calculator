export const config = { runtime: 'edge' };

export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const params = searchParams.toString();

  const missed = parseInt(searchParams.get('missed') || '0');
  const btc = parseFloat(searchParams.get('btc') || '1').toFixed(2);
  const isProjection = searchParams.get('projection') === '1';

  const formattedMissed = missed.toLocaleString('en-US');

  const title = isProjection
    ? `I could gain $${formattedMissed} by earning yield on my ${btc} BTC`
    : `I left $${formattedMissed} on the table by not earning yield on my ${btc} BTC`;

  const description = 'Calculate how much yield you missed on your Bitcoin — powered by IXS Finance.';
  const calculatorUrl = 'https://www.btcyieldcalculator.com';
  const ogImageUrl = `https://www.btcyieldcalculator.com/api/og?${params.replace(/&/g, '&amp;')}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${description}">

  <!-- Open Graph -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${calculatorUrl}">
  <meta property="og:type" content="website">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImageUrl}">

  <meta http-equiv="refresh" content="0; url=${calculatorUrl}">
</head>
<body>
  <p>Redirecting to BTC Yield Calculator...</p>
  <script>window.location.href = '${calculatorUrl}';</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
