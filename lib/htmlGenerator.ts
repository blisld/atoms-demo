/**
 * Extracts a clean HTML document from an LLM response.
 * The model is instructed to return raw HTML, but may occasionally
 * include markdown fences or leading whitespace.
 */
export function extractHtml(raw: string): string {
  const trimmed = raw.trim()

  // Strip markdown code fences if present
  const fenceMatch = trimmed.match(/```(?:html)?\s*([\s\S]*?)```/i)
  if (fenceMatch) return fenceMatch[1].trim()

  // Find the HTML document boundaries
  const start = trimmed.indexOf('<!DOCTYPE')
  const end = trimmed.lastIndexOf('</html>')
  if (start !== -1 && end !== -1) {
    return trimmed.slice(start, end + 7)
  }

  return trimmed
}

/**
 * Derives a short session title from the first user message.
 */
export function deriveTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/\s+/g, ' ').trim()
  return cleaned.length > 40 ? cleaned.slice(0, 40) + '…' : cleaned
}

/**
 * Generates a random session ID.
 */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/**
 * The floating "Iterate →" bar injected into every previewed HTML page.
 *
 * Behaviour:
 * - Renders a fixed bottom bar with a text input and send button.
 * - On submit, fires window.parent.postMessage({ type: 'atoms-iterate', text })
 *   so the host Next.js app can pick it up and run another generation turn.
 * - Only injected at display time; stored/snapshot HTML stays clean so
 *   Claude never sees the bridge markup as context.
 */
const CHAT_BRIDGE = `
<style>
#__ab{position:fixed;bottom:0;left:0;right:0;z-index:2147483647;
  background:rgba(9,9,11,.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-top:1px solid rgba(255,255,255,.09);padding:10px 14px;
  display:flex;gap:8px;align-items:center;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  box-shadow:0 -8px 32px rgba(0,0,0,.4);}
#__ab_lbl{font-size:11px;color:rgba(255,255,255,.32);white-space:nowrap;
  user-select:none;flex-shrink:0;letter-spacing:.03em;}
#__ab_inp{flex:1;min-width:0;background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.13);border-radius:8px;
  padding:7px 12px;color:#f4f4f5;font-size:13px;outline:none;
  transition:border-color .15s;}
#__ab_inp:focus{border-color:rgba(99,102,241,.7);}
#__ab_inp::placeholder{color:rgba(255,255,255,.27);}
#__ab_btn{flex-shrink:0;background:#6366f1;color:#fff;border:none;
  border-radius:8px;padding:7px 16px;font-size:12px;font-weight:600;
  cursor:pointer;transition:background .15s,transform .1s;white-space:nowrap;
  display:flex;align-items:center;gap:5px;}
#__ab_btn:hover:not(:disabled){background:#4f46e5;}
#__ab_btn:active:not(:disabled){transform:scale(.96);}
#__ab_btn:disabled{opacity:.55;cursor:not-allowed;}
#__ab_ok{font-size:11px;color:#4ade80;white-space:nowrap;flex-shrink:0;
  opacity:0;transition:opacity .2s;}
</style>
<div id="__ab">
  <span id="__ab_lbl">✦ Atoms</span>
  <input id="__ab_inp" type="text" autocomplete="off"
    placeholder="Describe a change… e.g. make the nav sticky, add dark mode"/>
  <button id="__ab_btn">Iterate →</button>
  <span id="__ab_ok">✓ Sent!</span>
</div>
<script>
(function(){
  var inp=document.getElementById('__ab_inp');
  var btn=document.getElementById('__ab_btn');
  var ok=document.getElementById('__ab_ok');
  function dispatch(t){
    /* Layer 1: direct function call on parent window — most reliable */
    try{
      if(window.parent&&typeof window.parent.updatePreviewWithNewInstruction==='function'){
        window.parent.updatePreviewWithNewInstruction(t);
        return true;
      }
    }catch(e){}
    /* Layer 2: postMessage fallback */
    try{
      window.parent.postMessage({type:'atoms-iterate',text:t},'*');
      return true;
    }catch(e){}
    return false;
  }
  function send(){
    var t=inp.value.trim();
    if(!t||btn.disabled)return;
    var sent=dispatch(t);
    inp.value='';
    if(sent){
      ok.style.opacity='1';
      btn.disabled=true;
      btn.textContent='Generating…';
      setTimeout(function(){
        ok.style.opacity='0';
        btn.textContent='Iterate →';
        btn.disabled=false;
      },8000);
    }
  }
  btn.addEventListener('click',send);
  inp.addEventListener('keydown',function(e){if(e.key==='Enter')send();});
})();
</script>`

/**
 * Injects the Atoms chat bridge bar into an HTML string for display.
 * Inserts before </body> when possible; otherwise appends.
 *
 * Call this ONLY when rendering into the iframe — never before storing
 * the HTML as a snapshot or passing it to Claude.
 */
export function withChatBridge(html: string): string {
  if (!html) return html
  const idx = html.lastIndexOf('</body>')
  if (idx !== -1) {
    return html.slice(0, idx) + CHAT_BRIDGE + '\n' + html.slice(idx)
  }
  return html + CHAT_BRIDGE
}
