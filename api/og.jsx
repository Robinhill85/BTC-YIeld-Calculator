import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler(req) {
  const { searchParams } = new URL(req.url);

  const missed = parseInt(searchParams.get('missed') || '0');
  const btc = parseFloat(searchParams.get('btc') || '1').toFixed(2);
  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';
  const isProjection = searchParams.get('projection') === '1';

  const formattedMissed = missed.toLocaleString('en-US');
  const label = isProjection ? 'Opportunity' : 'Missed';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0A0A0A',
          padding: '56px 64px',
          fontFamily: 'sans-serif',
          border: '1px solid #222',
        }}
      >
        {/* Top: Logo + tagline */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#ffffff', fontSize: '36px', fontWeight: 800, letterSpacing: '4px' }}>
            IXS®
          </div>
          <div style={{ color: '#555555', fontSize: '22px' }}>
            btc-yield-calculator.vercel.app
          </div>
        </div>

        {/* Middle: Main stat */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#888888', fontSize: '28px', marginBottom: '16px', fontWeight: 500 }}>
            {isProjection ? 'Projected yield opportunity' : 'Yield left on the table'}
          </div>
          <div style={{ color: '#F7931A', fontSize: '88px', fontWeight: 800, lineHeight: 1 }}>
            ${formattedMissed}
          </div>
          <div style={{ color: '#ffffff', fontSize: '34px', fontWeight: 600, marginTop: '20px' }}>
            {label} by holding {btc} BTC without yield
          </div>
          {start && end && (
            <div style={{ color: '#666666', fontSize: '26px', marginTop: '12px' }}>
              {start} → {end}
            </div>
          )}
        </div>

        {/* Bottom: CTA */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #2A2A2A',
            paddingTop: '24px',
          }}
        >
          <div style={{ color: '#888888', fontSize: '22px' }}>
            Calculate your missed yield →
          </div>
          <div
            style={{
              background: '#F7931A',
              color: '#000000',
              fontSize: '22px',
              fontWeight: 700,
              padding: '12px 28px',
              borderRadius: '8px',
            }}
          >
            ixs.finance/btc-real-yield
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
