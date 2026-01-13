let match = null;

/* ================= MATCH ================= */

function startMatch() {
  const t1 = team1.value.trim();
  const t2 = team2.value.trim();

  if (!t1 || !t2 || t1 === t2) {
    alert("Invalid team names");
    return;
  }

  match = {
    status: "OPEN",
    team1: { name: t1, total: 0, bettors: [] },
    team2: { name: t2, total: 0, bettors: [] }
  };

  save();
  loadTeamSelect();
  render();
}

function clearMatch() {
  localStorage.removeItem("match");
  location.reload();
}

/* ================= BETTORS ================= */

function addBet() {
  if (!match || match.status !== "OPEN") {
    alert("Betting is closed");
    return;
  }

  const name = bettorName.value.trim();
  const amt = Number(betAmount.value);
  const team = betTeam.value;

  if (!name || amt <= 0) return alert("Invalid bet");

  match[team].bettors.push({
    id: crypto.randomUUID(),
    name,
    amt,
    paid: false,
    paidOut: false
  });

  match[team].total += amt;

  bettorName.value = "";
  betAmount.value = "";

  save();
  render();
}

/* ================= DELETE BET (BLOCKED IF PAID) ================= */

function deleteBet(bettorId) {
  if (!match || match.status !== "OPEN") {
    alert("Betting is closed");
    return;
  }

  for (const team of ["team1", "team2"]) {
    const bettor = match[team].bettors.find(b => b.id === bettorId);
    if (!bettor) continue;

    if (bettor.paid) {
      alert("Cannot delete a PAID bet");
      return;
    }

    if (!confirm("Delete this bet?")) return;

    match[team].bettors =
      match[team].bettors.filter(b => b.id !== bettorId);
    match[team].total -= bettor.amt;

    save();
    render();
    return;
  }
}

/* ================= PAID / UNPAID ================= */

function updatePaidStatus(_ignored, bettorId, value) {
  let bettor = null;

  for (const t of ["team1", "team2"]) {
    const found = match[t].bettors.find(b => b.id === bettorId);
    if (found) { bettor = found; break; }
  }
  if (!bettor) return;

  bettor.paid = value === "paid";
  save();
  render();
}

/* ================= SWITCH TEAM ================= */

function switchBet(bettorId) {
  if (!match || match.status !== "OPEN") {
    alert("Betting is closed");
    return;
  }

  let bettor = null, fromTeam = null;

  for (const t of ["team1", "team2"]) {
    const found = match[t].bettors.find(b => b.id === bettorId);
    if (found) { bettor = found; fromTeam = t; break; }
  }
  if (!bettor) return;

  if (bettor.paid) {
    alert("Cannot switch a PAID bet");
    return;
  }

  const toTeam = fromTeam === "team1" ? "team2" : "team1";

  match[fromTeam].bettors =
    match[fromTeam].bettors.filter(b => b.id !== bettorId);
  match[fromTeam].total -= bettor.amt;

  match[toTeam].bettors.push({ ...bettor });
  match[toTeam].total += bettor.amt;

  save();
  render();
}

/* ================= ODDS + PAYOUT ================= */

function getOdds(team) {
  const myTotal = match[team].total;
  const otherTeam = team === "team1" ? "team2" : "team1";
  const otherTotal = match[otherTeam].total;

  if (myTotal <= 0 || otherTotal <= 0) return 0;
  return otherTotal / myTotal;
}

function getEstimatedPayout(team, bettor) {
  return bettor.amt * getOdds(team);
}

function getFinalPayout(team, bettor) {
  if (match.winner !== team) return 0;
  return getEstimatedPayout(team, bettor);
}

/* ================= SETTLEMENT (WITH CONFIRMATION) ================= */

function settleMatch(winningTeam) {
  if (!match || match.status !== "OPEN") {
    alert("Match already settled");
    return;
  }

  const teamName = match[winningTeam].name;

  const ok = confirm(
    `CONFIRM SETTLEMENT\n\n` +
    `Declare "${teamName}" as MATCH WINNER?\n\n` +
    `This action CANNOT be undone.`
  );

  if (!ok) return;

  match.status = "FINISHED";
  match.winner = winningTeam;
  save();
  render();
}

function markPaidOut(bettorId) {
  let bettor = null;

  for (const t of ["team1", "team2"]) {
    const found = match[t].bettors.find(b => b.id === bettorId);
    if (found) { bettor = found; break; }
  }
  if (!bettor) return;

  bettor.paidOut = true;
  save();
  render();
}

/* ================= ADMIN CASH CHECK ================= */

function getTotalPaidAmount() {
  let total = 0;

  for (const team of ["team1", "team2"]) {
    for (const b of match[team].bettors) {
      if (b.paid) total += b.amt;
    }
  }
  return total;
}

function checkAdminCash(adminCash) {
  const paidTotal = getTotalPaidAmount();
  const diff = adminCash - paidTotal;

  if (diff === 0) return { status: "MATCH", difference: 0 };
  if (diff < 0) return { status: "SHORT", difference: diff };
  return { status: "EXCESS", difference: diff };
}

function renderAdminCash() {
  if (!match) return;

  const adminCash = Number(document.getElementById("adminCash").value);
  if (isNaN(adminCash)) return alert("Enter admin cash");

  const paidTotal = getTotalPaidAmount();
  const res = checkAdminCash(adminCash);

  cashResult.innerHTML = `
    <p><strong>Total PAID Bets:</strong> ${paidTotal}</p>
    <p><strong>Admin Cash:</strong> ${adminCash}</p>
    <p><strong>Status:</strong>
      <span style="color:${
        res.status === "MATCH" ? "green" :
        res.status === "SHORT" ? "red" : "orange"
      }">${res.status}</span>
    </p>
    <p><strong>Difference:</strong> ${res.difference}</p>
  `;
}

/* ================= UI ================= */

function loadTeamSelect() {
  betTeam.innerHTML = `
    <option value="team1">${match.team1.name}</option>
    <option value="team2">${match.team2.name}</option>
  `;
}

function render() {
  result.innerHTML = `
    <h2>Match Status: ${match.status}</h2>

    <h3>${match.team1.name} (Total: ${match.team1.total})</h3>
    ${renderList("team1")}

    <h3>${match.team2.name} (Total: ${match.team2.total})</h3>
    ${renderList("team2")}
  `;

  renderSettlementButtons();
}

function renderList(team) {
  if (match[team].bettors.length === 0) return "<em>No bettors</em>";

  const odds = getOdds(team).toFixed(2);
  const isWinner = match.status === "FINISHED" && match.winner === team;

  return `
    ${match.status === "OPEN" ? `<p><strong>Odds:</strong> ${odds}x</p>` : ""}
    <ul>
      ${match[team].bettors.map(b => `
        <li>
          ${b.name} — ${b.amt}

          ${match.status === "OPEN" ? `
            <br><small>
              Estimated Payout:
              <strong>${getEstimatedPayout(team, b).toFixed(2)}</strong>
            </small><br>

            <select onchange="updatePaidStatus('${team}','${b.id}',this.value)">
              <option value="unpaid" ${!b.paid ? "selected" : ""}>UNPAID</option>
              <option value="paid" ${b.paid ? "selected" : ""}>PAID</option>
            </select>

            ${!b.paid ? `
              <button onclick="switchBet('${b.id}')">Switch</button>
              <button onclick="deleteBet('${b.id}')" style="color:red">Delete</button>
            ` : `<em> (LOCKED)</em>`}
          ` : ""}

          ${match.status === "FINISHED" ? `
            <br><strong>${isWinner ? "WIN" : "LOSE"}</strong>
            ${isWinner ? `
              <br>Payout:
              <strong>${getFinalPayout(team, b).toFixed(2)}</strong><br>
              <button
                ${b.paidOut ? "disabled" : ""}
                onclick="markPaidOut('${b.id}')">
                ${b.paidOut ? "PAID OUT" : "PAY"}
              </button>
            ` : ""}
          ` : ""}
        </li>
      `).join("")}
    </ul>
  `;
}

/* ================= SETTLEMENT BUTTONS ================= */

function renderSettlementButtons() {
  const el = document.getElementById("settlementButtons");

  if (!match || match.status !== "OPEN") {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = `
    <button onclick="settleMatch('team1')">
      Declare ${match.team1.name} Winner
    </button>
    <button onclick="settleMatch('team2')">
      Declare ${match.team2.name} Winner
    </button>
  `;
}

/* ================= STORAGE ================= */

function save() {
  localStorage.setItem("match", JSON.stringify(match));
}

window.onload = () => {
  const m = localStorage.getItem("match");
  if (!m) return;

  match = JSON.parse(m);
  if (!match.status) {
    match.status = "OPEN";
    save();
  }

  team1.value = match.team1.name;
  team2.value = match.team2.name;
  loadTeamSelect();
  render();
};

