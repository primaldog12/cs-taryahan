/* ================= PAYOUT & ACCOUNTING ================= */

function getTotalPool() {
  return match.team1.total + match.team2.total;
}

function getOdds(teamKey) {
  const pool = getTotalPool();
  const teamTotal = match[teamKey].total;
  if (teamTotal === 0) return 0;
  return pool / teamTotal;
}

function getPossiblePayout(teamKey, amount) {
  return amount * getOdds(teamKey);
}

function getFinalPayout(teamKey, bettor) {
  if (match.status !== "FINISHED") return 0;
  if (match.winner !== teamKey) return 0;
  return bettor.amt * getOdds(teamKey);
}

function getTotalPaidAmount() {
  let total = 0;
  ["team1", "team2"].forEach(t => {
    match[t].bettors.forEach(b => {
      if (b.paid) total += b.amt;
    });
  });
  return total;
}

function checkAdminCash(adminCash) {
  const paidTotal = getTotalPaidAmount();
  const diff = adminCash - paidTotal;

  if (diff === 0) {
    return { status: "MATCH", difference: 0 };
  }
  return {
    status: diff > 0 ? "EXCESS" : "SHORT",
    difference: diff
  };
}
