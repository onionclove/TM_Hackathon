// --- Smooth start transition ---
const startBtn = document.getElementById("startBtn");
const topbar = document.getElementById("topbar");
const landing = document.getElementById("landing");

startBtn?.addEventListener("click", () => {
  // show nav and scroll into intro
  topbar.classList.add("show");
  document.querySelector("#intro")?.scrollIntoView({ behavior: "smooth" });
});

window.addEventListener("scroll", () => {
  // Show topbar after leaving landing
  const show = window.scrollY > (landing?.offsetHeight || 300) * 0.35;
  if (show) topbar.classList.add("show");
});

// --- Tabs ---
const tabs = Array.from(document.querySelectorAll(".tab"));
const views = {
  system: document.getElementById("dfd-system"),
  media: document.getElementById("dfd-media"),
  payment: document.getElementById("dfd-payment"),
  auth: document.getElementById("dfd-auth"),
};

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    const key = btn.dataset.tab;

    Object.values(views).forEach(v => v?.classList.remove("active"));
    views[key]?.classList.add("active");
  });
});

// --- Component panel data (Payment DFD) ---
const compTitle = document.getElementById("compTitle");
const compMeta = document.getElementById("compMeta");
const compBody = document.getElementById("compBody");

const componentInfo = {
  apiGateway: {
    title: "API Gateway (DMZ)",
    meta: "Entry point + routing + rate limiting",
    responsibilities: [
      "Terminates TLS and enforces basic request controls",
      "Routes /checkout, /refund, and webhook callbacks",
      "Reduces DoS exposure by rate limiting and filtering"
    ],
    flows: [
      "Player → API Gateway: POST /checkout, POST /refund",
      "External Gateway → API Gateway: webhook callback (signed)",
      "API Gateway → Marketplace: validated request",
      "API Gateway → Payment Adapter: forward webhook"
    ],
    assets: ["Auth tokens", "Order IDs", "Webhook events (integrity-critical)"],
    topThreats: ["T-P01 Webhook Spoofing", "T-P06 Checkout DoS", "T-P07 Webhook Flood DoS"]
  },

  marketplace: {
    title: "Marketplace Service (Internal)",
    meta: "Order lifecycle + state machine owner",
    responsibilities: [
      "Validates SKU/price via Product Catalog DB (server-side pricing)",
      "Creates PENDING orders and updates to PAID/REFUNDED based on verified events",
      "Triggers entitlement grants only after PAID"
    ],
    flows: [
      "API Gateway → Marketplace: create order",
      "Marketplace → Purchase DB: insert/update order state",
      "Marketplace → Payment Adapter: create intent / refund initiation",
      "Marketplace → Entitlement Service: grant/revoke",
      "Marketplace → Audit Log: append events"
    ],
    assets: ["Order state integrity", "Pricing integrity", "Refund correctness"],
    topThreats: ["T-P03 Client-side tampering (if pricing trusted)", "Race conditions / double-issue", "Refund abuse"]
  },

  paymentAdapter: {
    title: "Payment Integration Adapter (Internal)",
    meta: "External payment interface + webhook verification",
    responsibilities: [
      "Creates payment intents/charges with external gateway",
      "Receives webhook callbacks via API Gateway and verifies signature",
      "Returns verified payment outcome to Marketplace"
    ],
    flows: [
      "Marketplace → Adapter: create payment intent",
      "Adapter → External Gateway: payment request",
      "External Gateway → API Gateway → Adapter: webhook (confirmed/failed)",
      "Adapter → Marketplace: verified payment result",
      "Adapter → Secrets Vault: read API keys/webhook secrets"
    ],
    assets: ["Webhook authenticity", "Provider txn IDs", "API keys (indirectly)"],
    topThreats: ["T-P01 Webhook spoofing", "T-P02 Webhook replay", "Secret misuse"]
  },

  entitlement: {
    title: "Entitlement Service (Internal)",
    meta: "Inventory/virtual goods grants",
    responsibilities: [
      "Grants cosmetics/currency/boosts after PAID confirmation",
      "Writes inventory updates to Entitlement Store",
      "Supports revocation/adjustments for refunds/chargebacks"
    ],
    flows: [
      "Marketplace → Entitlement Service: grant/revoke",
      "Entitlement Service → Entitlement Store: inventory update"
    ],
    assets: ["Entitlement integrity", "Player inventory correctness"],
    topThreats: ["Unauthorized grants", "Double-issue", "Insufficient revocation"]
  },

  datastores: {
    title: "Persistence & Logging Zone (Data Stores)",
    meta: "Orders, catalog, inventory, and audit evidence",
    responsibilities: [
      "Purchase DB stores order state transitions",
      "Catalog DB is pricing source of truth",
      "Entitlement Store holds player-owned items/currency",
      "Audit Log preserves forensic integrity (append-only)"
    ],
    flows: [
      "Marketplace ↔ Purchase DB",
      "Marketplace/Entitlement → Entitlement Store",
      "Marketplace → Audit Log"
    ],
    assets: ["Financial records", "Inventory integrity", "Non-repudiation evidence"],
    topThreats: ["DB tampering", "Audit log deletion", "Broken authZ to read purchases"]
  },

  externalGateway: {
    title: "External Payment Gateway (Out of control)",
    meta: "Third-party processor (Stripe/PayPal style)",
    responsibilities: [
      "Processes payment authorization and sends webhook events",
      "Is not trusted by default—only trusted via signature verification"
    ],
    flows: [
      "Adapter → Gateway: payment/refund initiation",
      "Gateway → API Gateway: signed webhook callback"
    ],
    assets: ["Provider transaction IDs", "Webhook event signatures"],
    topThreats: ["Event spoofing if signatures not verified", "Availability dependence"]
  },

  secretsVault: {
    title: "Secrets Vault (Separated zone)",
    meta: "API keys + webhook signing secrets",
    responsibilities: [
      "Stores API keys and webhook signing secrets",
      "Enforces strict access control and audit"
    ],
    flows: [
      "Payment Adapter → Secrets Vault: read API keys / webhook signing secrets"
    ],
    assets: ["API keys", "Webhook signing secret", "Encryption keys"],
    topThreats: ["Secret compromise", "Over-permissive access", "No rotation"]
  }
};

function renderComp(compKey){
  const c = componentInfo[compKey];
  if (!c) return;

  compTitle.textContent = c.title;
  compMeta.textContent = c.meta;

  const list = (arr) => `<ul class="clean">${arr.map(x=>`<li>${x}</li>`).join("")}</ul>`;
  compBody.innerHTML = `
    <div class="kv">
      <b>Responsibilities</b>
      ${list(c.responsibilities)}
    </div>
    <div class="kv">
      <b>Key Flows</b>
      ${list(c.flows)}
    </div>
    <div class="kv">
      <b>Data / Assets</b>
      ${list(c.assets)}
    </div>
    <div class="kv">
      <b>Top Threats</b>
      ${list(c.topThreats)}
      <button class="btn small" id="openThreatsFromComp">Open related threats</button>
    </div>
  `;

  document.getElementById("openThreatsFromComp")?.addEventListener("click", () => {
    document.querySelector("#threats")?.scrollIntoView({ behavior: "smooth" });
    document.getElementById("searchThreats").value = c.topThreats[0]?.split(" ")[0] || "";
    refreshThreatTable();
  });
}

// --- Zoom functionality for DFD hotspots ---
const paymentDfdWrap = document.getElementById("paymentDfdWrap");
const paymentDfdImg = document.getElementById("paymentDfdImg");
const zoomReset = document.getElementById("zoomReset");
let isZoomed = false;

document.querySelectorAll(".hotspot").forEach(btn => {
  btn.addEventListener("click", () => {
    const comp = btn.dataset.comp;
    
    // First, show the component detail
    renderComp(comp);
    
    // Then zoom to the component
    if (paymentDfdWrap && paymentDfdImg) {
      // Extract percentage-based positioning from hotspot inline style
      const style = btn.getAttribute("style");
      const leftMatch = style.match(/left:(\d+(?:\.\d+)?)%/);
      const topMatch = style.match(/top:(\d+(?:\.\d+)?)%/);
      const widthMatch = style.match(/width:(\d+(?:\.\d+)?)%/);
      const heightMatch = style.match(/height:(\d+(?:\.\d+)?)%/);
      
      const left = leftMatch ? parseFloat(leftMatch[1]) : 0;
      const top = topMatch ? parseFloat(topMatch[1]) : 0;
      const width = widthMatch ? parseFloat(widthMatch[1]) : 10;
      const height = heightMatch ? parseFloat(heightMatch[1]) : 10;
      
      // Calculate center of component in percentage terms
      const componentCenterX = left + width / 2;
      const componentCenterY = top + height / 2;
      
      // Add zoom class
      paymentDfdWrap.classList.add("zoomed");
      isZoomed = {
        x: componentCenterX,
        y: componentCenterY,
        comp: comp
      };
      
      // Highlight the active hotspot
      document.querySelectorAll(".hotspot").forEach(h => h.classList.remove("zoomed-active"));
      btn.classList.add("zoomed-active");
      
      // Calculate scroll position based on zoomed image dimensions
      setTimeout(() => {
        const imgWidth = paymentDfdImg.scrollWidth;
        const imgHeight = paymentDfdImg.scrollHeight;
        
        // Convert percentages to pixel coordinates in the scaled image
        const componentPixelX = (componentCenterX / 100) * imgWidth;
        const componentPixelY = (componentCenterY / 100) * imgHeight;
        
        // Scroll to center the component (accounting for the viewport size)
        paymentDfdWrap.scrollLeft = componentPixelX - (paymentDfdWrap.clientWidth / 2);
        paymentDfdWrap.scrollTop = componentPixelY - (paymentDfdWrap.clientHeight / 2);
      }, 100);
    }
  });
});

// Reset zoom button
zoomReset?.addEventListener("click", (e) => {
  e.stopPropagation();
  paymentDfdWrap?.classList.remove("zoomed");
  document.querySelectorAll(".hotspot").forEach(h => h.classList.remove("zoomed-active"));
  isZoomed = false;
});

// Double-click on wrap to reset zoom
paymentDfdWrap?.addEventListener("dblclick", () => {
  if (isZoomed) {
    paymentDfdWrap.classList.remove("zoomed");
    document.querySelectorAll(".hotspot").forEach(h => h.classList.remove("zoomed-active"));
    isZoomed = false;
  }
});

// --- Assumptions table (seed with your draft; editable later) ---
const assumptions = [
  {
    a: "Webhook events are signed and verified server-side",
    r: "Architecture depends on webhooks for payment truth",
    i: "If not verified → spoofed payment/refund events",
    v: "Show signature verification logic + provider docs"
  },
  {
    a: "Server-side pricing is authoritative (Catalog DB)",
    r: "Clients can tamper with request bodies",
    i: "If trusted → underpriced purchases",
    v: "Confirm marketplace ignores client price"
  },
  {
    a: "Entitlements are granted only after PAID state",
    r: "Prevents client-side payment confirmation abuse",
    i: "Prevents free item grants",
    v: "Show state machine + entitlement gating code"
  }
];

const assumptionsTable = document.querySelector("#assumptionsTable tbody");
if (assumptionsTable){
  assumptionsTable.innerHTML = assumptions.map(x=>`
    <tr>
      <td>${x.a}</td><td>${x.r}</td><td>${x.i}</td><td>${x.v}</td>
    </tr>
  `).join("");
}

// --- Threat table data (seeded from your draft doc for payment) ---
const threats = [
  {
    id: "T-P01",
    subsystem: "Payment & Marketplace",
    componentsAffected: "API Gateway, Payment Integration Adapter",
    dataAsset: "Payment confirmation / webhook event",
    dataFlow: "External Payment Gateway → API Gateway → Payment Adapter",
    stride: { S:true, T:false, R:false, I:false, D:false, E:false },
    threatName: "Webhook Spoofing",
    threatDescription: "Attacker sends a forged webhook event to mark an order as PAID and trigger entitlement issuance without a real payment.",
    possibleImpact: "Free entitlements, revenue loss, fraud scaling",
    likelihoodScore: 4,
    impactScore: 5
  },
  {
    id: "T-P02",
    subsystem: "Payment & Marketplace",
    componentsAffected: "Payment Integration Adapter, Marketplace Service",
    dataAsset: "Provider event ID / order state",
    dataFlow: "External Payment Gateway → API Gateway → Payment Adapter → Marketplace",
    stride: { S:false, T:true, R:false, I:false, D:false, E:false },
    threatName: "Webhook Replay",
    threatDescription: "A valid webhook event is replayed to duplicate processing and re-grant entitlements if idempotency/state checks are weak.",
    possibleImpact: "Duplicate inventory/currency grants, accounting inconsistencies",
    likelihoodScore: 3,
    impactScore: 4
  },
  {
    id: "T-P03",
    subsystem: "Payment & Marketplace",
    componentsAffected: "Marketplace Service, Product Catalog DB",
    dataAsset: "Pricing / SKU integrity",
    dataFlow: "Player → API Gateway → Marketplace Service",
    stride: { S:false, T:true, R:false, I:false, D:false, E:false },
    threatName: "Client-side Price Manipulation",
    threatDescription: "Client tampers with item/price fields to buy goods cheaper unless server validates price using the catalog source of truth.",
    possibleImpact: "Undervalued purchases, marketplace abuse, financial loss",
    likelihoodScore: 4,
    impactScore: 4
  }
];

// --- Table rendering + filtering ---
const strideFilter = document.getElementById("strideFilter");
const riskFilter = document.getElementById("riskFilter");
const searchThreats = document.getElementById("searchThreats");
const threatTableBody = document.querySelector("#threatTable tbody");
const threatDetail = document.getElementById("threatDetail");

function riskTag(r){
  const cls = r === "CRITICAL" ? "crit" : r === "HIGH" ? "high" : r === "MED" ? "med" : "low";
  return `<span class="tag ${cls}">${r}</span>`;
}

function strideName(s){
  return ({S:"Spoofing",T:"Tampering",R:"Repudiation",I:"Info Disclosure",D:"DoS",E:"EoP"})[s] || s;
}

function xmark(on){ return on ? "X" : ""; }

// Calculate risk score (1-25) and get risk category
function getRiskLevel(riskScore) {
  if (riskScore <= 4) return "Acceptable";
  if (riskScore <= 9) return "Adequate";
  if (riskScore <= 16) return "Tolerable";
  return "Unacceptable";
}

function refreshThreatTable(){
  const q = (searchThreats.value || "").trim().toLowerCase();
  const strideFilterVal = strideFilter.value;
  const riskLevelFilter = riskFilter.value;

  const rows = threats.filter(t => {
    const okQ = !q || (
      t.id.toLowerCase().includes(q) ||
      t.subsystem.toLowerCase().includes(q) ||
      t.componentsAffected.toLowerCase().includes(q) ||
      t.dataAsset.toLowerCase().includes(q) ||
      t.dataFlow.toLowerCase().includes(q) ||
      t.threatName.toLowerCase().includes(q) ||
      t.threatDescription.toLowerCase().includes(q) ||
      t.possibleImpact.toLowerCase().includes(q)
    );
    
    const okStride = (strideFilterVal === "ALL") || t.stride[strideFilterVal];
    
    const threatScore = t.likelihoodScore * t.impactScore;
    const threatRiskLevel = getRiskLevel(threatScore);
    const okRisk = (riskLevelFilter === "ALL") || (threatRiskLevel === riskLevelFilter);
    
    return okQ && okStride && okRisk;
  });

  threatTableBody.innerHTML = rows.map(t => {
    const riskScore = t.likelihoodScore * t.impactScore;
    const riskLevel = getRiskLevel(riskScore);
    return `
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
    `;
  }).join("");

  threatTableBody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", () => showThreat(tr.dataset.id));
  });
}

function showThreat(id){
  const t = threats.find(x => x.id === id);
  if (!t) return;
  
  const riskScore = t.likelihoodScore * t.impactScore;
  const riskLevel = getRiskLevel(riskScore);

  threatDetail.innerHTML = `
    <div class="kv">
      <b>${t.id} — ${t.threatName}</b>
      <div class="muted tiny">${t.subsystem}</div>
      <p style="margin:8px 0"><b>Risk Score:</b> <span style="color:var(--accent);font-weight:900;font-size:18px;">${riskScore}</span> (${riskLevel}) | L: ${t.likelihoodScore} × I: ${t.impactScore}</p>
      <p><b>Components:</b> ${t.componentsAffected}</p>
      <p><b>Data Asset:</b> ${t.dataAsset}</p>
      <p><b>Data Flow:</b> ${t.dataFlow}</p>
      <p><b>STRIDE:</b>
        ${t.stride.S ? "S " : ""}${t.stride.T ? "T " : ""}${t.stride.R ? "R " : ""}
        ${t.stride.I ? "I " : ""}${t.stride.D ? "D " : ""}${t.stride.E ? "E" : ""}
      </p>
      <p><b>Description:</b> ${t.threatDescription}</p>
      <p><b>Possible Impact:</b> ${t.possibleImpact}</p>
    </div>
  `;
}

[strideFilter, riskFilter].forEach(el => el.addEventListener("change", refreshThreatTable));
searchThreats.addEventListener("input", refreshThreatTable);
refreshThreatTable();

// --- Risk matrix (5x5 with numeric scoring) ---
const matrix = document.getElementById("riskMatrix");
const matrixDetail = document.getElementById("matrixDetail");

// 5 likelihood levels (columns): 1=Rare, 2=Unlikely, 3=Moderate, 4=Likely, 5=Almost Certain
const likelihoodLevels = [
  { score: 1, label: "Rare" },
  { score: 2, label: "Unlikely" },
  { score: 3, label: "Moderate" },
  { score: 4, label: "Likely" },
  { score: 5, label: "Almost Certain" }
];

// 5 impact levels (rows): 1=Insignificant, 2=Minor, 3=Significant, 4=Major, 5=Severe
const impactLevels = [
  { score: 5, label: "Severe" },
  { score: 4, label: "Major" },
  { score: 3, label: "Significant" },
  { score: 2, label: "Minor" },
  { score: 1, label: "Insignificant" }
];

function buildMatrix(){
  if (!matrix) return;
  matrix.innerHTML = "";

  // Header row
  matrix.appendChild(el("div","mhead","Impact \\ Likelihood"));
  likelihoodLevels.forEach(l => matrix.appendChild(el("div","mhead",`${l.score}<div style="font-size:10px;font-weight:normal">${l.label}</div>`)));

  // Data rows (impact highest to lowest)
  impactLevels.forEach(impact => {
    const impactHeader = el("div","mhead",`${impact.score}<div style="font-size:10px;font-weight:normal">${impact.label}</div>`);
    matrix.appendChild(impactHeader);
    
    likelihoodLevels.forEach(likelihood => {
      const riskScore = impact.score * likelihood.score;
      const riskLevel = getRiskLevel(riskScore);
      
      const cell = el("div","mcell",`${riskScore}`);
      cell.dataset.score = riskScore;
      cell.dataset.impact = impact.score;
      cell.dataset.likelihood = likelihood.score;
      cell.dataset.riskLevel = riskLevel;
      cell.title = `Impact: ${impact.score} × Likelihood: ${likelihood.score} = ${riskScore} (${riskLevel})`;

      cell.addEventListener("click", () => {
        document.querySelectorAll(".mcell").forEach(x => x.classList.remove("active"));
        cell.classList.add("active");
        showBand(riskScore);
      });

      matrix.appendChild(cell);
    });
  });
}

function showBand(riskScore){
  const riskLevel = getRiskLevel(riskScore);
  const matches = threats.filter(t => {
    const threatScore = t.likelihoodScore * t.impactScore;
    return threatScore === riskScore;
  });
  
  matrixDetail.innerHTML = `
    <div class="kv">
      <b>Risk Score: ${riskScore} (${riskLevel})</b>
      <div class="muted tiny">${matches.length} threat(s)</div>
      <ul class="clean">
        ${matches.map(t => `<li><b>${t.id}</b> — ${t.threatName} (L:${t.likelihoodScore} × I:${t.impactScore})</li>`).join("") || "<li class='muted'>No threats with this exact score.</li>"}
      </ul>
    </div>
  `;
  
  // Optional: filter table to threats with same or similar risk level
  // This is just for reference; you can adjust filtering as needed
}

function el(tag, cls, text){
  const d = document.createElement(tag);
  d.className = cls;
  d.innerHTML = text;
  return d;
}

buildMatrix();

// --- Modal helpers ---
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");

function openModal(title, html){
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}
function closeModal(){
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
}
modalClose?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});