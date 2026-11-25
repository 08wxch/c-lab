'use strict';

const CC = {
  tokenKey: 'clab.token',
  userKey: 'clab.user',
  config: null,
  get token() { return localStorage.getItem(this.tokenKey) || ''; },
  get user() { try { return JSON.parse(localStorage.getItem(this.userKey) || 'null'); } catch { return null; } },
  setSession(token, user) { localStorage.setItem(this.tokenKey, token); localStorage.setItem(this.userKey, JSON.stringify(user)); },
  clear() { localStorage.removeItem(this.tokenKey); localStorage.removeItem(this.userKey); },
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
function inline(s) {
  let x = esc(s);
  x = x.replace(/`([^`]+)`/g, '<code>$1</code>');
  x = x.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  x = x.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return x;
}
function renderMarkdown(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  let out = '', inCode = false, code = [], list = null;
  const flushList = () => { if (list) { out += `</${list}>`; list = null; } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (!inCode) { flushList(); inCode = true; code = []; }
      else { out += `<pre><code>${esc(code.join('\n'))}</code></pre>`; inCode = false; }
      continue;
    }
    if (inCode) { code.push(line); continue; }
    if (!line.trim()) { flushList(); continue; }
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) { flushList(); out += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; continue; }
    if (/^>\s?/.test(line)) { flushList(); out += `<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`; continue; }
    if (/^\s*[-*]\s+/.test(line)) {
      if (list !== 'ul') { flushList(); out += '<ul>'; list = 'ul'; }
      out += `<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>`; continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (list !== 'ol') { flushList(); out += '<ol>'; list = 'ol'; }
      out += `<li>${inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`; continue;
    }
    if (/^\|.*\|$/.test(line) && i + 1 < lines.length && /^\|?[\s:-]+\|/.test(lines[i + 1])) {
      flushList();
      const cells = line.split('|').slice(1, -1).map(s => s.trim());
      out += `<table><thead><tr>${cells.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>`;
      i += 2;
      while (i < lines.length && /^\|.*\|$/.test(lines[i])) {
        out += `<tr>${lines[i].split('|').slice(1, -1).map(c => `<td>${inline(c.trim())}</td>`).join('')}</tr>`;
        i++;
      }
      i--;
      out += '</tbody></table>'; continue;
    }
    flushList(); out += `<p>${inline(line)}</p>`;
  }
  flushList();
  if (inCode) out += `<pre><code>${esc(code.join('\n'))}</code></pre>`;
  return out;
}

async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (CC.token) headers.Authorization = `Bearer ${CC.token}`;
  if (opts.body && typeof opts.body !== 'string') { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(opts.body); }
  const res = await fetch(path, { ...opts, headers });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status; err.data = data; throw err;
  }
  return data;
}
async function getConfig() {
  if (CC.config) return CC.config;
  CC.config = await api('/api/config');
  return CC.config;
}
async function requireAuth() {
  const cfg = await getConfig();
  if (!CC.token && cfg.demoMode && new URLSearchParams(location.search).get('demo') === '1') {
    CC.setSession('demo', { id: 'demo-admin', email: 'demo@clab.local', display_name: 'Demo Admin', role: 'admin' });
  }
  if (!CC.token) { location.replace('/login.html'); return null; }
  try {
    const { user } = await api('/api/me');
    CC.setSession(CC.token, user);
    return user;
  } catch (e) {
    CC.clear(); location.replace('/login.html'); return null;
  }
}
function logout() { CC.clear(); location.replace('/'); }

const ICONS = {
  arrow: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 10h12M11 5l5 5-5 5"/></svg>',
  back: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M16 10H4M9 5l-5 5 5 5"/></svg>',
  play: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M7 4.8v10.4l8-5.2z"/></svg>',
  spark: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2.8l1.7 5.5 5.5 1.7-5.5 1.7L10 17.2l-1.7-5.5-5.5-1.7 5.5-1.7z"/></svg>',
  book: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3.5 4.5A2.5 2.5 0 016 2h10v15H6a2.5 2.5 0 00-2.5 2.5z"/><path d="M3.5 4.5v15"/></svg>',
  grid: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="5.5" height="5.5" rx="1"/><rect x="11.5" y="3" width="5.5" height="5.5" rx="1"/><rect x="3" y="11.5" width="5.5" height="5.5" rx="1"/><rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1"/></svg>',
  users: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="2.5"/><path d="M2.5 16c.4-2.6 2.1-4 4.5-4s4.1 1.4 4.5 4"/><path d="M12.5 5.2a2.4 2.4 0 010 4.6M14 12.4c1.8.3 3 1.6 3.4 3.6"/></svg>',
  settings: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="2.6"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"/></svg>',
  logout: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3H4.5A1.5 1.5 0 003 4.5v11A1.5 1.5 0 004.5 17H8"/><path d="M12 6l4 4-4 4M16 10H7"/></svg>',
  close: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 5l10 10M15 5L5 15"/></svg>',
  check: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 10.5l4 4 8-9"/></svg>',
  sun: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="3.2"/><path d="M10 2v1.7M10 16.3V18M2 10h1.7M16.3 10H18M4.4 4.4l1.2 1.2M14.4 14.4l1.2 1.2M15.6 4.4l-1.2 1.2M5.6 14.4l-1.2 1.2"/></svg>',
};
function icon(name) { return ICONS[name] || ''; }
function toast(msg, type = '') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) { stack = document.createElement('div'); stack.className = 'toast-stack'; document.body.appendChild(stack); }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  if (type === 'bad') el.style.background = 'var(--oxide)';
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}
function topbarUser(user) {
  return `<div class="user-chip"><div class="avatar">${esc(initials(user?.display_name || user?.email))}</div><div class="meta"><strong>${esc(user?.display_name || user?.email || 'ผู้ใช้')}</strong><span>${user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'นักเรียน'}</span></div></div>`;
}

window.CC = CC; window.api = api; window.requireAuth = requireAuth; window.logout = logout;
window.renderMarkdown = renderMarkdown; window.esc = esc; window.icon = icon; window.toast = toast;
window.topbarUser = topbarUser; window.getConfig = getConfig; window.initials = initials;
