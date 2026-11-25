'use strict';

async function boot() {
  const user = await requireAuth(); if (!user) return;
  document.getElementById('railNav').innerHTML = `
    <a class="rail-link active" href="/learn.html">${icon('grid')} โต๊ะเรียน</a>
    <a class="rail-link" href="#path">${icon('book')} บทเรียน</a>
    ${user.role === 'admin' ? `<a class="rail-link" href="/admin.html">${icon('settings')} หลังบ้าน</a>` : ''}`;
  document.getElementById('railBottom').innerHTML = `
    <a class="rail-link" href="#" id="logout">${icon('logout')} ออกจากระบบ</a>
    <div style="height:8px"></div>${topbarUser(user)}`;
  document.getElementById('logout').addEventListener('click', e => { e.preventDefault(); logout(); });

  const [{ lessons }, { progress }] = await Promise.all([api('/api/lessons'), api('/api/progress')]);
  const done = lessons.filter(l => progress[l.id]?.status === 'completed').length;
  const started = lessons.filter(l => progress[l.id]).length;
  const pct = lessons.length ? Math.round(done / lessons.length * 100) : 0;
  const next = lessons.find(l => progress[l.id]?.status !== 'completed') || lessons[0];
  const main = document.getElementById('main');
  main.innerHTML = `
    <header class="page-head">
      <div><h1>โต๊ะเรียนของ<br>${esc(user.display_name || user.email)}</h1>
        <p class="sub">อ่านทีละแนวคิด ลองรันโค้ด แล้วปล่อยให้ AI ช่วยดูว่าติดตรงไหน — ความคืบหน้าจะถูกบันทึกไว้</p></div>
      <div class="head-actions">${next ? `<a class="btn primary" href="/lesson.html?id=${encodeURIComponent(next.id)}">${icon('play')} เรียนต่อ</a>` : ''}</div>
    </header>
    <section class="stat-row">
      <div class="stat"><div class="k">ความคืบหน้า</div><div class="v">${pct}%</div><div class="d">${done} จาก ${lessons.length} บทเรียน</div></div>
      <div class="stat"><div class="k">เริ่มแล้ว</div><div class="v">${started}</div><div class="d">บทเรียนที่เคยเปิด</div></div>
      <div class="stat"><div class="k">บทถัดไป</div><div class="v" style="font-size:17px;line-height:1.3">${next ? esc(next.chapter ? 'บท ' + next.chapter : next.title) : '—'}</div><div class="d">${next ? esc(next.title) : 'ยังไม่มีบทเรียน'}</div></div>
    </section>
    <section class="path" id="path">
      <div class="path-head"><div><h2>เส้นทางเรียน</h2><p>C 语言 · 5–8 · เรียงตามลำดับที่ควรอ่าน</p></div><span class="pill">${lessons.length} บท</span></div>
      <div class="path-list">
        ${lessons.length ? lessons.map((l, i) => {
          const st = progress[l.id]?.status || 'not_started';
          const label = st === 'completed' ? 'เรียนแล้ว' : st === 'in_progress' ? 'กำลังเรียน' : 'ยังไม่เริ่ม';
          const bar = st === 'completed' ? 100 : st === 'in_progress' ? 48 : 0;
          return `<a class="path-item" href="/lesson.html?id=${encodeURIComponent(l.id)}">
            <span class="idx">${String(i + 1).padStart(2, '0')}</span>
            <div><h3>${esc(l.title)}</h3><p>${esc(l.summary || '')}</p></div>
            <div><div class="progress-line"><i style="width:${bar}%"></i></div><div class="state" style="margin-top:5px">${label}</div></div>
            <span class="arrow">${icon('arrow')}</span>
          </a>`;
        }).join('') : '<div class="empty">ยังไม่มีบทเรียน — เข้าหลังบ้านแล้วกด “โหลดบทเรียนตัวอย่าง”</div>'}
      </div>
    </section>`;
}
boot().catch(e => { document.getElementById('main').innerHTML = `<div class="error-box">${esc(e.message)}</div>`; });
