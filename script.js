\
/* Corrected sampling logic: proper code lookup per inspection level and
   per-box distribution. Master AQL table included so the app works offline. */

// Table 1 – Lot size → code letter (General Inspection I/II/III)
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

// Master table: sample sizes + Ac/Re per AQL
const master = [
  {code:'A', n:2,   aql:{'0.65':[0,1],'1.0':[0,1],'1.5':[0,1],'2.5':[0,1],'4.0':[0,1],'6.5':[0,1]}},
  {code:'B', n:3,   aql:{'0.65':[0,1],'1.0':[0,1],'1.5':[0,1],'2.5':[0,1],'4.0':[0,1],'6.5':[0,1]}},
  {code:'C', n:5,   aql:{'0.65':[0,1],'1.0':[0,1],'1.5':[0,1],'2.5':[0,1],'4.0':[0,1],'6.5':[1,2]}},
  {code:'D', n:8,   aql:{'0.65':[0,1],'1.0':[0,1],'1.5':[0,1],'2.5':[0,1],'4.0':[1,2],'6.5':[1,2]}},
  {code:'E', n:13,  aql:{'0.65':[0,1],'1.0':[0,1],'1.5':[0,1],'2.5':[0,1],'4.0':[1,2],'6.5':[2,3]}},
  {code:'F', n:20,  aql:{'0.65':[0,1],'1.0':[0,1],'1.5':[1,2],'2.5':[1,2],'4.0':[2,3],'6.5':[3,4]}},
  {code:'G', n:32,  aql:{'0.65':[0,1],'1.0':[1,2],'1.5':[1,2],'2.5':[2,3],'4.0':[3,4],'6.5':[5,6]}},
  {code:'H', n:50,  aql:{'0.65':[1,2],'1.0':[1,2],'1.5':[2,3],'2.5':[3,4],'4.0':[5,6],'6.5':[7,8]}},
  {code:'J', n:80,  aql:{'0.65':[1,2],'1.0':[2,3],'1.5':[3,4],'2.5':[5,6],'4.0':[7,8],'6.5':[10,11]}},
  {code:'K', n:125, aql:{'0.65':[2,3],'1.0':[3,4],'1.5':[5,6],'2.5':[7,8],'4.0':[10,11],'6.5':[14,15]}},
  {code:'L', n:200, aql:{'0.65':[3,4],'1.0':[5,6],'1.5':[7,8],'2.5':[10,11],'4.0':[14,15],'6.5':[21,22]}},
  {code:'M', n:315, aql:{'0.65':[5,6],'1.0':[7,8],'1.5':[10,11],'2.5':[14,15],'4.0':[21,22],'6.5':[21,22]}},
  {code:'N', n:500, aql:{'0.65':[7,8],'1.0':[10,11],'1.5':[14,15],'2.5':[21,22],'4.0':[21,22],'6.5':[21,22]}},
  {code:'P', n:800, aql:{'0.65':[10,11],'1.0':[14,15],'1.5':[21,22],'2.5':[21,22],'4.0':[21,22],'6.5':[21,22]}},
  {code:'Q', n:1250,aql:{'0.65':[14,15],'1.0':[21,22],'1.5':[21,22],'2.5':[21,22],'4.0':[21,22],'6.5':[21,22]}},
  {code:'R', n:2000,aql:{'0.65':[21,22],'1.0':[21,22],'1.5':[21,22],'2.5':[21,22],'4.0':[21,22],'6.5':[21,22]}}
];

let currentRules = {}; // stores Ac/Re for critical/major/minor

function findCode(lot, lvl){
  for (const r of table1){
    if (lot >= r.min && lot <= r.max) return r[lvl];
  }
  // fallback to largest code if lot very large
  return table1[table1.length-1][lvl];
}

function calculate(){
  const boxes = Number(document.getElementById('boxes').value) || 0;
  const perBox = Number(document.getElementById('perBox').value) || 0;
  const lvl = document.getElementById('inspLevel').value;
  const lot = boxes * perBox;

  if (lot <= 0){
    alert('Please enter valid box and unit counts.');
    return;
  }

  // determine code and sample size
  const code = findCode(lot, lvl);
  const row = master.find(r => r.code === code) || master[master.length-1];
  // If lot smaller than table's sample size, we will limit sample size to lot (cannot inspect more than exist)
  let n = (lot < 2) ? lot : Math.min(row.n, lot);
  // If the table indicates full inspection for very small lots (e.g., n === lot), that's fine

  // compute per-box distribution
  const maxPossible = lot;
  if (n > maxPossible) n = maxPossible;

  const base = Math.floor(n / boxes); // units from each box
  const rem = n % boxes;              // number of boxes that need one additional unit
  let perBoxText = '';
  if (base === 0 && rem > 0) {
    perBoxText = `Take 1 unit from ${rem} boxes (total ${n} samples).`;
  } else if (rem === 0) {
    perBoxText = `Take ${base} unit(s) from each of the ${boxes} boxes.`;
  } else {
    perBoxText = `Take ${base} unit(s) from each box, plus 1 extra unit from ${rem} boxes (total ${n}).`;
  }

  // pull Ac/Re for 0.65 (critical), 2.5 (major), 4.0 (minor)
  const crit = row.aql['0.65'];
  const maj = row.aql['2.5'];
  const min = row.aql['4.0'];

  currentRules = {
    critical: {ac: crit[0], re: crit[1]},
    major:    {ac: maj[0],  re: maj[1]},
    minor:    {ac: min[0],  re: min[1]},
    n: n,
    code: code
  };

  document.getElementById('output').style.display = 'block';
  document.getElementById('summary').innerHTML =
    `📦 Lot Size: <b>${lot}</b> → Code: <b>${code}</b> → Sample: <b>${n}</b> items`;

  document.getElementById('details').innerHTML = `
    🔢 <b>Boxes:</b> ${boxes} × ${perBox} units<br>
    🏷️ <b>Inspection Level:</b> ${lvl}<br><br>
    📌 ${perBoxText}<br><br>

    <table>
      <tr><th>Type</th><th>AQL</th><th>Ac</th><th>Re</th></tr>
      <tr><td>Critical</td><td>0.65%</td><td>${crit[0]}</td><td>${crit[1]}</td></tr>
      <tr><td>Major</td><td>2.5%</td><td>${maj[0]}</td><td>${maj[1]}</td></tr>
      <tr><td>Minor</td><td>4.0%</td><td>${min[0]}</td><td>${min[1]}</td></tr>
    </table>
    <p style="margin-top:10px;font-size:0.95rem;color:#444;">Rule: Accept if defects ≤ Ac. Reject if defects ≥ Re.</p>
  `;

  document.getElementById('defectEntry').style.display='block';
  document.getElementById('defectResult').innerHTML = '';
}

function checkDefects(){
  const crit = Number(document.getElementById('critDef').value) || 0;
  const maj = Number(document.getElementById('majDef').value) || 0;
  const min = Number(document.getElementById('minDef').value) || 0;

  let messages = [];

  if (crit > currentRules.critical.ac) messages.push(`Critical defects exceed Ac (${currentRules.critical.ac}).`);
  if (maj  > currentRules.major.ac)    messages.push(`Major defects exceed Ac (${currentRules.major.ac}).`);
  if (min  > currentRules.minor.ac)    messages.push(`Minor defects exceed Ac (${currentRules.minor.ac}).`);

  // if any category >= Re -> immediate reject
  const anyReject = (crit >= currentRules.critical.re) || (maj >= currentRules.major.re) || (min >= currentRules.minor.re);

  let result = '';
  if (messages.length === 0) {
    result = `✅ Lot ACCEPTED (all defect counts are within Ac limits).`;
  } else if (anyReject) {
    result = `❌ Lot REJECTED (one or more categories >= Re).<br>` + messages.join('<br>');
  } else {
    // defects exceed Ac but less than Re -> borderline; recommend follow-up (common practice: reject)
    result = `❌ Lot REJECTED (defects exceed Ac in one or more categories).<br>` + messages.join('<br>');
  }

  document.getElementById('defectResult').innerHTML = result;
}
