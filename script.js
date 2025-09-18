
console.log('script loaded');

// Table 1 – Lot size → code letter (Inspection I/II/III)
const table1 = [
  {min:2,max:8,I:'A',II:'A',III:'B'},
  {min:9,max:15,I:'A',II:'B',III:'C'},
  {min:16,max:25,I:'B',II:'C',III:'D'},
  {min:26,max:50,I:'C',II:'D',III:'E'},
  {min:51,max:90,I:'C',II:'E',III:'F'},
  {min:91,max:150,I:'D',II:'F',III:'G'},
  {min:151,max:280,I:'E',II:'G',III:'H'},
  {min:281,max:500,I:'F',II:'H',III:'J'},
  {min:501,max:1200,I:'G',II:'J',III:'K'},
  {min:1201,max:3200,I:'H',II:'K',III:'L'},
  {min:3201,max:10000,I:'J',II:'L',III:'M'},
  {min:10001,max:35000,I:'K',II:'M',III:'N'},
  {min:35001,max:150000,I:'L',II:'N',III:'P'},
  {min:150001,max:500000,I:'M',II:'P',III:'Q'},
  {min:500001,max:999999999,I:'N',II:'Q',III:'R'}
];

const master = [
  {code:'A', n:2, aql:{'0.65':[0,1],'2.5':[0,1],'4.0':[0,1]}},
  {code:'B', n:3, aql:{'0.65':[0,1],'2.5':[0,1],'4.0':[0,1]}},
  {code:'C', n:5, aql:{'0.65':[0,1],'2.5':[0,1],'4.0':[1,2]}},
  {code:'D', n:8, aql:{'0.65':[0,1],'2.5':[0,1],'4.0':[1,2]}},
  {code:'E', n:13, aql:{'0.65':[0,1],'2.5':[0,1],'4.0':[1,2]}},
  {code:'F', n:20, aql:{'0.65':[0,1],'2.5':[1,2],'4.0':[2,3]}},
  {code:'G', n:32, aql:{'0.65':[0,1],'2.5':[2,3],'4.0':[3,4]}},
  {code:'H', n:50, aql:{'0.65':[1,2],'2.5':[3,4],'4.0':[5,6]}},
  {code:'J', n:80, aql:{'0.65':[1,2],'2.5':[5,6],'4.0':[7,8]}},
  {code:'K', n:125, aql:{'0.65':[2,3],'2.5':[7,8],'4.0':[10,11]}},
  {code:'L', n:200, aql:{'0.65':[3,4],'2.5':[10,11],'4.0':[14,15]}},
  {code:'M', n:315, aql:{'0.65':[5,6],'2.5':[14,15],'4.0':[21,22]}},
  {code:'N', n:500, aql:{'0.65':[7,8],'2.5':[21,22],'4.0':[21,22]}},
  {code:'P', n:800, aql:{'0.65':[10,11],'2.5':[21,22],'4.0':[21,22]}},
  {code:'Q', n:1250,aql:{'0.65':[14,15],'2.5':[21,22],'4.0':[21,22]}},
  {code:'R', n:2000,aql:{'0.65':[21,22],'2.5':[21,22],'4.0':[21,22]}}
];

let currentRules = {};

function findCode(lot,lvl){ for(const r of table1){ if(lot>=r.min && lot<=r.max) return r[lvl]; } return table1[table1.length-1][lvl]; }

function calculate(){
  const boxes = Number(document.getElementById('boxes').value);
  const perBox = Number(document.getElementById('perBox').value);
  const lvl = document.getElementById('inspLevel').value;
  const lot = boxes*perBox;
  const code = findCode(lot,lvl);
  const row = master.find(r=>r.code===code) || master[master.length-1];
  const n = Math.min(row.n, lot);
  const base = Math.floor(n/boxes);
  const rem = n % boxes;
  let perBoxText = rem===0?`Take ${base} unit(s) from each box.`:`Take ${base} unit(s) from each box, plus 1 extra from ${rem} boxes.`;
  currentRules = {
    critical:{ac:row.aql['0.65'][0], re:row.aql['0.65'][1]},
    major:{ac:row.aql['2.5'][0], re:row.aql['2.5'][1]},
    minor:{ac:row.aql['4.0'][0], re:row.aql['4.0'][1]},
    n:n, code:code
  };
  document.getElementById('output').style.display='block';
  document.getElementById('summary').innerHTML=`📦 Lot Size: <b>${lot}</b> → Code: <b>${code}</b> → Sample: <b>${n}</b>`;
  document.getElementById('details').innerHTML=`<p>📌 ${perBoxText}</p>
  <table><tr><th>Type</th><th>AQL</th><th>Ac</th><th>Re</th></tr>
  <tr><td>Critical</td><td>0.65%</td><td>${currentRules.critical.ac}</td><td>${currentRules.critical.re}</td></tr>
  <tr><td>Major</td><td>2.5%</td><td>${currentRules.major.ac}</td><td>${currentRules.major.re}</td></tr>
  <tr><td>Minor</td><td>4.0%</td><td>${currentRules.minor.ac}</td><td>${currentRules.minor.re}</td></tr></table>`;
  document.getElementById('defectEntry').style.display='block';
  document.getElementById('defectResult').innerHTML='';
}

function checkDefects(){
  const crit = Number(document.getElementById('critDef').value);
  const maj = Number(document.getElementById('majDef').value);
  const min = Number(document.getElementById('minDef').value);
  let messages=[];
  if(crit>currentRules.critical.ac) messages.push(`Critical defects exceed Ac (${currentRules.critical.ac})`);
  if(maj>currentRules.major.ac) messages.push(`Major defects exceed Ac (${currentRules.major.ac})`);
  if(min>currentRules.minor.ac) messages.push(`Minor defects exceed Ac (${currentRules.minor.ac})`);
  const anyReject=(crit>=currentRules.critical.re)||(maj>=currentRules.major.re)||(min>=currentRules.minor.re);
  let result='';
  if(messages.length===0){ result='✅ Lot ACCEPTED (all defect counts within Ac)'; }
  else if(anyReject){ result='❌ Lot REJECTED (one or more categories ≥ Re)<br>'+messages.join('<br>'); }
  else { result='❌ Lot REJECTED (defects exceed Ac)<br>'+messages.join('<br>'); }
  document.getElementById('defectResult').innerHTML=result;
}
