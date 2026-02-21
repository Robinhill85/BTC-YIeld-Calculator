import { ImageResponse } from '@vercel/og';
import React from 'react';

export const config = { runtime: 'edge' };

const e = React.createElement;

export default function handler(req) {
  const { searchParams } = new URL(req.url);

  const isGeneric = searchParams.get('generic') === '1';
  const missed = parseInt(searchParams.get('missed') || '0');
  const btc = parseFloat(searchParams.get('btc') || '1').toFixed(2);
  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';
  const isProjection = searchParams.get('projection') === '1';

  const formattedMissed = missed.toLocaleString('en-US');
  const label = isProjection ? 'Opportunity' : 'Missed';

  const container = e('div', {
    style: {
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: '#0A0A0A',
      padding: '56px 64px',
      fontFamily: 'sans-serif',
    },
  },
    // Top: Logo + URL
    e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      e('div', { style: { color: '#ffffff', fontSize: '36px', fontWeight: 800, letterSpacing: '4px' } }, 'IXS\u00AE'),
      e('div', { style: { color: '#555555', fontSize: '22px' } }, 'www.btcyieldcalculator.com'),
    ),

    // Middle
    isGeneric
      ? e('div', { style: { display: 'flex', flexDirection: 'column' } },
          e('div', { style: { color: '#888888', fontSize: '28px', fontWeight: 500, marginBottom: '20px' } },
            'Most BTC holders are leaving money on the table'
          ),
          e('div', { style: { color: '#F7931A', fontSize: '80px', fontWeight: 800, lineHeight: 1.1 } },
            'How much yield\ndid you miss?'
          ),
          e('div', { style: { color: '#ffffff', fontSize: '32px', fontWeight: 500, marginTop: '24px' } },
            'Enter your BTC amount and start date to find out.'
          ),
        )
      : e('div', { style: { display: 'flex', flexDirection: 'column' } },
          e('div', { style: { color: '#888888', fontSize: '28px', fontWeight: 500, marginBottom: '16px' } },
            isProjection ? 'Projected yield opportunity' : 'Yield left on the table'
          ),
          e('div', { style: { color: '#F7931A', fontSize: '88px', fontWeight: 800, lineHeight: 1 } },
            `$${formattedMissed} ${label}`
          ),
          e('div', { style: { color: '#ffffff', fontSize: '34px', fontWeight: 600, marginTop: '20px' } },
            `from holding ${btc} BTC without yield`
          ),
          start && end
            ? e('div', { style: { color: '#666666', fontSize: '26px', marginTop: '12px' } }, `${start} \u2192 ${end}`)
            : null,
        ),

    // Bottom: CTA bar
    e('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid #2A2A2A',
        paddingTop: '24px',
      },
    },
      e('div', { style: { color: '#888888', fontSize: '22px' } }, 'Calculate your missed yield \u2192'),
      e('div', {
        style: {
          background: '#F7931A',
          color: '#000000',
          fontSize: '22px',
          fontWeight: 700,
          padding: '12px 28px',
          borderRadius: '8px',
        },
      }, 'www.btcyieldcalculator.com'),
    ),
  );

  return new ImageResponse(container, { width: 1200, height: 630 });
}
