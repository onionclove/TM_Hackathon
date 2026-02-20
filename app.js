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
  // ─── Media Upload Components ─────────────────────────────────────────────────
  mediaApiGateway: {
    title: "API Gateway (Media)",
    meta: "Entry point for media upload requests",
    responsibilities: [
      "Receives media upload requests from players",
      "Routes requests to Media Upload Service",
      "Rate limiting and basic request validation",
    ],
    flows: [
      "Player > API Gateway: POST /upload with media file",
      "API Gateway > Media Upload Service: forward upload",
    ],
    assets: ["User auth tokens", "Uploaded file metadata"],
    topThreats: ["T-M01 Account Upload Impersonation", "T-M02 File Upload Flooding", "T-M03 Polyglot File Upload"],
  },
  mediaUploadService: {
    title: "Media Upload Service",
    meta: "Orchestrates upload processing pipeline",
    responsibilities: [
      "Accepts uploaded files and validates format/size",
      "Sends files to Worker Zone for scanning",
      "Routes approved/quarantined content based on scan results",
    ],
    flows: [
      "API Gateway > Upload Service: media file",
      "Upload Service > Worker Zone: scan request",
      "Worker Zone > Upload Service: scan result",
      "Upload Service > Approved/Quarantine Zones: store file",
    ],
    assets: ["File integrity", "Upload metadata", "Scan results"],
    topThreats: ["T-M03 Polyglot File Upload", "T-M02 File Upload Flooding", "T-M06 Bucket Exposure"],
  },
  approvedQuarantineZones: {
    title: "Approved/Quarantine Storage Zones",
    meta: "Segregated storage for safe vs. flagged content",
    responsibilities: [
      "Approved Zone stores clean, verified content",
      "Quarantine Zone isolates flagged/suspicious content",
      "Enforces strict access control between zones",
    ],
    flows: [
      "Upload Service > Approved Zone: clean files",
      "Upload Service > Quarantine Zone: flagged files",
      "Moderator > Quarantine Zone: review access",
    ],
    assets: ["User-generated content", "Content classification metadata"],
    topThreats: ["T-M06 Bucket Exposure", "T-M05 Moderator repudiation", "T-M04 Moderator impersonation"],
  },
  contentCdn: {
    title: "Content CDN Server",
    meta: "Distributes approved media to players",
    responsibilities: [
      "Serves approved media files to end users",
      "Caches content for performance",
      "Enforces access controls on sensitive content",
    ],
    flows: [
      "Approved Zone > CDN: replicate approved files",
      "Player > CDN: request media",
      "CDN > Player: serve content",
    ],
    assets: ["Public/private media files", "CDN credentials"],
    topThreats: ["T-M03 Polyglot File Upload", "T-M06 Bucket Exposure", "CDN cache poisoning"],
  },
  moderatorZone: {
    title: "Moderator Zone",
    meta: "Human review interface for flagged content",
    responsibilities: [
      "Provides moderators access to quarantined content",
      "Tracks moderation decisions and actions",
      "Enforces moderator authentication and authorization",
    ],
    flows: [
      "Moderator > Moderator Zone: review quarantined content",
      "Moderator Zone > Quarantine Zone: read flagged files",
      "Moderator > Upload Service: approve/reject decision",
    ],
    assets: ["Moderator credentials", "Review audit logs"],
    topThreats: ["T-M04 Moderator impersonation", "T-M05 Moderator repudiation", "Audit log tampering"],
  },
  workerZone: {
    title: "Worker Zone (Scanning)",
    meta: "Automated content scanning and analysis",
    responsibilities: [
      "Scans uploaded files for malware/viruses",
      "Checks content against policy rules (NSFW, violence, etc.)",
      "Returns scan verdict to Upload Service",
    ],
    flows: [
      "Upload Service > Worker Zone: file + scan request",
      "Worker > Scanning engines: run analysis",
      "Worker > Upload Service: scan verdict (clean/flagged)",
    ],
    assets: ["Scan engine integrity", "Detection signatures", "Scanning logs"],
    topThreats: ["T-M03 Polyglot File Upload", "Scanner bypass", "Malicious worker compromise"],
  },
  // ─── Authentication & Identity Components (based on authenticate-dfd.svg) ──
  authApiGateway: {
    title: "API Gateway (DMZ — Auth Surface)",
    meta: "TLS termination, rate limiting, auth routing",
    responsibilities: [
      "Terminates TLS for all auth endpoints (login, register, reset, MFA)",
      "Applies rate limiting and bot detection to prevent brute-force and credential-stuffing attacks",
      "Routes auth requests to Auth Service and returns JWT tokens and policy state to Player",
      "Enforces input validation before forwarding to internal services",
    ],
    flows: [
      "Player > API Gateway: Registration, Login credentials, Password reset, MFA code submit",
      "Admin/Support > API Gateway: Elevated auth request",
      "API Gateway > Auth Service: Validated auth request",
      "Auth Service > API Gateway: Issue access token (short TTL), Return age policy state",
      "API Gateway > Player: JWT Token / Auth Response",
    ],
    assets: ["Credentials in transit", "JWT tokens", "Session cookies", "Rate limit state"],
    topThreats: ["T-A01 Credential Stuffing", "T-A06 Auth Endpoint DoS", "T-A05 Session Hijacking"],
  },
  authService: {
    title: "Auth Service (Identity — Core)",
    meta: "Registration, login, token issuance, MFA orchestration, risk evaluation",
    responsibilities: [
      "Handles email/password registration with bcrypt/argon2 hashing",
      "Authenticates users and issues signed JWT tokens with role claims",
      "Orchestrates MFA verification flow (delegates to MFA Verification service)",
      "Manages password reset flow via Email Worker",
      "Evaluates bot/risk signals and escalates challenges via Bot/Risk Engine",
      "Applies age/parental consent policies via Parental Consent/Policy Service",
      "Writes all auth events to immutable Audit Log",
    ],
    flows: [
      "API Gateway > Auth Service: validated credentials",
      "Auth Service > Auth DB: credential verify",
      "Auth Service > Session/Token Store: create/rotate/revoke token family (jti/session state)",
      "Auth Service > Audit Log: immutable auth events",
      "Auth Service > Email Worker: trigger reset/verification emails (async)",
      "Auth Service > MFA Verification: verify MFA code",
      "Auth Service > User Profile Service: provision/read profile context",
      "Auth Service ↔ Bot/Risk Engine: risk evaluation request / challenge result",
      "Auth Service ↔ Policy Service: age/consent policy decision",
      "Auth Service > Secrets Vault: read JWT signing keys",
    ],
    assets: ["Hashed passwords", "JWT signing logic", "MFA secrets/seeds", "User role assignments", "Age flags", "Risk signals"],
    topThreats: ["T-A01 Credential Stuffing", "T-A02 JWT Forgery", "T-A03 Password Reset Abuse", "T-A04 MFA Bypass"],
  },
  authUserProfile: {
    title: "User Profile Service (Internal)",
    meta: "Profile data, age flags, privacy settings",
    responsibilities: [
      "Stores and serves user metadata (display name, stats, preferences)",
      "Manages age flags and parental consent records (COPPA/GDPR-K)",
      "Enforces privacy flags for minor accounts",
    ],
    flows: [
      "Auth Service > User Profile Service: provision/read profile context",
      "User Profile Service > User DB: read/write profile data, age flags, consent records",
    ],
    assets: ["PII (name, email, DOB)", "Age classification flags", "Privacy settings", "Parental consent records"],
    topThreats: ["T-A07 Minor Data Exposure / Age Flag Bypass", "Broken access control to other profiles", "PII leakage"],
  },
  authEmailWorker: {
    title: "Email Worker (Background — Async)",
    meta: "Async email dispatch for auth flows",
    responsibilities: [
      "Sends password reset emails with time-limited, single-use tokens",
      "Sends email verification links for new registrations",
      "Reads SMTP credentials from Secrets Vault",
    ],
    flows: [
      "Auth Service > Email Worker: trigger reset/verification emails (async)",
      "Email Worker > External Email Provider: SMTP/API dispatch",
      "Email Worker > Secrets Vault: read SMTP credentials",
      "External Email Provider > Player: password reset / verification email",
    ],
    assets: ["Reset tokens (time-limited, single-use)", "SMTP credentials (via vault)", "Email content"],
    topThreats: ["T-A03 Password Reset Token Abuse", "Reset token leakage", "Email enumeration via differing responses"],
  },
  authMfaService: {
    title: "MFA Verification Service (Internal)",
    meta: "TOTP validation and SMS OTP dispatch",
    responsibilities: [
      "Validates TOTP codes against stored MFA seeds",
      "Dispatches SMS OTP via external provider when SMS MFA is configured",
      "Returns verification result (pass/fail) to Auth Service",
    ],
    flows: [
      "Auth Service > MFA Service: verify MFA code",
      "MFA Service > Auth Service: MFA result (pass/fail)",
      "MFA Service > External MFA/SMS Provider: OTP/TOTP external dependency",
      "MFA Service > Secrets Vault: read MFA API keys",
    ],
    assets: ["TOTP secrets/seeds", "SMS OTP codes in transit", "MFA provider API keys"],
    topThreats: ["T-A04 MFA Bypass / Downgrade", "SMS interception / SIM swap", "TOTP secret exposure"],
  },
  authBotRiskEngine: {
    title: "Bot / Risk Engine (Internal)",
    meta: "Anomaly detection and challenge escalation",
    responsibilities: [
      "Evaluates login/registration requests for bot patterns and credential stuffing signals",
      "Issues CAPTCHA or step-up authentication challenges on suspicious activity",
      "Returns risk assessment result to Auth Service for decision-making",
    ],
    flows: [
      "Auth Service > Bot/Risk Engine: risk evaluation request",
      "Bot/Risk Engine > Auth Service: risk/challenge result",
    ],
    assets: ["Risk signals", "Challenge state", "Anomaly detection models"],
    topThreats: ["T-A01 Credential Stuffing (primary defence line)", "Bot bypass / adversarial challenge evasion", "Model poisoning"],
  },
  authPolicyService: {
    title: "Parental Consent / Policy Service (Internal)",
    meta: "Age and consent policy decisions (COPPA/GDPR-K)",
    responsibilities: [
      "Applies COPPA/GDPR-K age restriction rules based on DOB from User Profile Service",
      "Enforces parental consent requirements for minor accounts",
      "Returns policy decision to Auth Service for feature gating",
    ],
    flows: [
      "Auth Service > Policy Service: age/consent policy decision request",
      "Policy Service > Auth Service: policy decision result",
      "Policy Service > Secrets Vault: read policy keys (if applicable)",
    ],
    assets: ["Age flags", "Parental consent records", "Policy configuration"],
    topThreats: ["T-A07 Minor Data Exposure / Age Flag Bypass", "Consent record tampering", "DOB manipulation at registration"],
  },
  authDatastores: {
    title: "Persistence & Logging Zone (Auth Data Stores)",
    meta: "Auth DB, User DB, Session/Token Store, Audit Log",
    responsibilities: [
      "Auth DB stores hashed passwords, MFA seeds, and account state",
      "User DB holds profile data, age flags, and parental consent records",
      "Session/Token Store manages JWT jti, refresh token families, and revocation state",
      "Audit Log preserves all auth events in append-only format for forensics",
    ],
    flows: [
      "Auth Service > Auth DB: credential verify (hashed passwords, MFA seeds)",
      "Auth Service > Session/Token Store: token family create/rotate/revoke",
      "User Profile Service > User DB: profile/privacy persistence",
      "Auth Service > Audit Log: immutable auth event writes",
    ],
    assets: ["Hashed credentials", "MFA seeds", "PII (User DB)", "Session/token state (jti, refresh family)", "Non-repudiation evidence (Audit Log)"],
    topThreats: ["T-A08 Auth DB Compromise", "Session store tampering / refresh replay", "Audit log deletion", "Broken authZ to data stores"],
  },
  authExtEmail: {
    title: "External Email Provider (Out of Control)",
    meta: "Third-party email delivery (SendGrid/SES style)",
    responsibilities: [
      "Delivers password reset and verification emails to players",
      "Not trusted by default — email content integrity depends on server-side token validation",
    ],
    flows: [
      "Email Worker > External Email Provider: SMTP/API request",
      "External Email Provider > Player: delivered email",
    ],
    assets: ["Email delivery metadata", "Reset link contents"],
    topThreats: ["T-A03 Email interception / phishing", "Spoofed sender / provider compromise", "Delivery failure blocking resets"],
  },
  authExtMfa: {
    title: "External MFA / SMS Provider (Out of Control)",
    meta: "Third-party TOTP/SMS OTP provider (Twilio/Authy style)",
    responsibilities: [
      "Processes SMS OTP delivery or TOTP verification requests from MFA Service",
      "Availability directly impacts MFA flow — outages can block user login",
    ],
    flows: [
      "MFA Service > External MFA/SMS Provider: OTP/TOTP external dependency",
    ],
    assets: ["SMS delivery state", "OTP codes in transit"],
    topThreats: ["T-A04 MFA Bypass (SMS interception / SIM swap)", "Provider downtime blocking login", "OTP replay"],
  },
  authSecretsVault: {
    title: "Secrets Vault (Auth Keys — Out of Control)",
    meta: "JWT signing keys, SMTP credentials, MFA API keys",
    responsibilities: [
      "Stores JWT signing keys used by Auth Service",
      "Stores SMTP credentials used by Email Worker",
      "Stores MFA provider API keys used by MFA Service",
      "Enforces strict RBAC and audit on all secret access",
    ],
    flows: [
      "Auth Service > Secrets Vault: read JWT signing keys",
      "Email Worker > Secrets Vault: read SMTP credentials",
      "MFA Service > Secrets Vault: read MFA API keys",
      "Policy Service > Secrets Vault: read policy keys",
    ],
    assets: ["JWT signing keys", "SMTP credentials", "MFA API keys", "Encryption keys"],
    topThreats: ["T-A02 Key compromise → mass token forgery", "Over-permissive vault access", "No key rotation policy"],
  },
};

// ─── Render component detail panel with pagination ───────────────────────────
const compTitle = document.getElementById("compTitle");
const compMeta  = document.getElementById("compMeta");
const compBody  = document.getElementById("compBody");
const dfdPanelNav = document.getElementById("dfdPanelNav");
const dfdPanelAction = document.getElementById("dfdPanelAction");
const compPrevBtn = document.getElementById("compPrevBtn");
const compNextBtn = document.getElementById("compNextBtn");
const pageNumber = document.getElementById("pageNumber");
const pageTotal = document.getElementById("pageTotal");
const openThreatsBtn = document.getElementById("openThreatsFromComp");

// Track component pagination state
let currentComponent = null;
let currentPageIndex = 0;

// Define the pages for each component
const getComponentPages = (compKey) => {
  const c = componentInfo[compKey];
  if (!c) return [];

  const list = arr => `<ul class="clean">${arr.map(x => `<li>${x}</li>`).join("")}</ul>`;

  return [
    {
      title: "Responsibilities",
      content: `<div class="kv"><b>Responsibilities</b>${list(c.responsibilities)}</div>`
    },
    {
      title: "Key Flows",
      content: `<div class="kv"><b>Key Flows</b>${list(c.flows)}</div>`
    },
    {
      title: "Data &amp; Assets",
      content: `<div class="kv"><b>Data / Assets</b>${list(c.assets)}</div>`
    },
    {
      title: "Top Threats",
      content: `<div class="kv"><b>Top Threats</b>${list(c.topThreats)}</div>`
    }
  ];
};

function renderCompPage() {
  if (!currentComponent) return;
  const pages = getComponentPages(currentComponent);
  if (pages.length === 0 || currentPageIndex >= pages.length) return;

  const page = pages[currentPageIndex];
  compBody.innerHTML = page.content;

  // Update page counter
  pageNumber.textContent = currentPageIndex + 1;
  pageTotal.textContent = pages.length;

  // Show/hide nav buttons
  compPrevBtn.disabled = currentPageIndex === 0;
  compNextBtn.disabled = currentPageIndex === pages.length - 1;
}

function renderComp(compKey) {
  const c = componentInfo[compKey];
  if (!c) return;
  
  currentComponent = compKey;
  currentPageIndex = 0;
  
  compTitle.textContent = c.title;
  compMeta.textContent = c.meta;
  
  dfdPanelNav.style.display = "block";
  dfdPanelAction.style.display = "block";
  
  // Update threats button with current component
  openThreatsBtn.onclick = () => {
    document.querySelector("#threats")?.scrollIntoView({ behavior: "smooth" });
    document.getElementById("searchThreats").value = c.topThreats[0]?.split(" ")[0] || "";
    refreshThreatTable();
  };
  
  renderCompPage();
}

// Pagination event listeners
compPrevBtn?.addEventListener("click", () => {
  if (currentPageIndex > 0) {
    currentPageIndex--;
    renderCompPage();
  }
});

compNextBtn?.addEventListener("click", () => {
  const pages = getComponentPages(currentComponent);
  if (currentPageIndex < pages.length - 1) {
    currentPageIndex++;
    renderCompPage();
  }
});

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

// Generic zoom handler for multiple DFDs
function setupDfdZoom(wrapId, imgId, resetBtnId) {
  const dfdWrap  = document.getElementById(wrapId);
  const dfdImg   = document.getElementById(imgId);
  const zoomReset = document.getElementById(resetBtnId);

  if (!dfdWrap || !dfdImg) return; // DFD not present

  let activeHotspot = null;

  // Find hotspots within this specific wrap
  const hotspots = dfdWrap.querySelectorAll(".hotspot");
  
  hotspots.forEach(btn => {
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

      // 5a. Hide ALL hotspots in this DFD when zoomed to prevent view obstruction
      hotspots.forEach(hs => {
        hs.classList.add("hidden");
      });

      // 5c. Show reset button
      if (zoomReset) zoomReset.style.display = "inline-block";
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
    hotspots.forEach(hs => {
      hs.classList.remove("hidden");
    });
    if (zoomReset) zoomReset.style.display = "none";
  }

  zoomReset?.addEventListener("click", resetZoom);

  // Double-click wrap background to reset
  dfdWrap?.addEventListener("dblclick", e => {
    if (!e.target.classList.contains("hotspot")) resetZoom();
  });
}

// Initialize all DFDs
setupDfdZoom("paymentDfdWrap", "paymentDfdImg", "zoomReset");
setupDfdZoom("mediaDfdWrap", "mediaDfdImg", "mediaZoomReset");
setupDfdZoom("authDfdWrap", "authDfdImg", "authZoomReset");

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
    mitigations: [
      {
        title: "HMAC Signature Verification",
        description: "Every webhook must include an HMAC-SHA256 signature computed with a shared secret. Verify signature matches before processing.",
        priority: "CRITICAL",
      },
      {
        title: "Timestamp Validation",
        description: "Reject webhooks older than 5 minutes to prevent replay of old events.",
        priority: "HIGH",
      },
      {
        title: "Webhook Secret Rotation",
        description: "Rotate webhook secrets regularly and store in Secrets Vault with restricted access.",
        priority: "HIGH",
      },
      {
        title: "Event Source Verification",
        description: "Confirm webhook origin via TLS certificate pinning or IP allowlist if provider allows.",
        priority: "MEDIUM",
      },
    ],
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
    mitigations: [
      {
        title: "Idempotency Key Storage",
        description: "Store processed event IDs in a cache/database with TTL. Reject duplicate event IDs immediately.",
        priority: "CRITICAL",
      },
      {
        title: "Idempotent State Machine",
        description: "Design order state transitions to be idempotent—re-applying same event yields same result.",
        priority: "CRITICAL",
      },
      {
        title: "Provider Event Deduplication",
        description: "Use provider's event ID as primary key rather than timestamp to prevent accidental duplicates.",
        priority: "HIGH",
      },
      {
        title: "Delivery Guarantees",
        description: "Implement at-least-once delivery semantics with retry-after backoff on the client side.",
        priority: "MEDIUM",
      },
    ],
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
    mitigations: [
      {
        title: "Server-side Pricing Authority",
        description: "Never trust client-provided prices. Always fetch current price from Catalog DB server-side on checkout.",
        priority: "CRITICAL",
      },
      {
        title: "Price Validation Before Checkout",
        description: "Validate SKU and price match before creating order. Reject if mismatch detected.",
        priority: "CRITICAL",
      },
      {
        title: "SKU Allowlist Enforcement",
        description: "Maintain a validated list of purchasable SKUs. Reject any request for unknown/disabled SKUs.",
        priority: "HIGH",
      },
      {
        title: "Audit Logging",
        description: "Log all price mismatches and attempted exploits to detect patterns and fraud rings.",
        priority: "HIGH",
      },
    ],
  },
  // ─── Authentication & Identity Threats ──────────────────────────────────
  {
    id: "T-A01",
    subsystem: "Authentication & Identity",
    componentsAffected: "API Gateway, Auth Service, Auth DB, Bot/Risk Engine",
    dataAsset: "User credentials (email + password)",
    dataFlow: "Player → API Gateway → Auth Service → Auth DB",
    stride: { S:true, T:false, R:false, I:false, D:false, E:false },
    threatName: "Credential Stuffing / Brute Force",
    threatDescription: "Attacker uses automated tools with leaked credential lists to attempt mass login (A1 — login ingress). Without adequate rate limiting, account lockout, and Bot/Risk Engine challenge escalation, valid accounts can be compromised at scale.",
    possibleImpact: "Mass account takeover, financial loss via in-game marketplace purchases, reputation damage, potential harm to minor accounts whose credentials are reused.",
    likelihoodScore: 5,
    impactScore: 4,
    mitigations: [
      {
        title: "Rate Limiting & Account Lockout",
        description: "Enforce max 5 failed login attempts per minute per account. Lock for 15 min after threshold. Apply per-IP and per-account limits.",
        priority: "CRITICAL",
      },
      {
        title: "Bot/Risk Engine CAPTCHA Escalation",
        description: "Trigger CAPTCHA or step-up challenge via Bot/Risk Engine upon suspicious login patterns or velocity anomalies.",
        priority: "CRITICAL",
      },
      {
        title: "Credential Stuffing Detection",
        description: "Monitor for logins using known-compromised credentials. Integrate threat intel feeds and check against breach databases.",
        priority: "HIGH",
      },
      {
        title: "Adaptive Throttling",
        description: "Increase delay between attempts exponentially after each failure to slow down automated attacks.",
        priority: "HIGH",
      },
      {
        title: "MFA Enforcement",
        description: "Require MFA for all accounts, particularly those with marketplace purchase history or admin roles.",
        priority: "HIGH",
      },
    ],
  },
  {
    id: "T-A02",
    subsystem: "Authentication & Identity",
    componentsAffected: "Auth Service, Secrets Vault, Session/Token Store",
    dataAsset: "JWT signing key / JWT tokens",
    dataFlow: "Auth Service → Secrets Vault (read key) → API Gateway → Player (JWT)",
    stride: { S:true, T:true, R:false, I:false, D:false, E:true },
    threatName: "JWT Token Forgery / Key Compromise",
    threatDescription: "If the JWT signing key is leaked from the Secrets Vault (A4 — vault read edge) or a weak algorithm (e.g. HS256 with guessable secret) is used, an attacker can forge valid JWT tokens with arbitrary role claims, including admin/moderator privileges.",
    possibleImpact: "Complete identity spoofing, privilege escalation to admin/moderator roles, unauthorized access to all game services that trust the JWT.",
    likelihoodScore: 2,
    impactScore: 5,
    mitigations: [
      {
        title: "RS256/ES256 Algorithm Enforcement",
        description: "Use asymmetric signing (RS256 or ES256). Reject tokens signed with HS256 or 'none'. Validate algorithm header explicitly.",
        priority: "CRITICAL",
      },
      {
        title: "Secrets Vault Access Control",
        description: "Restrict JWT signing key access in Secrets Vault to Auth Service only. Enforce RBAC and audit all key reads.",
        priority: "CRITICAL",
      },
      {
        title: "Key Rotation Policy",
        description: "Rotate JWT signing keys on a regular schedule (e.g. every 90 days). Invalidate tokens on key rotation.",
        priority: "HIGH",
      },
      {
        title: "Short Token TTL",
        description: "Use sub-hourly expiry for access tokens. Require refresh token for renewal with anti-replay checks (jti tracking).",
        priority: "HIGH",
      },
      {
        title: "Token Revocation",
        description: "Maintain a Session/Token Store with jti tracking to revoke tokens on logout, compromise, or key rotation.",
        priority: "HIGH",
      },
    ],
  },
  {
    id: "T-A03",
    subsystem: "Authentication & Identity",
    componentsAffected: "Auth Service, Email Worker, External Email Provider",
    dataAsset: "Password reset token",
    dataFlow: "Player → API Gateway → Auth Service → Email Worker → External Email Provider → Player",
    stride: { S:true, T:false, R:false, I:true, D:false, E:false },
    threatName: "Password Reset Token Abuse",
    threatDescription: "Attacker exploits the password reset flow (A3 — email external edge) by intercepting reset emails, exploiting predictable/reusable reset tokens, or using email enumeration via differing server responses to identify registered accounts.",
    possibleImpact: "Account takeover, PII exposure, potential targeting of minor accounts, chain to financial abuse via marketplace.",
    likelihoodScore: 3,
    impactScore: 4,
    mitigations: [
      {
        title: "Single-use Reset Tokens",
        description: "Invalidate reset token immediately upon first use. Never allow a token to be reused.",
        priority: "CRITICAL",
      },
      {
        title: "Short Token TTL (≤30 min)",
        description: "Expire reset tokens after 30 minutes. Invalidate old tokens when a new reset is requested.",
        priority: "CRITICAL",
      },
      {
        title: "Constant-time Responses (No Enumeration)",
        description: "Return identical response regardless of whether email is registered. Use background email dispatch to prevent timing-based enumeration.",
        priority: "HIGH",
      },
      {
        title: "Secure Token Generation",
        description: "Use cryptographically secure random tokens (≥128 bits). Never use predictable sequences or UUIDs.",
        priority: "HIGH",
      },
      {
        title: "Rate Limit Password Reset",
        description: "Limit reset requests per email/IP to prevent mass enumeration and email flooding.",
        priority: "MEDIUM",
      },
    ],
  },
  {
    id: "T-A04",
    subsystem: "Authentication & Identity",
    componentsAffected: "Auth Service, MFA Verification Service, External MFA/SMS Provider",
    dataAsset: "MFA codes / TOTP secrets",
    dataFlow: "Player → API Gateway → Auth Service → MFA Verification → External MFA/SMS Provider",
    stride: { S:true, T:false, R:false, I:false, D:false, E:true },
    threatName: "MFA Bypass / Downgrade",
    threatDescription: "Attacker bypasses MFA (A2 — MFA external edge) by exploiting implementation flaws: skipping the MFA step by directly calling post-auth endpoints, downgrading to a weaker factor, or intercepting SMS OTP via SIM swapping.",
    possibleImpact: "Account takeover despite MFA being enabled, undermines the strongest layer of account protection, high-value accounts (with marketplace purchases) are prime targets.",
    likelihoodScore: 3,
    impactScore: 5,
    mitigations: [
      {
        title: "Server-side MFA State Enforcement",
        description: "Track MFA completion server-side. Ensure no endpoint grants full session without confirmed MFA pass.",
        priority: "CRITICAL",
      },
      {
        title: "No Step-Skip Endpoints",
        description: "Audit all post-auth endpoints to require MFA-verified session tokens. No bypass via direct API calls.",
        priority: "CRITICAL",
      },
      {
        title: "TOTP with Hardware Key Option",
        description: "Prefer app-based TOTP over SMS OTP. Offer FIDO2/WebAuthn as a phishing-resistant option for high-risk accounts.",
        priority: "HIGH",
      },
      {
        title: "SIM Swap Detection",
        description: "Monitor for SIM swap signals from carrier APIs. Flag accounts for re-verification after SIM change.",
        priority: "HIGH",
      },
      {
        title: "MFA Required for Sensitive Actions",
        description: "Require MFA re-verification for marketplace purchases, profile changes, and password updates regardless of session age.",
        priority: "HIGH",
      },
    ],
  },
  {
    id: "T-A05",
    subsystem: "Authentication & Identity",
    componentsAffected: "API Gateway, Session/Token Store",
    dataAsset: "Session tokens / JWT tokens",
    dataFlow: "API Gateway → Player (JWT/cookie) // Player → API Gateway (subsequent requests)",
    stride: { S:true, T:false, R:false, I:true, D:false, E:false },
    threatName: "Session Hijacking / Token Theft",
    threatDescription: "Attacker steals a valid session token or JWT (A5 — refresh replay surface) via XSS, network sniffing (if TLS misconfigured), or malicious browser extension. The stolen token grants full access to the victim's account for the token lifetime.",
    possibleImpact: "Impersonation of the victim, access to PII and game state, ability to make marketplace purchases, chat as the victim, or upload content under their identity.",
    likelihoodScore: 3,
    impactScore: 4,
    mitigations: [
      {
        title: "HTTPS / TLS Everywhere",
        description: "Enforce HTTPS for all traffic. Use HSTS headers to prevent downgrade attacks.",
        priority: "CRITICAL",
      },
      {
        title: "Secure Cookie Flags",
        description: "Set HttpOnly, Secure, SameSite=Strict on all session cookies to prevent JS access and CSRF.",
        priority: "CRITICAL",
      },
      {
        title: "Token Rotation on Login",
        description: "Issue new tokens on each login/auth event. Invalidate old tokens to limit window of reuse.",
        priority: "HIGH",
      },
      {
        title: "Short Token Expiry",
        description: "Use sub-hourly expiry for access tokens, require refresh token for renewal with anti-replay checks.",
        priority: "HIGH",
      },
      {
        title: "XSS & CSRF Protections",
        description: "Implement CSP, output encoding, and CSRF tokens to prevent XSS-based token theft.",
        priority: "HIGH",
      },
    ],
  },
  {
    id: "T-A06",
    subsystem: "Authentication & Identity",
    componentsAffected: "API Gateway, Auth Service",
    dataAsset: "Auth service availability",
    dataFlow: "Player → API Gateway → Auth Service",
    stride: { S:false, T:false, R:false, I:false, D:true, E:false },
    threatName: "Auth Endpoint DoS / Resource Exhaustion",
    threatDescription: "Attacker floods auth endpoints (login, register, password reset) or admin revocation (A6 — revocation endpoint) with high-volume requests. Password hashing (bcrypt/argon2) is intentionally CPU-expensive, making auth services especially vulnerable to resource exhaustion.",
    possibleImpact: "All players unable to log in or register, complete game service outage for new and returning users, reputational damage.",
    likelihoodScore: 4,
    impactScore: 4,
    mitigations: [
      {
        title: "Rate Limiting on Auth Endpoints",
        description: "Apply strict per-IP and per-account rate limits on login, register, and reset endpoints.",
        priority: "CRITICAL",
      },
      {
        title: "Async Hashing Queue",
        description: "Offload bcrypt/argon2 hashing to a worker queue to prevent direct CPU exhaustion of the Auth Service.",
        priority: "HIGH",
      },
      {
        title: "CDN / WAF Protection",
        description: "Place a WAF in front of auth endpoints to absorb volumetric attacks before they reach the service.",
        priority: "HIGH",
      },
      {
        title: "CAPTCHA on Repeated Failures",
        description: "Escalate to CAPTCHA challenge via Bot/Risk Engine after repeated failures from the same IP.",
        priority: "HIGH",
      },
      {
        title: "Separate Admin Auth Rate Limits",
        description: "Apply stricter rate limits on admin/revocation endpoints (A6) than regular player auth flows.",
        priority: "MEDIUM",
      },
    ],
  },
  {
    id: "T-A07",
    subsystem: "Authentication & Identity",
    componentsAffected: "User Profile Service, Parental Consent/Policy Service, User DB, Auth Service",
    dataAsset: "Minor PII (DOB, name, email) and age flags",
    dataFlow: "Auth Service → Policy Service → User Profile Service → User DB",
    stride: { S:false, T:true, R:false, I:true, D:false, E:false },
    threatName: "Minor Data Exposure / Age Flag Bypass",
    threatDescription: "Attacker tampers with DOB during registration to bypass age restrictions (A7 — minor policy bypass), or exploits broken access controls to access profiles of minor users. If age flags are stored client-side or in JWT claims without Policy Service re-validation, a minor could self-remove restrictions.",
    possibleImpact: "Minors exposed to unmoderated chat, marketplace, and adult content. Regulatory violations (COPPA/GDPR-K) leading to significant fines and legal action.",
    likelihoodScore: 3,
    impactScore: 5,
    mitigations: [
      {
        title: "Server-side Age Flag Storage Only",
        description: "Never store age flags in JWTs or client-accessible storage. Always re-validate from Policy Service/User DB server-side.",
        priority: "CRITICAL",
      },
      {
        title: "DOB Validation at Registration",
        description: "Validate DOB server-side. Consider requiring parental email consent for under-13 registrations.",
        priority: "CRITICAL",
      },
      {
        title: "Policy Service Enforcement",
        description: "All feature access checks must query Policy Service at request time, not rely on cached JWT claims.",
        priority: "HIGH",
      },
      {
        title: "COPPA/GDPR-K Consent Workflow",
        description: "Implement parental consent workflow for minor account creation. Log consent records in User DB.",
        priority: "HIGH",
      },
      {
        title: "Access Control to Minor Profiles",
        description: "Enforce strict authZ so minor profiles are not accessible to other users, including moderators without need.",
        priority: "HIGH",
      },
    ],
  },
  {
    id: "T-A08",
    subsystem: "Authentication & Identity",
    componentsAffected: "Auth DB, Session/Token Store, Audit Log",
    dataAsset: "Hashed passwords, MFA seeds, session state",
    dataFlow: "Auth Service → Auth DB (internal)",
    stride: { S:false, T:true, R:false, I:true, D:false, E:true },
    threatName: "Auth Database Compromise",
    threatDescription: "Attacker gains unauthorized access to the Auth DB through SQL injection, misconfigured access controls, or lateral movement (A8 — audit integrity surface). Even with hashed passwords, MFA seeds and session metadata are immediately usable for account takeover.",
    possibleImpact: "Mass credential exposure (offline cracking of hashes), MFA bypass using stolen TOTP seeds, session hijacking via stolen refresh tokens, complete platform compromise.",
    likelihoodScore: 2,
    impactScore: 5,
    mitigations: [
      {
        title: "Parameterized Queries Only",
        description: "Use ORM or parameterized queries for all Auth DB access. Never concatenate user input into SQL.",
        priority: "CRITICAL",
      },
      {
        title: "Least Privilege DB Accounts",
        description: "Auth Service DB account should only have SELECT/INSERT/UPDATE on required tables. No DROP or DDL permissions.",
        priority: "CRITICAL",
      },
      {
        title: "Network Segmentation",
        description: "Auth DB must not be accessible from public internet. Restrict to Auth Service internal network only.",
        priority: "HIGH",
      },
      {
        title: "MFA Seeds Encrypted at Rest",
        description: "Encrypt TOTP seeds in Auth DB using keys from Secrets Vault. Hashed passwords alone are insufficient.",
        priority: "HIGH",
      },
      {
        title: "Immutable Audit Log Monitoring",
        description: "Monitor Audit Log (A8) for anomalous DB access patterns. Alert on bulk reads or schema changes.",
        priority: "HIGH",
      },
    ],
  },
  // ─── Media Upload Threats ─────────────────────────────────────────────────
  {
    id: "T-M01",
    subsystem: "Upload Path",
    componentsAffected: "Player, API Gateway, Media Upload Service",
    dataAsset: "Upload Request",
    dataFlow: "Player → API Gateway (Upload Request)",
    stride: { S:true, T:false, R:false, I:false, D:false, E:false },
    threatName: "Account Upload Impersonation",
    threatDescription: "Attacker uses stolen or forged JWT authentication token to upload media under another user's identity.",
    possibleImpact: "Reputation damage to the impersonated user, may be chained with repudiation attacks to cause further disruption and damage. May result in false moderation actions against the impersonated user.",
    likelihoodScore: 3,
    impactScore: 3,
    mitigations: [
      {
        title: "JWT Validation",
        description: "Validate JWT signature and expiry on every upload request. Use short-lived tokens.",
        priority: "CRITICAL",
      },
      {
        title: "Rate Limiting per User",
        description: "Implement per-user upload rate limits to prevent abuse.",
        priority: "HIGH",
      },
    ],
  },
  {
    id: "T-M02",
    subsystem: "Upload Path",
    componentsAffected: "Player, API Gateway, Media Upload Service, Workers",
    dataAsset: "Raw media file",
    dataFlow: "Player → API Gateway (File Upload)",
    stride: { S:false, T:false, R:false, I:false, D:true, E:false },
    threatName: "File Upload Flooding",
    threatDescription: "Attacker or attackers upload a large quantity of data to the site to overwhelm a component of the upload service, such as by exhausting worker capacity or API gateway bandwidth.",
    possibleImpact: "Upload service stops working, which causes disruptions to profile updates, mod development, other aspects requiring media upload.",
    likelihoodScore: 5,
    impactScore: 4,
    mitigations: [
      {
        title: "Rate Limiting",
        description: "Implement aggressive rate limiting on upload endpoints (per IP and per user).",
        priority: "CRITICAL",
      },
      {
        title: "File Size Caps",
        description: "Enforce strict file size limits per upload and per user quota.",
        priority: "CRITICAL",
      },
      {
        title: "CDN/WAF Protection",
        description: "Use CDN with DDoS protection to absorb traffic spikes.",
        priority: "HIGH",
      },
    ],
  },
  {
    id: "T-M03",
    subsystem: "Upload Path",
    componentsAffected: "Player, Workers, CDN, Media Upload Service",
    dataAsset: "Raw media file",
    dataFlow: "Player → API Gateway (File Upload) // Player → CDN (Read)",
    stride: { S:false, T:true, R:false, I:false, D:false, E:true },
    threatName: "Polyglot File Upload",
    threatDescription: "Attacker uploads a polyglot image/javascript file that executes a malicious payload upon viewing. This bypasses validation measures and is interpreted by browsers as executable code leading to XSS.",
    possibleImpact: "Users reading the malicious media (such as by viewing a profile picture) may be executing attacker-controlled code, which leads to client-side ramifications such as token or session theft as well as malicious content display. If triggered in workers, also leads to RCE in the infrastructure itself with potential lateral movement or data exfiltration.",
    likelihoodScore: 3,
    impactScore: 5,
    mitigations: [
      {
        title: "Content Type Validation",
        description: "Validate file magic bytes, not just extensions. Re-encode images server-side to strip metadata.",
        priority: "CRITICAL",
      },
      {
        title: "Content Security Policy",
        description: "Serve user content from separate domain with strict CSP headers preventing script execution.",
        priority: "CRITICAL",
      },
      {
        title: "Sandboxed Scanning",
        description: "Process uploads in isolated workers/containers with no network access.",
        priority: "HIGH",
      },
    ],
  },
  {
    id: "T-M04",
    subsystem: "Quarantine and Processing",
    componentsAffected: "Moderator, Player, Approved Bucket",
    dataAsset: "Moderation Commands",
    dataFlow: "Moderator → Moderation tools → Moderation Queue",
    stride: { S:true, T:false, R:false, I:false, D:false, E:true },
    threatName: "Moderator impersonation",
    threatDescription: "Attacker steals a moderator's session, granting them moderator privileges over content uploaded to the site.",
    possibleImpact: "Attacker may selectively allow certain users' uploads to go through while blocking others, damaging integrity. They may also upload further malicious files by abusing their moderator privileges to allow malicious-flagged files through.",
    likelihoodScore: 2,
    impactScore: 4,
    mitigations: [
      {
        title: "MFA for Moderators",
        description: "Require multi-factor authentication for all moderator accounts.",
        priority: "CRITICAL",
      },
      {
        title: "Session Monitoring",
        description: "Monitor moderator sessions for anomalous behavior (IP changes, unusual activity patterns).",
        priority: "HIGH",
      },
    ],
  },
  {
    id: "T-M05",
    subsystem: "Quarantine and Processing",
    componentsAffected: "Moderation Queue, Approved Bucket, CDN",
    dataAsset: "Approved media file",
    dataFlow: "Moderator → Moderation tools → Moderation Queue",
    stride: { S:false, T:false, R:true, I:false, D:false, E:false },
    threatName: "Moderator repudiation",
    threatDescription: "A malicious or hijacked moderator denies that they approved a malicious media file to be stored in the approved file bucket and there is no way for the system to prove otherwise.",
    possibleImpact: "If unsafe content is released onto the site, there is the obvious risk of harm to users on the site through display of inappropriate or inflammatory content. If moderators cannot ascertain who approved said content, there is no accountability and repeated offenses may occur.",
    likelihoodScore: 2,
    impactScore: 4,
    mitigations: [
      {
        title: "Audit Logging",
        description: "Log all moderator actions (approvals, rejections) with timestamps and moderator ID in immutable audit log.",
        priority: "CRITICAL",
      },
      {
        title: "Digital Signatures",
        description: "Sign moderation decisions cryptographically to ensure non-repudiation.",
        priority: "HIGH",
      },
    ],
  },
  {
    id: "T-M06",
    subsystem: "Quarantine and Processing",
    componentsAffected: "Approved Bucket, Quarantine Bucket",
    dataAsset: "Approved media file",
    dataFlow: "Approved Bucket → CDN → User",
    stride: { S:false, T:false, R:false, I:true, D:false, E:false },
    threatName: "Bucket Exposure",
    threatDescription: "Misconfiguration in approval or storage bucket leads to public read access. Users can access media files in processing without authorisation.",
    possibleImpact: "Approved bucket leakage may lead to financial loss to the company through scraping of assets locked behind paywalls or IP theft. Quarantine bucket leakage may cause users to inadvertently download harmful/malicious files still on the site. Potential harm to minors who may be tricked into downloading inappropriate content.",
    likelihoodScore: 4,
    impactScore: 4,
    mitigations: [
      {
        title: "Bucket Permissions",
        description: "Ensure storage buckets are private by default. Use IAM policies with least privilege access.",
        priority: "CRITICAL",
      },
      {
        title: "Pre-signed URLs",
        description: "Serve content through time-limited pre-signed URLs instead of direct bucket access.",
        priority: "CRITICAL",
      },
      {
        title: "Regular Security Audits",
        description: "Automated scanning for bucket misconfigurations and public access.",
        priority: "HIGH",
      },
    ],
  },
];


// ─── Threat table ─────────────────────────────────────────────────────────────
const strideFilter     = document.getElementById("strideFilter");
const riskFilter       = document.getElementById("riskFilter");
const searchThreats    = document.getElementById("searchThreats");
const threatTableBody  = document.querySelector("#threatTable tbody");
const threatDetail     = document.getElementById("threatDetail");

// Pagination / sorting elements
const threatSort       = document.getElementById('threatSort');
const threatPrevBtn    = document.getElementById('threatPrevBtn');
const threatNextBtn    = document.getElementById('threatNextBtn');
const threatPageNum    = document.getElementById('threatPageNum');
const threatPageTotal  = document.getElementById('threatPageTotal');

let currentThreatPage = 1;
const THREATS_PAGE_SIZE = 8;

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

  // Reset to first page when filters/search change
  // (caller typically takes care of this, but safe-guard here)
  if (!currentThreatPage) currentThreatPage = 1;

  const rows = threats.filter(t => {
    const okQ = !q || [
      t.id, t.subsystem, t.componentsAffected, t.dataAsset,
      t.dataFlow, t.threatName, t.threatDescription, t.possibleImpact,
    ].some(f => f.toLowerCase().includes(q));

    const okStride    = strideVal    === "ALL" || t.stride[strideVal];
    const okRisk      = riskLevelVal === "ALL" || getRiskLevel(t.likelihoodScore * t.impactScore) === riskLevelVal;
    return okQ && okStride && okRisk;
  });

  // Sorting
  const sortVal = (threatSort && threatSort.value) || 'risk_desc';
  switch (sortVal) {
    case 'risk_desc': rows.sort((a,b) => (b.likelihoodScore*b.impactScore) - (a.likelihoodScore*a.impactScore)); break;
    case 'risk_asc': rows.sort((a,b) => (a.likelihoodScore*a.impactScore) - (b.likelihoodScore*b.impactScore)); break;
    case 'likelihood_desc': rows.sort((a,b) => b.likelihoodScore - a.likelihoodScore); break;
    case 'impact_desc': rows.sort((a,b) => b.impactScore - a.impactScore); break;
    case 'id_asc': rows.sort((a,b) => a.id.localeCompare(b.id)); break;
  }

  // Pagination
  const total = Math.max(1, Math.ceil(rows.length / THREATS_PAGE_SIZE));
  if (currentThreatPage > total) currentThreatPage = total;
  const start = (currentThreatPage - 1) * THREATS_PAGE_SIZE;
  const pageRows = rows.slice(start, start + THREATS_PAGE_SIZE);

  threatTableBody.innerHTML = pageRows.map(t => `
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
  // Update pagination UI
  if (threatPageNum) threatPageNum.textContent = currentThreatPage;
  if (threatPageTotal) threatPageTotal.textContent = total;

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

// Wiring: filters/search should reset to page 1
[strideFilter, riskFilter].forEach(el => el.addEventListener("change", () => { currentThreatPage = 1; refreshThreatTable(); }));
searchThreats.addEventListener("input", () => { currentThreatPage = 1; refreshThreatTable(); });

if (threatSort) threatSort.addEventListener('change', () => { currentThreatPage = 1; refreshThreatTable(); });
if (threatPrevBtn) threatPrevBtn.addEventListener('click', () => { if (currentThreatPage>1) { currentThreatPage--; refreshThreatTable(); } });
if (threatNextBtn) threatNextBtn.addEventListener('click', () => { currentThreatPage++; refreshThreatTable(); });

// Initialize
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
      // Count threats matching this impact × likelihood
      const matchingThreats = threats.filter(t => 
        t.impactScore === impact.score && t.likelihoodScore === likelihood.score
      );
      // Create pips display
      const pipsHtml = matchingThreats.length > 0 
        ? `<div class="pips">${'<span class="pip">×</span>'.repeat(matchingThreats.length)}</div>`
        : '';
      const cell  = el("div","mcell",`<div class="mcell-score">${score}</div>${pipsHtml}`);
      cell.dataset.score      = score;
      cell.dataset.riskLevel  = getRiskLevel(score);
      cell.dataset.threatCount = matchingThreats.length;
      
      cell.title = `Impact ${impact.score} × Likelihood ${likelihood.score} = ${score} (${getRiskLevel(score)}) | ${matchingThreats.length} threat(s)`;
      
      cell.addEventListener("click", (e) => {
        e.preventDefault();
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
        ${matches.map(t => `<li><a href="#" class="band-threat-link" data-threat-id="${t.id}"><b>${t.id}</b></a> — ${t.threatName} (L:${t.likelihoodScore} × I:${t.impactScore})</li>`).join("")
          || "<li class='muted'>No threats with this exact score.</li>"}
      </ul>
    </div>
  `;
  
  // Add click handlers for threat links in showBand
  document.querySelectorAll(".band-threat-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const threatId = link.dataset.threatId;
      const threatRow = document.querySelector(`#threatTable tbody tr[data-id="${threatId}"]`);
      if (threatRow) {
        document.querySelectorAll("#threatTable tbody tr").forEach(r => r.classList.remove("highlighted"));
        threatRow.classList.add("highlighted");
        threatRow.scrollIntoView({ behavior: "smooth", block: "center" });
        showThreat(threatId);
        setTimeout(() => {
          document.querySelector("#threats").scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    });
  });
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

// ─── Remediations Section ─────────────────────────────────────────────────────
const remedSubsystemTabs = document.querySelectorAll("#remediations .tab");
const remedThreatsList = document.getElementById("remedThreatsList");
const remedDetail = document.getElementById("remedDetail");
const remedThreatsTitle = document.getElementById("remedThreatsTitle");

let currentRemediationSubsystem = "Payment & Marketplace";
let currentRemediationThreat = null;

function getRiskClass(score) {
  if (score <= 4) return "low";
  if (score <= 9) return "med";
  return "high";
}

function populateRemediationThreats(subsystem) {
  // Handle Media Upload tab by showing both Upload Path and Quarantine threats
  let filtered;
  if (subsystem === "Media Upload") {
    filtered = threats.filter(t => t.subsystem === "Upload Path" || t.subsystem === "Quarantine and Processing");
  } else if (subsystem === "Auth") {
    filtered = threats.filter(t => t.subsystem === "Authentication & Identity");
  } else {
    filtered = threats.filter(t => t.subsystem === subsystem);
  }
  remedThreatsTitle.textContent = `Threats in ${subsystem.replace("Payment & Marketplace", "Payment & Services").replace("Auth", "Auth Services")}`;
  remedThreatsList.innerHTML = filtered.map(t => {
    const score = t.likelihoodScore * t.impactScore;
    const riskClass = getRiskClass(score);
    return `
      <li>
        <div class="threat-item" data-threat-id="${t.id}">
          <div class="threat-item-id">${t.id}</div>
          <div class="threat-item-name">${t.threatName}</div>
          <div class="threat-item-risk ${riskClass}">Risk ${score}</div>
        </div>
      </li>
    `;
  }).join("");
  
  // Attach click handlers
  remedThreatsList.querySelectorAll(".threat-item").forEach(el => {
    el.addEventListener("click", () => {
      const threatId = el.dataset.threatId;
      showRemediationDetail(threatId);
    });
  });
}

function showRemediationDetail(threatId) {
  const threat = threats.find(t => t.id === threatId);
  if (!threat || !threat.mitigations) return;

  currentRemediationThreat = threatId;

  remedThreatsList.querySelectorAll(".threat-item").forEach(el => {
    el.classList.remove("active");
  });
  const activeEl = document.querySelector(`[data-threat-id="${threatId}"]`);
  if (activeEl) activeEl.classList.add("active");

  const score = threat.likelihoodScore * threat.impactScore;
  const riskLevel = getRiskLevel(score);

  remedDetail.innerHTML = `
    <div class="mitigation-pack">
      <div class="mitigation-pack-header">
        <div>
          <div class="threat-id-badge">${threat.id}</div>
          <h4>${threat.threatName}</h4>
          <div class="muted tiny">Risk Score: ${score} (${riskLevel})</div>
        </div>
      </div>

      <div class="pack-controls">
        <button class="btn primary" id="simulateBtn">Simulate Attack</button>
        <button class="btn" id="resetSimBtn">Reset</button>
      </div>

      <div class="card-stage">
        <div class="simulator">
          <div class="attack-flow" id="attackFlow">
            <!-- attack steps inserted here -->
          </div>
          <div class="controls-panel" id="controlsPanel">
            <!-- controls inserted here -->
          </div>
        </div>
        <div class="sim-controls-note muted tiny">Tip: click <strong>Simulate Attack</strong> to animate attack flow then see controls activate.</div>
      </div>
    </div>
  `;

  // Build attack steps (simple inference from dataFlow + action)
  const attackFlowEl = document.getElementById('attackFlow');
  const controlsEl = document.getElementById('controlsPanel');

  function generateAttackSteps(thr) {
    const df = (thr.dataFlow || '').split('>').map(s => s.trim()).filter(Boolean);
    const steps = [];
    // attacker initial action
    if (/webhook|payment|order/i.test(thr.threatName) || /webhook/i.test(thr.dataAsset)) {
      steps.push({ title: 'Attacker crafts forged webhook', sub: 'Forged HTTP payload mimicking provider event' });
    } else {
      steps.push({ title: 'Attacker performs malicious action', sub: thr.threatDescription || '' });
    }
    // map the data flow components to steps
    df.forEach((comp, i) => {
      if (i === df.length - 1) {
        steps.push({ title: `${comp} processes event`, sub: comp });
        // For auth threats (T-A01 to T-A08), use possibleImpact as consequence step
        if (thr.id && /^T-A0[1-8]$/.test(thr.id)) {
          steps.push({ title: 'Attack Consequences & Impact', sub: thr.possibleImpact || 'Impact realized' });
        } else if (thr.id && /^T-M0[1-6]$/.test(thr.id)) {
          // For media upload threats (T-M01 to T-M06), use the impact section instead of generic text
          steps.push({ title: 'Attack Consequences & Impact', sub: thr.possibleImpact || 'Impact realized' });
        } else {
          steps.push({ title: 'Order marked as PAID / Action applied', sub: 'State transition and entitlement' });
        }
      } else {
        steps.push({ title: `${comp} receives event`, sub: comp });
      }
    });
    return steps;
  }

  const steps = generateAttackSteps(threat);
  attackFlowEl.innerHTML = steps.map((s, i) => `
    <div class="flow-step" data-step="${i}">
      <div class="step-bubble">${i+1}</div>
      <div class="step-content">
        <div class="step-title">${s.title}</div>
        <div class="step-sub">${s.sub || ''}</div>
      </div>
    </div>
  `).join('');

  // Build controls from mitigations
  controlsEl.innerHTML = threat.mitigations.map((m, i) => `
    <div class="control-item" data-index="${i}">
      <div>
        <div class="control-name">${m.title}</div>
        <div class="control-desc">${m.description}</div>
      </div>
      <div class="control-indicator">○</div>
    </div>
  `).join('');

  // mapping heuristics: which step indexes a control should block
  function mapControlToSteps(title) {
    const t = title.toLowerCase();
    if (t.includes('hmac') || t.includes('signature') || t.includes('verify')) return [0,1];
    if (t.includes('idempotent') || t.includes('idempotency') || t.includes('dedup')) return [steps.length-2, steps.length-1];
    if (t.includes('timestamp') || t.includes('replay') || t.includes('single-use') || t.includes('ttl')) return [0, steps.length-1];
    if (t.includes('server-side') || t.includes('authority') || t.includes('validate') || t.includes('enforce')) return [steps.length-2];
    if (t.includes('rate limit') || t.includes('lockout') || t.includes('throttl')) return [0, 1];
    if (t.includes('mfa') || t.includes('captcha') || t.includes('bot')) return [0, 1];
    return [steps.length-1];
  }

  const simulateBtn = document.getElementById('simulateBtn');
  const resetBtn = document.getElementById('resetSimBtn');
  let animating = false;

  function resetSimulation() {
    animating = false;
    document.querySelectorAll('#attackFlow .flow-step').forEach(s => { s.classList.remove('visible','blocked'); });
    document.querySelectorAll('#controlsPanel .control-item').forEach(c => { c.classList.remove('active'); c.querySelector('.control-indicator').textContent = '○'; });
    simulateBtn.disabled = false;
    simulateBtn.textContent = 'Simulate Attack';
  }

  resetBtn.addEventListener('click', resetSimulation);

  simulateBtn.addEventListener('click', () => {
    if (animating) return;
    animating = true;
    simulateBtn.disabled = true;
    simulateBtn.textContent = 'Running...';

    const flowSteps = Array.from(document.querySelectorAll('#attackFlow .flow-step'));
    const controlItems = Array.from(document.querySelectorAll('#controlsPanel .control-item'));

    // Reveal attack steps sequentially
    flowSteps.forEach((el, idx) => {
      setTimeout(() => el.classList.add('visible'), idx * 450);
    });

    // After attack steps, activate controls one-by-one
    const controlsStart = flowSteps.length * 450 + 400;
    controlItems.forEach((ctrl, i) => {
      setTimeout(() => {
        ctrl.classList.add('active');
        const ind = ctrl.querySelector('.control-indicator');
        ind.textContent = '✓';
        // block mapped steps
        const stepsToBlock = mapControlToSteps(ctrl.querySelector('.control-name').textContent);
        stepsToBlock.forEach(si => {
          const stepEl = document.querySelector(`#attackFlow .flow-step[data-step='${si}']`);
          if (stepEl) stepEl.classList.add('blocked');
        });
        // finalise button state when all controls done
        if (i === controlItems.length - 1) {
          simulateBtn.textContent = 'Completed';
        }
      }, controlsStart + i * 600);
    });
  });
}

// Initialize remediations
remedSubsystemTabs?.forEach(tab => {
  tab.addEventListener("click", () => {
    // Update active state
    document.querySelectorAll("#remediations .tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    
    const subsystem = tab.dataset.subsystem;
    currentRemediationSubsystem = subsystem;
    populateRemediationThreats(subsystem);
    remedDetail.innerHTML = `
      <div class="remediation-empty">
        <div style="font-size: 32px; margin-bottom: 10px;">:)</div>
        <p class="muted">Click a threat to view mitigations</p>
      </div>
    `;
  });
});

// Initialize with Payment & Marketplace
populateRemediationThreats("Payment & Marketplace");
