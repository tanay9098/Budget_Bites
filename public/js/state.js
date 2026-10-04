// Per-tab session state (latest agent result). Cleared when the tab closes.
let current = null;
try { current = JSON.parse(sessionStorage.getItem('bb.result')); } catch { current = null; }
export const getCurrent = () => current;
export function setCurrent(v) { current = v; try { sessionStorage.setItem('bb.result', JSON.stringify(v)); } catch { /* storage unavailable */ } }
