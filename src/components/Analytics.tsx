'use client';

import Script from 'next/script';

// Charge les pixels/analytics UNIQUEMENT si l'ID correspondant est défini dans
// les variables d'environnement Railway (NEXT_PUBLIC_*). Aucun ID = aucun script.
//   - NEXT_PUBLIC_META_PIXEL_ID    → Pixel Meta (Facebook/Instagram)
//   - NEXT_PUBLIC_TIKTOK_PIXEL_ID  → Pixel TikTok
//   - NEXT_PUBLIC_GA_ID            → Google Analytics 4 (ex: G-XXXXXXX)
const META = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TIKTOK = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
const GA = process.env.NEXT_PUBLIC_GA_ID;

export default function Analytics() {
  return (
    <>
      {GA && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA}');
          `}</Script>
        </>
      )}

      {META && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META}');
          fbq('track', 'PageView');
        `}</Script>
      )}

      {TIKTOK && (
        <Script id="tiktok-pixel" strategy="afterInteractive">{`
          !function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
          ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
          ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
          for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
          ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
          ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
          ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,
          ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");
          o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;
          var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
          ttq.load('${TIKTOK}');
          ttq.page();
          }(window, document, 'ttq');
        `}</Script>
      )}
    </>
  );
}
