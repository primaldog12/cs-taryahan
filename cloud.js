// ===============================
// CS Taryahan - Cloud Sync (FINAL)
// ===============================

const supabaseClient = supabase.createClient(
  "https://ceuflbhqnjtcghzcuxsz.supabase.co",
  "sb_publishable_fhZ2uxpTqDhh4QKBhH2nnw_06OBbiPK"
);

// ===============================
// SAVE MATCH (ENCODER)
// ===============================
async function saveMatchToCloud() {
  if (!match) {
    alert("Walang match na ise-save");
    return;
  }

  if (!match.id) {
    match.id = crypto.randomUUID();
  }

  // TRY UPDATE FIRST
  const updateRes = await supabaseClient
    .from("matches")
    .update({
      data: match,
      updated_at: new Date().toISOString()
    })
    .eq("id", match.id)
    .select(); // ⭐ IMPORTANT

  if (!updateRes.error && updateRes.data.length > 0) {
    navigator.clipboard.writeText(match.id);
    alert("Na-save sa cloud!\n\nAUTO COPIED Match Code:\n" + match.id);
    return;
  }

  // FALLBACK INSERT
  const insertRes = await supabaseClient
    .from("matches")
    .insert({
      id: match.id,
      data: match,
      updated_at: new Date().toISOString()
    })
    .select(); // ⭐ IMPORTANT

  if (insertRes.error) {
    console.error(insertRes.error);
    alert("Failed mag-save sa cloud");
    return;
  }

  navigator.clipboard.writeText(match.id);
  alert("Na-save sa cloud!\n\nAUTO COPIED Match Code:\n" + match.id);
}

// ===============================
// LOAD MATCH (COLLECTOR)
// ===============================
async function loadMatchFromCloud() {
  const input = document.getElementById("matchCode");
  if (!input) {
    alert("Walang Match Code input");
    return;
  }

  const code = input.value.trim();
  if (!code) {
    alert("Ilagay ang Match Code");
    return;
  }

  const { data, error } = await supabaseClient
    .from("matches")
    .select("data")
    .eq("id", code)
    .limit(1);

  if (error) {
    console.error(error);
    alert("Error sa pag-load ng match");
    return;
  }

  if (!data || data.length === 0) {
    alert("Walang nahanap na match");
    return;
  }

  match = data[0].data;
  localStorage.setItem("match", JSON.stringify(match));
  render();

  alert("Match loaded from cloud!");
}
