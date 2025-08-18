// Basic quiz engine (vanilla JS).
// Supports: mcq (single/multiple), truefalse, fill (string or regex).

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  packs: [],
  pack: null,
  questions: [],      // selected questions for this run
  idx: 0,
  score: 0,
  mode: 'practice',   // 'practice' | 'test'
  answers: {},        // id -> userAnswer
  results: {},        // id -> {correct, userAnswer, solution}
};

const els = {
  packSelect: $('#pack-select'),
  modeSelect: $('#mode-select'),
  qcount: $('#qcount'),
  start: $('#btn-start'),
  resume: $('#btn-resume'),
  quiz: $('#quiz'),
  progress: $('#progress'),
  score: $('#score'),
  qcon: $('#question-container'),
  submit: $('#btn-submit'),
  next: $('#btn-next'),
  show: $('#btn-show'),
  feedback: $('#feedback'),
  results: $('#results'),
  finalScore: $('#final-score'),
  finalTotal: $('#final-total'),
  review: $('#review'),
  restart: $('#btn-restart'),
  retryWrong: $('#btn-retry-wrong'),
  exportBtn: $('#btn-export'),
  linkHome: $('#link-home'),
  linkHow: $('#link-how'),
  viewHome: $('#view-home'),
  viewHow: $('#view-how'),
};

function saveProgress(){
  const payload = {
    packId: state.pack?.meta?.id,
    idx: state.idx,
    score: state.score,
    mode: state.mode,
    questions: state.questions,
    answers: state.answers,
    results: state.results,
  };
  localStorage.setItem('latin_quiz_progress', JSON.stringify(payload));
}
function loadProgress(){
  try{
    const payload = JSON.parse(localStorage.getItem('latin_quiz_progress') || 'null');
    return payload;
  }catch(e){ return null; }
}
function clearProgress(){
  localStorage.removeItem('latin_quiz_progress');
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchJSON(url){
  const res = await fetch(url, {cache:'no-store'});
  if(!res.ok) throw new Error('Failed to load '+url);
  return await res.json();
}

async function loadPacks(){
  try{
    const list = await fetchJSON('data/packs.json');
    state.packs = list;
  }catch(e){
    // Fallback if packs.json missing
    state.packs = [{
      id:'latin_week1', title:'Latin Week 1 基础（示例）', path:'data/latin_week1.json'
    }];
  }
  // Fill select
  els.packSelect.innerHTML = state.packs.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
}

async function loadPackById(id){
  const packMeta = state.packs.find(p => p.id === id) || state.packs[0];
  const pack = await fetchJSON(packMeta.path);
  state.pack = pack;
  return pack;
}

function normalizeText(s){
  return (s||'')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'') // strip accents
    .replace(/[^\w\s]/g,'') // remove punctuation
    .replace(/\b(the|a|an|les?|des?|la|le|une|un|de|du)\b/g,'') // strip common articles
    .replace(/\s+/g,' ')
    .trim();
}

function renderQuestion(q){
  els.qcon.innerHTML = '';
  els.feedback.textContent = '';
  els.feedback.className = 'feedback';

  const wrap = document.createElement('div');
  const title = document.createElement('h3');
  title.className = 'q-title';
  title.innerHTML = `${state.idx+1}. ${q.question}`;
  wrap.appendChild(title);

  const choicesWrap = document.createElement('div');
  choicesWrap.className = 'q-choices';

  if(q.type === 'mcq'){
    // single or multiple: if answer has more than 1 idx -> checkboxes
    const multi = Array.isArray(q.answer) && q.answer.length > 1;
    q.choices.forEach((c, i) => {
      const label = document.createElement('label');
      label.className = 'choice';
      const input = document.createElement('input');
      input.type = multi ? 'checkbox' : 'radio';
      input.name = 'mcq';
      input.value = i;
      label.appendChild(input);
      const span = document.createElement('span');
      span.textContent = c;
      label.appendChild(span);
      choicesWrap.appendChild(label);
    });
  }else if(q.type === 'truefalse'){
    ['True','False'].forEach((c,i) => {
      const label = document.createElement('label');
      label.className = 'choice';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'tf';
      input.value = i===0 ? 'true':'false';
      label.appendChild(input);
      const span = document.createElement('span');
      span.textContent = c;
      label.appendChild(span);
      choicesWrap.appendChild(label);
    });
  }else if(q.type === 'fill'){
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '在此输入答案 / Type your answer';
    input.className = 'fill-input';
    input.id = 'fill-answer';
    choicesWrap.appendChild(input);
  }else{
    const p = document.createElement('p');
    p.textContent = 'Unsupported question type.';
    choicesWrap.appendChild(p);
  }

  wrap.appendChild(choicesWrap);
  els.qcon.appendChild(wrap);
}

function getUserAnswer(q){
  if(q.type === 'mcq'){
    const multi = Array.isArray(q.answer) && q.answer.length > 1;
    const inputs = $$('input[name="mcq"]');
    const checked = inputs.filter(i => i.checked).map(i => parseInt(i.value,10));
    if(checked.length === 0) return null;
    if(multi) return checked.sort((a,b)=>a-b);
    return checked[0];
  }else if(q.type === 'truefalse'){
    const v = $('input[name="tf"]:checked');
    return v ? (v.value === 'true') : null;
  }else if(q.type === 'fill'){
    const v = $('#fill-answer')?.value || '';
    return v;
  }
  return null;
}

function checkAnswer(q, user){
  if(q.type === 'mcq'){
    const correct = Array.isArray(q.answer) ? q.answer.slice().sort((a,b)=>a-b) : [q.answer];
    const userArr = Array.isArray(user) ? user.slice().sort((a,b)=>a-b) : [user];
    return JSON.stringify(correct) === JSON.stringify(userArr);
  }else if(q.type === 'truefalse'){
    return Boolean(q.answer) === Boolean(user);
  }else if(q.type === 'fill'){
    const normalizedUser = normalizeText(user);
    if(Array.isArray(q.answer_text)){
      return q.answer_text.some(ans => normalizeText(ans) === normalizedUser);
    }else if(typeof q.answer_text === 'string'){
      return normalizeText(q.answer_text) === normalizedUser;
    }else if(q.answer_regex){
      try{
        const re = new RegExp(q.answer_regex, 'i');
        return re.test(user);
      }catch(e){ return false; }
    }
  }
  return false;
}

function showFeedback(ok, q){
  els.feedback.textContent = ok ? (q.correct_feedback || '✅ 正确！做得好。') : (q.incorrect_feedback || '❌ 不正确，看看解析吧。');
  els.feedback.className = 'feedback ' + (ok ? 'ok' : 'bad');
  if(q.explanation){
    const exp = document.createElement('div');
    exp.className = 'small';
    exp.innerHTML = '<br><strong>解析：</strong>' + q.explanation;
    els.feedback.appendChild(exp);
  }
}

function updateTopbar(){
  els.progress.textContent = `${Math.min(state.idx+1, state.questions.length)}/${state.questions.length}`;
  els.score.textContent = state.score;
}

function nextQuestion(){
  if(state.idx >= state.questions.length){
    finish();
    return;
  }
  const q = state.questions[state.idx];
  renderQuestion(q);
  updateTopbar();
}

function finish(){
  els.quiz.classList.add('hidden');
  els.results.classList.remove('hidden');
  const total = state.questions.length;
  els.finalScore.textContent = state.score;
  els.finalTotal.textContent = total;

  // build review
  els.review.innerHTML = '';
  state.questions.forEach(q => {
    const r = state.results[q.id] || {};
    const div = document.createElement('div');
    div.className = 'review-item';
    const userStr = (q.type==='fill') ? (r.userAnswer || '') : JSON.stringify(r.userAnswer);
    const corrStr = (q.type==='fill') 
      ? (Array.isArray(q.answer_text)? q.answer_text.join(' | ') : (q.answer_text||'')) 
      : JSON.stringify(q.answer);
    div.innerHTML = `<div class="q-title">${q.question}</div>
      <div class="small">你的答案：${userStr || '（未作答）'}</div>
      <div class="small">正确答案：${corrStr}</div>
      ${q.explanation ? `<div class="small"><strong>解析：</strong>${q.explanation}</div>`: ''}`;
    els.review.appendChild(div);
  });

  clearProgress();
}

function startQuiz(fromSaved=false){
  els.results.classList.add('hidden');
  els.quiz.classList.remove('hidden');
  state.score = fromSaved ? state.score : 0;
  state.idx = fromSaved ? state.idx : 0;
  updateTopbar();
  nextQuestion();
}

els.submit.addEventListener('click', () => {
  const q = state.questions[state.idx];
  const ua = getUserAnswer(q);
  if(ua === null || (Array.isArray(ua) && ua.length===0)){
    els.feedback.textContent = '请先选择或填写答案。';
    els.feedback.className = 'feedback';
    return;
  }
  const ok = checkAnswer(q, ua);
  state.answers[q.id] = ua;
  state.results[q.id] = {correct: ok, userAnswer: ua, solution: q.answer ?? q.answer_text ?? q.answer_regex ?? null};

  if(state.mode === 'practice'){
    showFeedback(ok, q);
    if(ok) state.score += 1;
    updateTopbar();
    saveProgress();
  }else{
    // test mode: delay feedback until the end (but still store score silently)
    if(ok) state.score += 1;
    els.feedback.textContent = '答案已提交（测试模式：结果将于最后显示）。';
    els.feedback.className = 'feedback';
    saveProgress();
  }
});

els.next.addEventListener('click', () => {
  state.idx += 1;
  if(state.idx >= state.questions.length){
    finish();
  }else{
    nextQuestion();
    saveProgress();
  }
});

els.show.addEventListener('click', () => {
  const q = state.questions[state.idx];
  if(q.type === 'mcq'){
    const corr = Array.isArray(q.answer) ? q.answer : [q.answer];
    els.feedback.textContent = '正确选项索引（从0开始）：' + JSON.stringify(corr);
    els.feedback.className = 'feedback';
  }else if(q.type === 'truefalse'){
    els.feedback.textContent = '正确答案：' + (q.answer ? 'True' : 'False');
    els.feedback.className = 'feedback';
  }else if(q.type === 'fill'){
    const corr = Array.isArray(q.answer_text) ? q.answer_text.join(' | ') : (q.answer_text || '');
    els.feedback.textContent = '参考答案：' + corr;
    els.feedback.className = 'feedback';
  }
});

els.start.addEventListener('click', async () => {
  const id = els.packSelect.value;
  state.mode = els.modeSelect.value;
  const desired = Math.max(5, Math.min(100, parseInt(els.qcount.value || '10', 10)));

  const pack = await loadPackById(id);
  let qs = (pack.questions || []).slice();
  shuffle(qs);
  qs = qs.slice(0, desired);

  state.questions = qs;
  state.answers = {};
  state.results = {};
  state.score = 0;
  state.idx = 0;

  saveProgress();
  startQuiz(false);
});

els.resume.addEventListener('click', async () => {
  const saved = loadProgress();
  if(!saved){ alert('未找到保存的进度。'); return; }
  // load the pack first
  const id = saved.packId || els.packSelect.value;
  await loadPackById(id);
  state.mode = saved.mode || 'practice';
  state.questions = saved.questions || [];
  state.answers = saved.answers || {};
  state.results = saved.results || {};
  state.idx = saved.idx || 0;
  state.score = saved.score || 0;

  startQuiz(true);
});

els.restart.addEventListener('click', () => {
  clearProgress();
  window.location.reload();
});

els.retryWrong.addEventListener('click', () => {
  const wrong = state.questions.filter(q => !(state.results[q.id]?.correct));
  if(wrong.length === 0){
    alert('没有错题可重练！');
    return;
  }
  state.questions = shuffle(wrong.slice());
  state.idx = 0;
  state.score = 0;
  state.answers = {};
  state.results = {};
  els.results.classList.add('hidden');
  els.quiz.classList.remove('hidden');
  nextQuestion();
});

els.exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({
    packId: state.pack?.meta?.id || '',
    mode: state.mode,
    answers: state.answers,
    results: state.results,
    score: state.score,
    total: state.questions.length,
    when: new Date().toISOString()
  }, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'latin_quiz_results.json';
  a.click();
  URL.revokeObjectURL(url);
});

// Tabs
function activateTab(which){
  if(which==='home'){
    els.linkHome.classList.add('active');
    els.linkHow.classList.remove('active');
    els.viewHome.classList.add('active');
    els.viewHow.classList.remove('active');
  }else{
    els.linkHome.classList.remove('active');
    els.linkHow.classList.add('active');
    els.viewHome.classList.remove('active');
    els.viewHow.classList.add('active');
  }
}
els.linkHome.addEventListener('click', (e)=>{e.preventDefault();activateTab('home')});
els.linkHow.addEventListener('click', (e)=>{e.preventDefault();activateTab('how')});

// Init
(async function init(){
  await loadPacks();
  // If progress exists, show resume
  if(loadProgress()) els.resume.style.display = 'inline-flex';
  else els.resume.style.display = 'none';
})();
