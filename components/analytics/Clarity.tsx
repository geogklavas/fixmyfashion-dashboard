import Script from 'next/script'

// Microsoft Clarity heatmap / session-replay snippet.
// Renders nothing unless NEXT_PUBLIC_CLARITY_ID is set so dev / preview
// environments stay quiet. The script is loaded with strategy="afterInteractive"
// so it does not block first paint.
export function Clarity() {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID
  if (!id) return null
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${id}");
      `}
    </Script>
  )
}
