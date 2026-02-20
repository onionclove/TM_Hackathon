// ─── Landing / topbar ────────────────────────────────────────────────────────
const startBtn = document.getElementById("startBtn");
const topbar   = document.getElementById("topbar");
const landing  = document.getElementById("landing");

startBtn?.addEventListener("click", () => {
  topbar.classList.add("show");
  document.querySelector("#intro")?.scrollIntoView({ behavior: "smooth" });
});

window.addEventListener("scroll", () => {
  if (window.scrollY > (landing?.offsetHeight || 300) * 0.35) {
    topbar.classList.add("show");
  }
});

// ─── Tabs ────────────────────────────────────────────────────────────────────
const tabs = Array.from(document.querySelectorAll(".tab"));
const views = {
  system:  document.getElementById("dfd-system"),
  media:   document.getElementById("dfd-media"),
  payment: document.getElementById("dfd-payment"),
  auth:    document.getElementById("dfd-auth"),
};

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    Object.values(views).forEach(v => v?.classList.remove("active"));
    views[btn.dataset.tab]?.classList.add("active");
  });
});

// ─── Component info ───────────────────────────────────────────────────────────
const componentInfo = {
  apiGateway: {
    title: "API Gateway (DMZ)",
    meta: "Entry point + routing + rate limiting",
    responsibilities: [
      "Terminates TLS and enforces basic request controls",
      "Routes /checkout, /refund, and webhook callbacks",
      "Reduces DoS exposure by rate limiting and filtering",
    ],
    flows: [
      "Player > API Gateway: POST /checkout, POST /refund",
      "External Gateway > API Gateway: webhook callback (signed)",
      "API Gateway > Marketplace: validated request",
      "API Gateway > Payment Adapter: forward webhook",
    ],
    assets: ["Auth tokens", "Order IDs", "Webhook events (integrity-critical)"],
    topThreats: ["T-P01 Webhook Spoofing", "T-P06 Checkout DoS", "T-P07 Webhook Flood DoS"],
  },
  marketplace: {
    title: "Marketplace Service (Internal)",
    meta: "Order lifecycle + state machine owner",
    responsibilities: [
      "Validates SKU/price via Product Catalog DB (server-side pricing)",
      "Creates PENDING orders and updates to PAID/REFUNDED based on verified events",
      "Triggers entitlement grants only after PAID",
    ],
    flows: [
      "API Gateway > Marketplace: create order",
      "Marketplace > Purchase DB: insert/update order state",
      "Marketplace > Adapter: create intent / refund initiation",
      "Marketplace > Entitlement Service: grant/revoke",
      "Marketplace > Audit Log: append events",
    ],
    assets: ["Order state integrity", "Pricing integrity", "Refund correctness"],
    topThreats: ["T-P03 Client-side tampering (if pricing trusted)", "Race conditions / double-issue", "Refund abuse"],
  },
  paymentAdapter: {
    title: "Payment Integration Adapter (Internal)",
    meta: "External payment interface + webhook verification",
    responsibilities: [
      "Creates payment intents/charges with external gateway",
      "Receives webhook callbacks via API Gateway and verifies signature",
      "Returns verified payment outcome to Marketplace",
    ],
    flows: [
      "Marketplace > Adapter: create payment intent",
      "Adapter > External Gateway: payment request",
      "External Gateway > API Gateway > Adapter: webhook (confirmed/failed)",
      "Adapter > Marketplace: verified payment result",
      "Adapter > Secrets Vault: read API keys/webhook secrets",
    ],
    assets: ["Webhook authenticity", "Provider txn IDs", "API keys (indirectly)"],
    topThreats: ["T-P01 Webhook spoofing", "T-P02 Webhook replay", "Secret misuse"],
  },
  entitlement: {
    title: "Entitlement Service (Internal)",
    meta: "Inventory/virtual goods grants",
    responsibilities: [
      "Grants cosmetics/currency/boosts after PAID confirmation",
      "Writes inventory updates to Entitlement Store",
      "Supports revocation/adjustments for refunds/chargebacks",
    ],
    flows: [
      "Marketplace > Entitlement Service: grant/revoke",
      "Entitlement Service > Entitlement Store: inventory update",
    ],
    assets: ["Entitlement integrity", "Player inventory correctness"],
    topThreats: ["Unauthorized grants", "Double-issue", "Insufficient revocation"],
  },
  datastores: {
    title: "Persistence & Logging Zone (Data Stores)",
    meta: "Orders, catalog, inventory, and audit evidence",
    responsibilities: [
      "Purchase DB stores order state transitions",
      "Catalog DB is pricing source of truth",
      "Entitlement Store holds player-owned items/currency",
      "Audit Log preserves forensic integrity (append-only)",
    ],
    flows: [
      "Marketplace <> Purchase DB",
      "Marketplace/Entitlement > Entitlement Store",
      "Marketplace > Audit Log",
    ],
    assets: ["Financial records", "Inventory integrity", "Non-repudiation evidence"],
    topThreats: ["DB tampering", "Audit log deletion", "Broken authZ to read purchases"],
  },
  externalGateway: {
    title: "External Payment Gateway (Out of control)",
    meta: "Third-party processor (Stripe/PayPal style)",
    responsibilities: [
      "Processes payment authorization and sends webhook events",
      "Is not trusted by default, only trusted via signature verification",
    ],
    flows: [
      "Adapter > External Gateway: payment/refund initiation",
      "External Gateway > API Gateway: signed webhook callback",
    ],
    assets: ["Provider transaction IDs", "Webhook event signatures"],
    topThreats: ["Event spoofing if signatures not verified", "Availability dependence"],
  },
  secretsVault: {
    title: "Secrets Vault (Separated zone)",
    meta: "API keys + webhook signing secrets",
    responsibilities: [
      "Stores API keys and webhook signing secrets",
      "Enforces strict access control and audit",
    ],
    flows: [
      "Payment Adapter > Secrets Vault: read API keys / webhook signing secrets",
    ],
    assets: ["API keys", "Webhook signing secret", "Encryption keys"],
    topThreats: ["Secret compromise", "Over-permissive access", "No rotation"],
  },
};

// ─── Render component detail panel ───────────────────────────────────────────
const compTitle = document.getElementById("compTitle");
const compMeta  = document.getElementById("compMeta");
const compBody  = document.getElementById("compBody");

function renderComp(compKey) {
  const c = componentInfo[compKey];
  if (!c) return;
  compTitle.textContent = c.title;
  compMeta.textContent  = c.meta;

  const list = arr => `<ul class="clean">${arr.map(x => `<li>${x}</li>`).join("")}</ul>`;
  compBody.innerHTML = `
    <div class="kv"><b>Responsibilities</b>${list(c.responsibilities)}</div>
    <div class="kv"><b>Key Flows</b>${list(c.flows)}</div>
    <div class="kv"><b>Data / Assets</b>${list(c.assets)}</div>
    <div class="kv">
      <b>Top Threats</b>${list(c.topThreats)}
      <button class="btn small" id="openThreatsFromComp">Open related threats ↓</button>
    </div>
  `;

  document.getElementById("openThreatsFromComp")?.addEventListener("click", () => {
    document.querySelector("#threats")?.scrollIntoView({ behavior: "smooth" });
    document.getElementById("searchThreats").value = c.topThreats[0]?.split(" ")[0] || "";
    refreshThreatTable();
  });
}

// ─── DFD ZOOM — transform-origin approach ────────────────────────────────────
//
// HOW IT WORKS:
//   Both the DFD image and its hotspot overlays sit inside .dfd-wrap,
//   which has overflow:hidden.
//
//   When a hotspot is clicked we read its centre position as a % of the
//   container (which equals the same % of the image since the image fills
//   the container at scale:1).
//
//   We set  img.style.transformOrigin = "X% Y%"  so CSS scales the image
//   *toward* that exact point, naturally bringing the component into view.
//   No scroll arithmetic needed — the browser does the geometry for us.
//
//   Hotspots are NOT scaled themselves (they're siblings/children of the
//   wrap, not of the img), so they stay visually in place and remain
//   clickable while zoomed.
// ─────────────────────────────────────────────────────────────────────────────

const dfdWrap  = document.getElementById("paymentDfdWrap");
const dfdImg   = document.getElementById("paymentDfdImg");
const zoomReset = document.getElementById("zoomReset");

let activeHotspot = null;

document.querySelectorAll(".hotspot").forEach(btn => {
  btn.addEventListener("click", () => {
    const comp = btn.dataset.comp;

    // 1. Show component detail
    renderComp(comp);

    // 2. Parse the hotspot's inline percentage coords
    const s           = btn.getAttribute("style");
    const left        = parseFloat(s.match(/left:([\d.]+)%/)?.[1]  ?? 0);
    const top         = parseFloat(s.match(/top:([\d.]+)%/)?.[1]   ?? 0);
    const width       = parseFloat(s.match(/width:([\d.]+)%/)?.[1] ?? 10);
    const height      = parseFloat(s.match(/height:([\d.]+)%/)?.[1]?? 10);

    // Centre of the hotspot in % terms
    const cx = left + width  / 2;
    const cy = top  + height / 2;

    // 3. Read component-specific zoom level, default to 2.6
    const zoomLevel = parseFloat(btn.dataset.zoom) || 2.6;
    
    // 3b. Set transform-origin on the IMAGE to that centre point,
    //    then apply the dynamic zoom scale and add .zoomed to the wrap
    dfdImg.style.transformOrigin = `${cx}% ${cy}%`;
    dfdImg.style.transform = `scale(${zoomLevel})`;
    dfdWrap.classList.add("zoomed");

    // 4. Track active hotspot for visual highlight (but don't show it)
    if (activeHotspot) activeHotspot.classList.remove("active");
    btn.classList.add("active");
    activeHotspot = btn;

    // 5a. Hide ALL hotspots when zoomed to prevent view obstruction
    document.querySelectorAll(".hotspot").forEach(hs => {
      hs.classList.add("hidden");
    });

    // 5c. Show reset button
    zoomReset.style.display = "inline-block";
  });
});

function resetZoom() {
  dfdWrap.classList.remove("zoomed");
  dfdImg.style.transformOrigin = "center center";
  dfdImg.style.transform = "scale(1)";
  if (activeHotspot) {
    activeHotspot.classList.remove("active");
    activeHotspot = null;
  }
  // 5b. Show all hotspots again
  document.querySelectorAll(".hotspot").forEach(hs => {
    hs.classList.remove("hidden");
  });
  zoomReset.style.display = "none";
}

zoomReset?.addEventListener("click", resetZoom);

// Double-click wrap background to reset
dfdWrap?.addEventListener("dblclick", e => {
  if (!e.target.classList.contains("hotspot")) resetZoom();
});

// ─── Assumptions table ────────────────────────────────────────────────────────
const assumptions = [
  {
    a: "Webhook events are signed and verified server-side",
    r: "Architecture depends on webhooks for payment truth",
    i: "If not verified → spoofed payment/refund events",
    v: "Show signature verification logic + provider docs",
  },
  {
    a: "Server-side pricing is authoritative (Catalog DB)",
    r: "Clients can tamper with request bodies",
    i: "If trusted → underpriced purchases",
    v: "Confirm marketplace ignores client price",
  },
  {
    a: "Entitlements are granted only after PAID state",
    r: "Prevents client-side payment confirmation abuse",
    i: "Prevents free item grants",
    v: "Show state machine + entitlement gating code",
  },
];

const assumptionsBody = document.querySelector("#assumptionsTable tbody");
if (assumptionsBody) {
  assumptionsBody.innerHTML = assumptions.map(x => `
    <tr>
      <td>${x.a}</td><td>${x.r}</td><td>${x.i}</td><td>${x.v}</td>
    </tr>
  `).join("");
}

// ─── Threat data ──────────────────────────────────────────────────────────────
const threats = [
  {
    id: "T-P01",
    subsystem: "Payment & Marketplace",
    componentsAffected: "API Gateway, Payment Integration Adapter",
    dataAsset: "Payment confirmation / webhook event",
    dataFlow: "External Payment Gateway > API Gateway > Payment Adapter",
    stride: { S:true, T:false, R:false, I:false, D:false, E:false },
    threatName: "Webhook Spoofing",
    threatDescription: "Attacker sends a forged webhook event to mark an order as PAID and trigger entitlement issuance without a real payment.",
    possibleImpact: "Free entitlements, revenue loss, fraud scaling",
    likelihoodScore: 4,
    impactScore: 5,
  },
  {
    id: "T-P02",
    subsystem: "Payment & Marketplace",
    componentsAffected: "Payment Integration Adapter, Marketplace Service",
    dataAsset: "Provider event ID / order state",
    dataFlow: "External Payment Gateway > API Gateway > Payment Adapter > Marketplace",
    stride: { S:false, T:true, R:false, I:false, D:false, E:false },
    threatName: "Webhook Replay",
    threatDescription: "A valid webhook event is replayed to duplicate processing and re-grant entitlements if idempotency/state checks are weak.",
    possibleImpact: "Duplicate inventory/currency grants, accounting inconsistencies",
    likelihoodScore: 3,
    impactScore: 4,
  },
  {
    id: "T-P03",
    subsystem: "Payment & Marketplace",
    componentsAffected: "Marketplace Service, Product Catalog DB",
    dataAsset: "Pricing / SKU integrity",
    dataFlow: "Player > API Gateway > Marketplace Service",
    stride: { S:false, T:true, R:false, I:false, D:false, E:false },
    threatName: "Client-side Price Manipulation",
    threatDescription: "Client tampers with item/price fields to buy goods cheaper unless server validates price using the catalog source of truth.",
    possibleImpact: "Undervalued purchases, marketplace abuse, financial loss",
    likelihoodScore: 4,
    impactScore: 4,
  },
];

// ─── Threat table ─────────────────────────────────────────────────────────────
const strideFilter     = document.getElementById("strideFilter");
const riskFilter       = document.getElementById("riskFilter");
const searchThreats    = document.getElementById("searchThreats");
const threatTableBody  = document.querySelector("#threatTable tbody");
const threatDetail     = document.getElementById("threatDetail");

function getRiskLevel(score) {
  if (score <= 4)  return "Acceptable";
  if (score <= 9)  return "Adequate";
  if (score <= 16) return "Tolerable";
  return "Unacceptable";
}

function xmark(on) { return on ? "✗" : "" }

function refreshThreatTable() {
  const q              = (searchThreats.value || "").trim().toLowerCase();
  const strideVal      = strideFilter.value;
  const riskLevelVal   = riskFilter.value;

  const rows = threats.filter(t => {
    const okQ = !q || [
      t.id, t.subsystem, t.componentsAffected, t.dataAsset,
      t.dataFlow, t.threatName, t.threatDescription, t.possibleImpact,
    ].some(f => f.toLowerCase().includes(q));

    const okStride    = strideVal    === "ALL" || t.stride[strideVal];
    const okRisk      = riskLevelVal === "ALL" || getRiskLevel(t.likelihoodScore * t.impactScore) === riskLevelVal;
    return okQ && okStride && okRisk;
  });

  threatTableBody.innerHTML = rows.map(t => `
    <tr data-id="${t.id}">
      <td><b>${t.id}</b></td>
      <td>${t.subsystem}</td>
      <td>${t.componentsAffected}</td>
      <td>${t.dataAsset}</td>
      <td>${t.dataFlow}</td>
      <td>${xmark(t.stride.S)}</td>
      <td>${xmark(t.stride.T)}</td>
      <td>${xmark(t.stride.R)}</td>
      <td>${xmark(t.stride.I)}</td>
      <td>${xmark(t.stride.D)}</td>
      <td>${xmark(t.stride.E)}</td>
      <td>${t.threatName}</td>
      <td>${t.threatDescription}</td>
      <td>${t.possibleImpact}</td>
      <td>${t.likelihoodScore}</td>
      <td>${t.impactScore}</td>
    </tr>
  `).join("");

  threatTableBody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", () => showThreat(tr.dataset.id));
  });
}

function showThreat(id) {
  const t = threats.find(x => x.id === id);
  if (!t) return;
  const score = t.likelihoodScore * t.impactScore;
  threatDetail.innerHTML = `
    <div class="kv">
      <b>${t.id} — ${t.threatName}</b>
      <div class="muted tiny">${t.subsystem}</div>
      <p style="margin:8px 0">
        <b>Risk Score:</b>
        <span style="color:var(--accent);font-weight:900;font-size:18px;">${score}</span>
        (${getRiskLevel(score)}) | L: ${t.likelihoodScore} × I: ${t.impactScore}
      </p>
      <p><b>Components:</b> ${t.componentsAffected}</p>
      <p><b>Data Asset:</b> ${t.dataAsset}</p>
      <p><b>Data Flow:</b> ${t.dataFlow}</p>
      <p><b>STRIDE:</b>
        ${t.stride.S?"S ":""}${t.stride.T?"T ":""}${t.stride.R?"R ":""}
        ${t.stride.I?"I ":""}${t.stride.D?"D ":""}${t.stride.E?"E":""}
      </p>
      <p><b>Description:</b> ${t.threatDescription}</p>
      <p><b>Possible Impact:</b> ${t.possibleImpact}</p>
    </div>
  `;
}

[strideFilter, riskFilter].forEach(el => el.addEventListener("change", refreshThreatTable));
searchThreats.addEventListener("input", refreshThreatTable);
refreshThreatTable();

// ─── Risk Matrix ──────────────────────────────────────────────────────────────
const matrix       = document.getElementById("riskMatrix");
const matrixDetail = document.getElementById("matrixDetail");

const likelihoodLevels = [
  { score:1, label:"Rare" },
  { score:2, label:"Unlikely" },
  { score:3, label:"Moderate" },
  { score:4, label:"Likely" },
  { score:5, label:"Almost Certain" },
];
const impactLevels = [
  { score:5, label:"Severe" },
  { score:4, label:"Major" },
  { score:3, label:"Significant" },
  { score:2, label:"Minor" },
  { score:1, label:"Insignificant" },
];

function el(tag, cls, html) {
  const d = document.createElement(tag);
  d.className = cls;
  d.innerHTML = html;
  return d;
}

function buildMatrix() {
  if (!matrix) return;
  matrix.innerHTML = "";
  matrix.appendChild(el("div","mhead","Impact \\ Likelihood"));
  likelihoodLevels.forEach(l =>
    matrix.appendChild(el("div","mhead",`${l.score}<div style="font-size:10px;font-weight:normal">${l.label}</div>`))
  );

  impactLevels.forEach(impact => {
    matrix.appendChild(el("div","mhead",`${impact.score}<div style="font-size:10px;font-weight:normal">${impact.label}</div>`));
    likelihoodLevels.forEach(likelihood => {
      const score = impact.score * likelihood.score;
      const cell  = el("div","mcell",`${score}`);
      cell.dataset.score      = score;
      cell.dataset.riskLevel  = getRiskLevel(score);
      cell.title = `Impact ${impact.score} × Likelihood ${likelihood.score} = ${score} (${getRiskLevel(score)})`;
      cell.addEventListener("click", () => {
        document.querySelectorAll(".mcell").forEach(x => x.classList.remove("active"));
        cell.classList.add("active");
        showBand(score);
      });
      matrix.appendChild(cell);
    });
  });
}

function showBand(riskScore) {
  const matches = threats.filter(t => t.likelihoodScore * t.impactScore === riskScore);
  matrixDetail.innerHTML = `
    <div class="kv">
      <b>Risk Score: ${riskScore} (${getRiskLevel(riskScore)})</b>
      <div class="muted tiny">${matches.length} threat(s)</div>
      <ul class="clean">
        ${matches.map(t => `<li><b>${t.id}</b> — ${t.threatName} (L:${t.likelihoodScore} × I:${t.impactScore})</li>`).join("")
          || "<li class='muted'>No threats with this exact score.</li>"}
      </ul>
    </div>
  `;
}

buildMatrix();

// ─── Modal helpers ────────────────────────────────────────────────────────────
const modal      = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody  = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");

function openModal(title, html) {
  modalTitle.textContent = title;
  modalBody.innerHTML    = html;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}
function closeModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
}
modalClose?.addEventListener("click", closeModal);
modal?.addEventListener("click", e => { if (e.target === modal) closeModal() });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal() });
