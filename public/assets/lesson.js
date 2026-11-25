'use strict';

let lesson = null;
let user = null;
let activeQuestionId = '';
let lastRun = { stdout: '', stderr: '' };
let chat = [];
let running = false;
let saveTimer = null;
let acIndex = 0;
let acItems = [];
let acWord = '';

const SUGGESTIONS = [
  { label:'#include <stdio.h>', kind:'pre', insert:'#include <stdio.h>\n' },
  { label:'#include <stdlib.h>', kind:'pre', insert:'#include <stdlib.h>\n' },
  { label:'#include <string.h>', kind:'pre', insert:'#include <string.h>\n' },
  { label:'int', kind:'type', insert:'int ' },
  { label:'float', kind:'type', insert:'float ' },
  { label:'double', kind:'type', insert:'double ' },
  { label:'char', kind:'type', insert:'char ' },
  { label:'void', kind:'type', insert:'void ' },
  { label:'printf', kind:'fn', insert:'printf("|")' },
  { label:'scanf', kind:'fn', insert:'scanf("%d", &|)' },
  { label:'sizeof', kind:'op', insert:'sizeof(|)' },
  { label:'return', kind:'kw', insert:'return ' },
  { label:'for', kind:'flow', insert:'for (int i = 0; i < n; i++) {\n    |\n}' },
  { label:'while', kind:'flow', insert:'while (|) {\n    \n}' },
  { label:'if', kind:'flow', insert:'if (|) {\n    \n}' },
  { label:'else', kind:'flow', insert:'else {\n    |\n}' },
  { label:'switch', kind:'flow', insert:'switch (|) {\n    case 1:\n        break;\n    default:\n        break;\n}' },
  { label:'main', kind:'fn', insert:'int main(void) {\n    |\n    return 0;\n}' },
  { label:'NULL', kind:'macro', insert:'NULL' },
  { label:'malloc', kind:'fn', insert:'malloc(|)' },
  { label:'free', kind:'fn', insert:'free(|)' },
  { label:'strlen', kind:'fn', insert:'strlen(|)' },
];

function qs(id) { return document.getElementById(id); }
function setStatus(s) { qs('runStatus').textContent = s; }

async function boot() {
  user = await requireAuth(); if (!user) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.replace('/learn.html'); return; }
  const [{ lesson: l }, { progress }] = await Promise.all([api(`/api/lessons/${encodeURIComponent(id)}`), api('/api/progress')]);
  lesson = l;
  document.title = `${lesson.title} · C LAB`;
  qs('topTitle').textContent = lesson.title;
  qs('chapterLabel').textContent = lesson.chapter ? `บท ${lesson.chapter}` : '';
  qs('lessonContent').innerHTML = `<article class="lesson-md">${renderMarkdown(lesson.content_md || '')}${lesson.challenge_md ? `<div class="lesson-challenge"><div class="small">โจทย์ใน editor</div>${renderMarkdown(lesson.challenge_md)}</div>` : ''}</article><div id="questions"></div>`;
  renderQuestions();
  qs('code').value = (progress[id] && progress[id].code) || lesson.starter_code || '';
  qs('stdin').value = lesson.stdin || '';
  updateGutter();
  qs('engineLabel').textContent = 'auto / gcc';
  bind();
  setAI(localStorage.getItem('clab.aiOpen') === '1' || (window.innerWidth >= 1100 && localStorage.getItem('clab.aiOpen') !== '0'));
  addWelcome();
  updateContext();
  saveProgress(progress[id]?.status === 'completed' ? 'completed' : 'in_progress', true);
}

function renderQuestions() {
  const box = qs('questions');
  if (!lesson.questions || !lesson.questions.length) return;
  box.innerHTML = `<div class="q-block"><div class="qnum">เช็กความเข้าใจ</div>${lesson.questions.map((q, qi) => `
    <div data-q="${esc(q.id)}" style="margin-bottom:18px">
      <h4>${qi + 1}. ${inlineText(q.prompt_md)}</h4>
      <div class="choices">${(q.choices || []).map((c, i) => `<button class="choice" data-qid="${esc(q.id)}" data-i="${i}" type="button"><span class="ch">${String.fromCharCode(65 + i)}</span><span>${esc(c)}</span></button>`).join('')}</div>
      <div class="q-exp hidden" id="exp-${esc(q.id)}">${renderMarkdown(q.explanation_md || '')}</div>
    </div>`).join('')}</div>`;
  box.querySelectorAll('.choice').forEach(btn => btn.addEventListener('click', () => answer(btn)));
}
function inlineText(s) { return String(s || '').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
function answer(btn) {
  const qid = btn.dataset.qid;
  const q = lesson.questions.find(x => x.id === qid);
  if (!q) return;
  const wrap = btn.closest('[data-q]');
  if (wrap.dataset.answered) return;
  wrap.dataset.answered = '1';
  const picked = Number(btn.dataset.i);
  const correct = Number(q.answer);
  wrap.querySelectorAll('.choice').forEach((b, i) => {
    b.disabled = true;
    if (i === correct) b.classList.add('correct');
    if (i === picked && picked !== correct) b.classList.add('wrong');
  });
  qs('exp-' + qid).classList.remove('hidden');
  activeQuestionId = qid;
  updateContext();
  saveProgress('in_progress');
  if (picked !== correct) toast('ยังไม่ถูก — อ่านคำอธิบายแล้วลองอีกครั้ง', 'bad');
}
function updateGutter() {
  const lines = qs('code').value.split('\n').length;
  qs('gutter').textContent = Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1).join('\n');
}
function bind() {
  const code = qs('code');
  code.addEventListener('input', () => { updateGutter(); updateContext(); scheduleSave(); });
  code.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); const s = code.selectionStart, en = code.selectionEnd; code.setRangeText('    ', s, en, 'end'); updateGutter(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(false); }
  });
  qs('runBtn').addEventListener('click', () => run(false));
  qs('checkBtn').addEventListener('click', () => run(true));
  if (qs('debugBtn')) qs('debugBtn').addEventListener('click', debugRun);
  code.addEventListener('input', updateAutocomplete);
  code.addEventListener('click', updateAutocomplete);
  code.addEventListener('blur', () => setTimeout(hideAutocomplete, 120));
  code.addEventListener('keydown', handleAutocompleteKeys, true);
  qs('completeBtn').addEventListener('click', async () => { await saveProgress('completed'); toast('บันทึกว่าเรียนบทนี้แล้ว'); });
  qs('sendBtn').addEventListener('click', sendAI);
  qs('chatText').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAI(); } });
  qs('chatToggle').addEventListener('click', () => setAI(qs('aiPane').classList.contains('closed')));
  qs('chatClose').addEventListener('click', () => setAI(false));
}
async function run(check, silent) {
  if (running) return;
  running = true;
  qs('runBtn').disabled = true; qs('checkBtn').disabled = true;
  setStatus('กำลังคอมไพล์…');
  qs('output').textContent = 'กำลังคอมไพล์และรัน…';
  try {
    const r = await api('/api/run', { method: 'POST', body: { code: qs('code').value, stdin: qs('stdin').value } });
    lastRun = { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.exitCode, timedOut: r.timedOut };
    qs('engineLabel').textContent = r.engine === 'docker' ? 'docker / gcc' : 'local / clang';
    const body = [r.stdout, r.stderr].filter(Boolean).join('\n');
    qs('output').textContent = body || '(ไม่มี output)';
    qs('output').className = r.exitCode === 0 && !r.timedOut ? '' : 'err';
    setStatus(r.timedOut ? 'timeout' : r.exitCode === 0 ? 'เสร็จสิ้น' : `exit ${r.exitCode}`);
    updateContext();
    saveProgress('in_progress');
    if (check) {
      if (!lesson.expected_output) { if (!silent) toast('บทนี้ยังไม่มีคำตอบมาตรฐาน — ใช้ Run ตรวจด้วยตนเอง'); return r; }
      const norm = s => String(s || '').trim().replace(/\r/g, '').split('\n').map(x => x.trim()).join('\n');
      if (norm(r.stdout) === norm(lesson.expected_output) && r.exitCode === 0) {
        if (!silent) toast('ถูกต้อง — ผลลัพธ์ตรงกับที่คาด'); await saveProgress('completed');
      } else {
        if (!silent) toast('ยังไม่ตรงกับผลลัพธ์ที่คาด ลองเทียบ console อีกครั้ง', 'bad');
      }
    }
    return r;
  } catch (e) {
    qs('output').textContent = e.message;
    qs('output').className = 'err';
    setStatus('ผิดพลาด');
    lastRun = { stdout: '', stderr: e.message };
    updateContext();
    return null;
  } finally {
    running = false; qs('runBtn').disabled = false; qs('checkBtn').disabled = false;
  }
}
async function saveProgress(status, silent) {
  if (!lesson) return;
  try {
    await api('/api/progress', { method: 'POST', body: { lessonId: lesson.id, status, code: qs('code').value } });
  } catch (e) { if (!silent) toast(e.message, 'bad'); }
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveProgress('in_progress'), 1200);
}
function updateContext() {
  const code = qs('code').value;
  const lines = code.split('\n').length;
  const hasErr = !!(lastRun.stderr && lastRun.stderr.trim());
  qs('aiContext').innerHTML = `
    <span class="chip"><i></i>${esc(lesson?.chapter ? 'บท ' + lesson.chapter : 'บทเรียน')}</span>
    <span class="chip"><i></i>${lines} บรรทัด</span>
    ${activeQuestionId ? '<span class="chip"><i></i>คำถามที่เปิด</span>' : ''}
    ${hasErr ? '<span class="chip" style="color:var(--oxide);border-color:#e1c1b8"><i style="background:var(--oxide)"></i>มี error</span>' : '<span class="chip"><i></i>ยังไม่มี error</span>'}`;
}
function addWelcome() {
  const node = document.createElement('div');
  node.className = 'msg';
  node.innerHTML = `<div class="who">C LAB tutor</div><div class="bubble"><p>ผมเห็นบทเรียน <strong>${esc(lesson.title)}</strong> และโค้ดใน editor แล้ว</p><p>ถ้าติด error ให้กด <strong>Run</strong> ก่อน แล้วถามว่า “error นี้หมายถึงอะไร” — ผมจะดูบรรทัดและ output ล่าสุดให้</p></div>`;
  qs('chatScroll').appendChild(node);
}
function addMsg(role, text) {
  const node = document.createElement('div');
  node.className = `msg ${role}`;
  node.innerHTML = `<div class="who">${role === 'user' ? 'คุณ' : 'C LAB tutor'}</div><div class="bubble">${role === 'assistant' ? renderMarkdown(text) : `<p>${esc(text).replace(/\n/g, '<br>')}</p>`}</div>`;
  qs('chatScroll').appendChild(node);
  qs('chatScroll').scrollTop = qs('chatScroll').scrollHeight;
  return node;
}
async function sendAI(textOverride) {
  const input = qs('chatText');
  const text = String(textOverride || input.value).trim();
  if (!text) return;
  const btn = qs('sendBtn');
  btn.disabled = true;
  input.value = '';
  addMsg('user', text);
  chat.push({ role: 'user', content: text });
  const typing = addMsg('assistant', '<span class="typing"><i></i><i></i><i></i></span>');
  typing.querySelector('.bubble').innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
  try {
    const r = await api('/api/ai/chat', { method: 'POST', body: {
      lessonId: lesson.id, questionId: activeQuestionId,
      code: qs('code').value, stdin: qs('stdin').value,
      stdout: lastRun.stdout, stderr: lastRun.stderr,
      messages: chat.slice(-9, -1), message: text,
    } });
    typing.remove();
    addMsg('assistant', r.answer);
    chat.push({ role: 'assistant', content: r.answer });
  } catch (e) {
    typing.remove();
    addMsg('assistant', `**ยังตอบไม่ได้:** ${e.message}\n\n${user?.role === 'admin' ? 'ไปที่ [ตั้งค่า AI](/admin.html#settings) เพื่อใส่ API key' : 'แจ้งผู้ดูแลระบบให้ตั้งค่า AI'}`);
  } finally { btn.disabled = false; }
}

function setAI(open) {
  const pane = qs('aiPane');
  pane.classList.toggle('closed', !open);
  pane.classList.toggle('open', !!open && window.innerWidth < 1100);
  document.querySelector('.lesson-workspace').classList.toggle('ai-hidden', !open);
  localStorage.setItem('clab.aiOpen', open ? '1' : '0');
  qs('chatToggle').textContent = open ? 'ซ่อน' : 'AI';
  qs('chatToggle').title = open ? 'ซ่อนแผง AI' : 'เปิดแผง AI';
}
function hideAutocomplete() {
  qs('autocomplete').classList.add('hidden');
  acItems = [];
}
function updateAutocomplete() {
  if (document.activeElement !== qs('code')) return;
  const code = qs('code');
  const pos = code.selectionStart;
  const before = code.value.slice(0, pos);
  const m = before.match(/([A-Za-z_#][A-Za-z0-9_]*)$/);
  if (!m) { hideAutocomplete(); return; }
  const word = m[1];
  const lower = word.toLowerCase();
  const matches = SUGGESTIONS.filter(x => x.label.toLowerCase().startsWith(lower)).slice(0, 8);
  if (!matches.length || (matches.length === 1 && matches[0].label.toLowerCase() === lower)) { hideAutocomplete(); return; }
  acWord = word;
  acItems = matches;
  acIndex = 0;
  const box = qs('autocomplete');
  box.innerHTML = matches.map((x, i) => `<div class="ac-item ${i === 0 ? 'active' : ''}" data-ac="${i}" role="option"><span>${esc(x.label)}</span><span class="kind">${esc(x.kind)}</span></div>`).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('[data-ac]').forEach(el => {
    el.addEventListener('mousedown', e => e.preventDefault());
    el.addEventListener('click', () => applySuggestion(Number(el.dataset.ac)));
  });
  positionAutocomplete(before);
}
function positionAutocomplete(before) {
  const code = qs('code');
  const box = qs('autocomplete');
  const lines = before.split('\n');
  const line = lines.length - 1;
  const col = lines[line].length;
  const lh = 21.25;
  const cw = 7.52;
  const editor = qs('codeEditor');
  const maxLeft = Math.max(8, editor.clientWidth - 260);
  const left = Math.min(maxLeft, 49 + 18 + col * cw - code.scrollLeft);
  const top = Math.max(6, 17 + line * lh - code.scrollTop + lh + 4);
  box.style.left = left + 'px';
  box.style.top = top + 'px';
}
function applySuggestion(i) {
  const item = acItems[i];
  if (!item) return;
  const code = qs('code');
  const pos = code.selectionStart;
  const start = pos - acWord.length;
  let insert = item.insert;
  let caretOffset = insert.indexOf('|');
  if (caretOffset >= 0) insert = insert.replace('|', '');
  code.setRangeText(insert, start, pos, 'end');
  const newPos = start + (caretOffset >= 0 ? caretOffset : insert.length);
  code.setSelectionRange(newPos, newPos);
  code.focus();
  hideAutocomplete();
  updateGutter(); updateContext(); scheduleSave();
}
function handleAutocompleteKeys(e) {
  if (qs('autocomplete').classList.contains('hidden')) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    acIndex = (acIndex + (e.key === 'ArrowDown' ? 1 : -1) + acItems.length) % acItems.length;
    qs('autocomplete').querySelectorAll('[data-ac]').forEach((el, i) => el.classList.toggle('active', i === acIndex));
    qs('autocomplete').querySelector(`[data-ac="${acIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault(); e.stopPropagation();
    applySuggestion(acIndex);
  } else if (e.key === 'Escape') {
    e.preventDefault(); hideAutocomplete();
  }
}
async function debugRun() {
  if (running) return;
  await run(false, true);
  setAI(true);
  const err = (lastRun.stderr || '').trim();
  const prompt = err
    ? 'ช่วย debug ให้หน่อย: โค้ดนี้ทำให้เกิด error ด้านบน เกิดจากอะไร และควรแก้อะไรก่อน'
    : 'ช่วยตรวจ logic ของโค้ดนี้ให้หน่อย ว่ามีจุดใดอาจให้ผลผิดหรือยังไม่ตรงโจทย์';
  sendAI(prompt);
}

boot().catch(e => {
  qs('lessonContent').innerHTML = `<div class="error-box">${esc(e.message)}</div>`;
});
