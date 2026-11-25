'use strict';

let user = null;
let lessons = [];
let editingId = null;
function qs(id) { return document.getElementById(id); }

async function boot() {
  user = await requireAuth(); if (!user) return;
  if (user.role !== 'admin') { location.replace('/learn.html'); return; }
  qs('adminUser').innerHTML = topbarUser(user);
  qs('logout').addEventListener('click', e => { e.preventDefault(); logout(); });
  document.querySelectorAll('[data-tab]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); showTab(a.dataset.tab); }));
  showTab(location.hash.replace('#', '') || 'overview');
}
function showTab(tab) {
  document.querySelectorAll('[data-tab]').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
  history.replaceState(null, '', '#' + tab);
  if (tab === 'overview') loadOverview();
  if (tab === 'lessons') loadLessons();
  if (tab === 'users') loadUsers();
  if (tab === 'settings') loadSettings();
}
async function loadOverview() {
  const o = await api('/api/admin/overview');
  qs('adminMain').innerHTML = `
    <header class="admin-head"><div><h1>ภาพรวมระบบ</h1><p>ข้อมูลจากฐานข้อมูลปัจจุบัน · ${new Date().toLocaleDateString('th-TH')}</p></div><a class="btn" href="/learn.html">ดูหน้าเรียน</a></header>
    <div class="stat-row">
      <div class="stat"><div class="k">ผู้ใช้</div><div class="v">${o.users}</div><div class="d">บัญชีทั้งหมด</div></div>
      <div class="stat"><div class="k">บทเรียน</div><div class="v">${o.lessons}</div><div class="d">เผยแพร่ ${o.published} บท</div></div>
      <div class="stat"><div class="k">เรียนจบ</div><div class="v">${o.completions}</div><div class="d">ครั้งที่บันทึก completed</div></div>
    </div>
    <div class="admin-grid">
      <section class="panel"><h2>จัดการเนื้อหา</h2><p class="panel-sub">เพิ่ม แก้ไข หรือเผยแพร่บทเรียน</p><button class="btn" data-goto="lessons">ไปที่บทเรียน</button></section>
      <section class="panel"><h2>ตั้งค่า AI</h2><p class="panel-sub">API key ถูกเข้ารหัสฝั่ง server และไม่ส่งกลับมา</p><button class="btn" data-goto="settings">ไปที่ตั้งค่า</button></section>
    </div>
    <section class="panel"><h2>เริ่มต้นเร็ว</h2><p class="panel-sub">ถ้าฐานข้อมูลว่าง สามารถโหลดบทเรียนตัวอย่าง 5 บทที่เตรียมไว้ได้</p><button class="btn" id="seedBtn">โหลดบทเรียนตัวอย่าง</button></section>`;
  qs('adminMain').querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.goto)));
  qs('seedBtn').addEventListener('click', async () => {
    try { const r = await api('/api/admin/seed', { method: 'POST' }); toast(`โหลด ${r.lessons} บทเรียนแล้ว`); loadOverview(); }
    catch (e) { toast(e.message, 'bad'); }
  });
}
async function loadLessons() {
  const r = await api('/api/admin/lessons'); lessons = r.lessons || [];
  qs('adminMain').innerHTML = `
    <header class="admin-head"><div><h1>บทเรียน</h1><p>${lessons.length} บท · แก้ไขเนื้อหาและโจทย์ใน editor</p></div><button class="btn primary" id="newLesson">+ บทเรียนใหม่</button></header>
    <section class="panel"><div style="overflow:auto"><table class="data-table"><thead><tr><th>ลำดับ</th><th>ชื่อ</th><th>บท</th><th>สถานะ</th><th></th></tr></thead><tbody>
    ${lessons.length ? lessons.map(l => `<tr><td class="mono">${l.order_index}</td><td><strong>${esc(l.title)}</strong><div class="small muted">${esc(l.summary || '')}</div></td><td>${esc(l.chapter || '—')}</td><td><span class="tag ${l.is_published !== false ? 'on' : 'off'}">${l.is_published !== false ? 'เผยแพร่' : 'ซ่อน'}</span></td><td><div class="actions"><a class="btn ghost sm" href="/lesson.html?id=${encodeURIComponent(l.id)}" target="_blank">ดู</a><button class="btn ghost sm" data-edit="${esc(l.id)}">แก้ไข</button><button class="btn danger sm" data-del="${esc(l.id)}">ลบ</button></div></td></tr>`).join('') : '<tr><td colspan="5"><div class="empty">ยังไม่มีบทเรียน</div></td></tr>'}
    </tbody></table></div></section>`;
  qs('newLesson').addEventListener('click', () => openLesson(null));
  qs('adminMain').querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openLesson(b.dataset.edit)));
  qs('adminMain').querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('ลบบทเรียนนี้หรือไม่?')) return;
    try { await api('/api/admin/lessons/' + encodeURIComponent(b.dataset.del), { method: 'DELETE' }); toast('ลบแล้ว'); loadLessons(); }
    catch (e) { toast(e.message, 'bad'); }
  }));
}
function openLesson(id) {
  editingId = id;
  const l = lessons.find(x => x.id === id) || { title: '', chapter: '', summary: '', content_md: '', starter_code: '', stdin: '', expected_output: '', challenge_md: '', order_index: lessons.length + 1, is_published: true };
  qs('dialogTitle').textContent = id ? 'แก้ไขบทเรียน' : 'บทเรียนใหม่';
  qs('f_id').value = l.id || '';
  qs('f_title').value = l.title || '';
  qs('f_chapter').value = l.chapter || '';
  qs('f_summary').value = l.summary || '';
  qs('f_content').value = l.content_md || '';
  qs('f_starter').value = l.starter_code || '';
  qs('f_stdin').value = l.stdin || '';
  qs('f_expected').value = l.expected_output || '';
  qs('f_challenge').value = l.challenge_md || '';
  qs('f_order').value = l.order_index || 1;
  qs('f_published').checked = l.is_published !== false;
  qs('lessonDialog').showModal();
}
async function saveLesson() {
  const lesson = {
    id: qs('f_id').value || undefined,
    title: qs('f_title').value.trim(), chapter: qs('f_chapter').value.trim(),
    summary: qs('f_summary').value.trim(), content_md: qs('f_content').value,
    starter_code: qs('f_starter').value, stdin: qs('f_stdin').value,
    expected_output: qs('f_expected').value, challenge_md: qs('f_challenge').value,
    order_index: Number(qs('f_order').value || 99), is_published: qs('f_published').checked,
  };
  if (!lesson.title) { toast('ต้องมีชื่อบทเรียน', 'bad'); return; }
  try { await api('/api/admin/lessons', { method: 'POST', body: { lesson } }); qs('lessonDialog').close(); toast('บันทึกแล้ว'); loadLessons(); }
  catch (e) { toast(e.message, 'bad'); }
}
async function loadUsers() {
  const r = await api('/api/admin/users');
  qs('adminMain').innerHTML = `
    <header class="admin-head"><div><h1>ผู้ใช้</h1><p>กำหนดสิทธิ์ student / admin</p></div></header>
    <section class="panel"><div style="overflow:auto"><table class="data-table"><thead><tr><th>ชื่อ</th><th>อีเมล</th><th>สิทธิ์</th><th>สมัคร</th></tr></thead><tbody>
    ${(r.users || []).map(u => `<tr><td><strong>${esc(u.display_name || '—')}</strong></td><td class="small">${esc(u.email || '')}</td><td><select class="input" data-user="${esc(u.id)}" style="padding:6px 8px;width:120px"><option value="student" ${u.role !== 'admin' ? 'selected' : ''}>student</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option></select></td><td class="small muted">${u.created_at ? new Date(u.created_at).toLocaleDateString('th-TH') : '—'}</td></tr>`).join('') || '<tr><td colspan="4">ไม่มีผู้ใช้</td></tr>'}
    </tbody></table></div></section>`;
  qs('adminMain').querySelectorAll('[data-user]').forEach(sel => sel.addEventListener('change', async () => {
    try { await api('/api/admin/users/' + encodeURIComponent(sel.dataset.user), { method: 'POST', body: { role: sel.value } }); toast('อัปเดตสิทธิ์แล้ว'); }
    catch (e) { toast(e.message, 'bad'); }
  }));
}
async function loadSettings() {
  const s = await api('/api/admin/settings');
  qs('adminMain').innerHTML = `
    <header class="admin-head"><div><h1>ตั้งค่า AI</h1><p>ใช้ DeepSeek หรือ API ที่รองรับ OpenAI-compatible</p></div></header>
    <section class="panel settings-form">
      <h2>Connection</h2><p class="panel-sub">key จะถูกเข้ารหัสด้วย AES-256-GCM และเก็บฝั่ง server เท่านั้น</p>
      <div class="field"><label>Base URL</label><input class="input" id="s_base" value="${esc(s.base_url || 'https://api.deepseek.com')}" placeholder="https://api.deepseek.com"><div class="hint">ตัวอย่าง DeepSeek: https://api.deepseek.com · OpenAI: https://api.openai.com/v1</div></div>
      <div class="field"><label>Model</label><input class="input" id="s_model" value="${esc(s.model || 'deepseek-chat')}" placeholder="deepseek-chat"></div>
      <div class="field"><label>API key ${s.has_key ? `<span class="pill live">มี key แล้ว · ${esc(s.key_hint || '')}</span>` : '<span class="pill warn">ยังไม่มี key</span>'}</label><input class="input" id="s_key" type="password" placeholder="วาง key ใหม่ (เว้นว่างเพื่อคงเดิม)" autocomplete="off"></div>
      <button class="btn primary" id="saveSettings">บันทึกการตั้งค่า</button>
      <div class="notice" style="margin-top:16px">AI จะได้รับเฉพาะบทเรียนที่เปิดอยู่ โค้ด stdin output และ error ล่าสุด — ไม่ได้ส่งทั้งฐานข้อมูล</div>
    </section>`;
  qs('saveSettings').addEventListener('click', async () => {
    try {
      await api('/api/admin/settings', { method: 'POST', body: { base_url: qs('s_base').value.trim(), model: qs('s_model').value.trim(), api_key: qs('s_key').value.trim() } });
      toast('บันทึกการตั้งค่าแล้ว'); loadSettings();
    } catch (e) { toast(e.message, 'bad'); }
  });
}
document.addEventListener('click', e => {
  if (e.target && e.target.id === 'saveLesson') saveLesson();
});
boot().catch(e => { qs('adminMain').innerHTML = `<div class="error-box">${esc(e.message)}</div>`; });
