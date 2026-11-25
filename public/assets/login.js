'use strict';

let mode = 'login';
let sb = null;

async function boot() {
  const q = new URLSearchParams(location.search);
  if (q.get('email')) document.getElementById('email').value = q.get('email');
  if (CC.token) { location.replace('/learn.html'); return; }
  const cfg0 = await getConfig();
  if (cfg0.demoMode && new URLSearchParams(location.search).get('demo') === '1') {
    CC.setSession('demo', { id: 'demo-admin', email: 'demo@clab.local', display_name: 'Demo Admin', role: 'admin' });
    location.replace('/learn.html'); return;
  }
  const cfg = await getConfig();
  const form = document.getElementById('authForm');
  const demoBox = document.getElementById('demoBox');
  const hint = document.getElementById('configHint');
  if (cfg.demoMode) {
    demoBox.classList.remove('hidden');
    form.classList.add('hidden');
    hint.textContent = 'โหมดตัวอย่าง — ตั้งค่า Supabase ใน .env เพื่อใช้บัญชีจริง';
    document.getElementById('demoBtn').addEventListener('click', () => {
      CC.setSession('demo', { id: 'demo-admin', email: 'demo@clab.local', display_name: 'Demo Admin', role: 'admin' });
      location.replace('/learn.html');
    });
    return;
  }
  if (!window.supabase) { showError('โหลด Supabase client ไม่สำเร็จ'); return; }
  sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  hint.textContent = 'เชื่อมต่อ Supabase แล้ว — ใช้บัญชีอีเมลของคุณ';
  const { data } = await sb.auth.getSession();
  if (data?.session) { await enter(data.session); return; }
  form.addEventListener('submit', submit);
  document.getElementById('modeBtn').addEventListener('click', toggleMode);
}
function showError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg; el.classList.remove('hidden');
}
function toggleMode() {
  mode = mode === 'login' ? 'signup' : 'login';
  document.getElementById('authTitle').textContent = mode === 'login' ? 'กลับมาเรียนต่อ' : 'สร้างบัญชีใหม่';
  document.getElementById('authSub').textContent = mode === 'login' ? 'เข้าสู่ระบบเพื่อเรียนและบันทึกความคืบหน้า' : 'สมัครเพื่อเริ่มเรียนและเก็บประวัติ';
  document.getElementById('submitBtn').textContent = mode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี';
  document.getElementById('modeBtn').textContent = mode === 'login' ? 'สร้างบัญชี' : 'มีบัญชีแล้ว';
  document.getElementById('password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
}
async function submit(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('submitBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    const fn = mode === 'login' ? sb.auth.signInWithPassword.bind(sb.auth) : sb.auth.signUp.bind(sb.auth);
    const { data, error } = await fn({ email, password, options: { data: { display_name: email.split('@')[0] } } });
    if (error) { showError(error.message); return; }
    if (!data.session) { showError('สร้างบัญชีแล้ว กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ'); return; }
    await enter(data.session);
  } catch (err) { showError(err.message || 'เข้าสู่ระบบไม่สำเร็จ'); }
  finally { btn.disabled = false; btn.textContent = mode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'; }
}
async function enter(session) {
  CC.setSession(session.access_token, session.user || {});
  try {
    const { user } = await api('/api/me');
    CC.setSession(session.access_token, user);
    location.replace('/learn.html');
  } catch (e) { showError(e.message); }
}
boot().catch(e => showError(e.message));
