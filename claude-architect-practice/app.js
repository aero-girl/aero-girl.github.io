const $ = (id) => document.getElementById(id);
const views = { home: $('homeView'), quiz: $('quizView'), results: $('resultsView') };
const STORE = 'ccarf-architects-desk-v1';
let bank = [], session = [], index = 0, selections = new Set(), checked = false, outcomes = [], mode = 'daily';

const domainNames = {
  'Agentic Architecture & Orchestration': 'Agentic architecture',
  'Tool Design & MCP Integration': 'Tools & MCP',
  'Claude Code Configuration & Workflows': 'Claude Code',
  'Prompt Engineering & Structured Output': 'Prompts & output',
  'Context Management & Reliability': 'Context & reliability'
};

function loadState(){
  try { return JSON.parse(localStorage.getItem(STORE)) || { attempts: [], streak: { count: 0, last: null } }; }
  catch { return { attempts: [], streak: { count: 0, last: null } }; }
}
function saveState(state){ localStorage.setItem(STORE, JSON.stringify(state)); }
function today(){ return new Date().toISOString().slice(0,10); }
function dayBefore(a,b){ return Math.round((new Date(b)-new Date(a))/86400000) === 1; }
function seededDaily(items){
  const seed = Number(today().replaceAll('-',''));
  return [...items].sort((a,b)=>(((a.id*9301+seed*49297)%233280)-((b.id*9301+seed*49297)%233280))).slice(0,5);
}
function show(name){ Object.entries(views).forEach(([key,node])=>node.classList.toggle('hidden',key!==name)); window.scrollTo(0,0); }
function addBar(container, label, pct, empty=false){
  const row=document.createElement('div'); row.className='domain-row';
  const name=document.createElement('span'); name.textContent=label;
  const bar=document.createElement('div'); bar.className='bar'; const fill=document.createElement('i'); fill.style.width=`${pct}%`; bar.append(fill);
  const score=document.createElement('strong'); score.textContent=empty?'—':`${pct}%`;
  row.append(name,bar,score); container.append(row);
}
function renderHome(){
  const state=loadState(); $('streakValue').textContent=state.streak.count || 0;
  const all=state.attempts.flatMap(a=>a.outcomes || []); const correct=all.filter(x=>x.correct).length;
  $('overallScore').textContent=all.length?`${Math.round(correct/all.length*100)}%`:'—';
  const bars=$('domainBars'); bars.replaceChildren();
  Object.entries(domainNames).forEach(([full,short])=>{
    const rows=all.filter(x=>x.domain===full); const pct=rows.length?Math.round(rows.filter(x=>x.correct).length/rows.length*100):0;
    addBar(bars,short,pct,!rows.length);
  });
  show('home');
}
function startQuiz(kind, custom=null){
  mode=kind; session=custom || (kind==='daily'?seededDaily(bank):[...bank]);
  index=0; outcomes=[]; $('modeLabel').textContent=kind==='daily'?'Daily mission':kind==='retry'?'Weak-spot rematch':'Full diagnostic';
  show('quiz'); renderQuestion();
}
function renderQuestion(){
  const q=session[index]; selections=new Set(); checked=false;
  $('questionCount').textContent=`${index+1} / ${session.length}`;
  $('quizProgress').style.width=`${(index/session.length)*100}%`;
  $('scenarioBadge').textContent=`Scenario ${q.scenario}`;
  $('domainBadge').textContent=domainNames[q.domain] || q.domain;
  $('scenarioTitle').textContent=q.scenarioTitle;
  $('questionTitle').textContent=q.title;
  $('questionPrompt').textContent=q.prompt;
  $('selectionRule').textContent=q.select===1?'Select one answer':`Select exactly ${q.select} answers`;
  $('feedback').className='feedback hidden'; $('feedback').replaceChildren();
  $('checkAnswer').classList.remove('hidden'); $('checkAnswer').disabled=true;
  $('nextQuestion').classList.add('hidden');
  const options=$('options'); options.replaceChildren();
  Object.entries(q.options).forEach(([letter,text])=>{
    const button=document.createElement('button'); button.className='option'; button.dataset.letter=letter;
    const key=document.createElement('span'); key.className='letter'; key.textContent=letter;
    const copy=document.createElement('span'); copy.textContent=text;
    button.append(key,copy); button.addEventListener('click',()=>toggleOption(letter)); options.append(button);
  });
}
function toggleOption(letter){
  if(checked) return; const q=session[index];
  if(q.select===1) selections=new Set([letter]);
  else if(selections.has(letter)) selections.delete(letter);
  else if(selections.size<q.select) selections.add(letter);
  document.querySelectorAll('.option').forEach(b=>b.classList.toggle('selected',selections.has(b.dataset.letter)));
  $('checkAnswer').disabled=selections.size!==q.select;
}
function sameAnswer(a,b){ return [...a].sort().join(',')===[...b].sort().join(','); }
function checkAnswer(){
  const q=session[index]; checked=true; const correct=sameAnswer(selections,q.answer);
  outcomes.push({ id:q.id, domain:q.domain, correct, selected:[...selections] });
  document.querySelectorAll('.option').forEach(b=>{
    b.classList.add('locked'); const letter=b.dataset.letter;
    if(q.answer.includes(letter)) b.classList.add('correct');
    else if(selections.has(letter)) b.classList.add('incorrect');
  });
  const box=$('feedback'); box.className=`feedback${correct?'':' bad'}`;
  const title=document.createElement('h3'); title.textContent=correct?'Sound decision.':'Not quite—trace the governing principle.';
  const text=document.createElement('p'); text.textContent=q.explanation;
  box.replaceChildren(title,text);
  $('checkAnswer').classList.add('hidden'); $('nextQuestion').classList.remove('hidden');
  $('nextQuestion').textContent=index===session.length-1?'See mission report →':'Next decision →';
}
function nextQuestion(){ if(index<session.length-1){ index++; renderQuestion(); window.scrollTo(0,0); } else finishQuiz(); }
function finishQuiz(){
  const state=loadState(); const date=today();
  state.attempts.push({ date, mode, outcomes }); state.attempts=state.attempts.slice(-50);
  if(mode==='daily'){
    if(state.streak.last!==date){ state.streak.count=dayBefore(state.streak.last,date)?state.streak.count+1:1; state.streak.last=date; }
  }
  saveState(state); $('streakValue').textContent=state.streak.count || 0; renderResults();
}
function renderResults(){
  const score=outcomes.filter(x=>x.correct).length, pct=Math.round(score/outcomes.length*100);
  $('resultScore').textContent=`${pct}%`; $('resultFraction').textContent=`${score} / ${outcomes.length}`;
  $('resultHeadline').textContent=pct>=80?'Architecture holds.':pct>=60?'Good bones. Tighten the weak joints.':'Back to the blueprint.';
  $('resultMessage').textContent=pct>=80?'Strong result. Keep practising until every domain stays above 70%.':pct>=60?'Review the explanations, then rematch the misses while the reasoning is fresh.':'The misses are useful: they show exactly which principles need another pass.';
  const bars=$('resultDomains'); bars.replaceChildren();
  Object.entries(domainNames).forEach(([full,short])=>{ const rows=outcomes.filter(x=>x.domain===full); if(rows.length) addBar(bars,short,Math.round(rows.filter(x=>x.correct).length/rows.length*100)); });
  const missed=outcomes.filter(x=>!x.correct); $('retryMissed').classList.toggle('hidden',!missed.length);
  show('results');
}

$('startDaily').addEventListener('click',()=>startQuiz('daily'));
$('startFull').addEventListener('click',()=>startQuiz('full'));
$('checkAnswer').addEventListener('click',checkAnswer);
$('nextQuestion').addEventListener('click',nextQuestion);
$('exitQuiz').addEventListener('click',()=>{ if(!outcomes.length || confirm('Leave this attempt? Current answers will not be saved.')) renderHome(); });
$('homeButton').addEventListener('click',renderHome); $('backHome').addEventListener('click',renderHome);
$('retryMissed').addEventListener('click',()=>{ const ids=new Set(outcomes.filter(x=>!x.correct).map(x=>x.id)); startQuiz('retry',bank.filter(q=>ids.has(q.id))); });

fetch('questions.json').then(r=>{ if(!r.ok) throw new Error(`Question bank ${r.status}`); return r.json(); }).then(data=>{ bank=data; renderHome(); }).catch(err=>{
  $('app').innerHTML=`<section class="view"><div class="question-sheet"><h1>Question bank unavailable</h1><p>${err.message}. Reload the page or use a local web server rather than opening the file directly.</p></div></section>`;
});
