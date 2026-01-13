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
  if (!match) return alert("No active match");

  const name = bettorName.value.trim();
  const amt = Number(betAmount.value);
  const team = betTeam.value;

  if (!name || amt <= 0) return alert("Invalid bet");

  match[team].bettors.push({
    id: crypto.randomUUID(),
    name,
    amt,
    paid: false,    // collection
    paidOut: false  // payout
  });

  match[team].total += amt;
  save();
  render();
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
  if (!bettor || !fromTeam) return;

  const toTeam = fromTeam === "team1" ? "team2" : "team1";
  const moved = { ...bettor };

  match[fromTeam].bettors =
    match[fromTeam].bettors.filter(b => b.id !== bettorId);
  match[fromTeam].total -= bettor.amt;

  match[toTeam].bettors.push(moved);
  match[toTeam].total += bettor.amt;

  save();
  render();
}

/* ================= SETTLEMENT ================= */

function settleMatch(winningTeam) {
  if (!match || match.status !== "OPEN") {
    alert("Match already settled");
    return;
  }

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
            <select onchange="updatePaidStatus('${team}','${b.id}',this.value)">
              <option value="unpaid" ${!b.paid ? "selected" : ""}>UNPAID</option>
              <option value="paid" ${b.paid ? "selected" : ""}>PAID</option>
            </select>
            <button type="button" onclick="switchBet('${b.id}')">Switch</button>
          ` : ""}

          ${match.status === "FINISHED" ? `
            <br><strong>${isWinner ? "WIN" : "LOSE"}</strong>
            ${isWinner ? `
              <br>Payout: <strong>${getFinalPayout(team, b).toFixed(2)}</strong>
              <br>
              <button type="button"
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

/* ================= SETTLEMENT BUTTONS (TEAM NAMES) ================= */

function renderSettlementButtons() {
  const el = document.getElementById("settlementButtons");

  if (!match || match.status !== "OPEN") {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = `
    <button type="button" onclick="settleMatch('team1')">
      Declare ${match.team1.name} Winner
    </button>
    <button type="button" onclick="settleMatch('team2')">
      Declare ${match.team2.name} Winner
    </button>
  `;
}

/* ================= ADMIN CASH CHECK ================= */

function renderAdminCash() {
  const adminCash = Number(adminCashInput = document.getElementById("adminCash").value);
  if (!adminCash && adminCash !== 0) return alert("Enter admin cash");

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
