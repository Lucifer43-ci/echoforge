import express from "express";
import cors from "cors";
import crypto from "crypto";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(resolve(__dirname, "public")));

// ════════════════════════════════════════════
//  IN-MEMORY DATABASE (replace w/ real DB later)
// ════════════════════════════════════════════

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const hash = (d) => crypto.createHash("sha256").update(d).digest("hex").slice(0, 16);

const db = {
  agents: [],
  artifacts: [],
  payments: [],
  events: [],
  users: new Map(), // walletAddress → user profile
};

// ── Seed data ──
function seed() {
  const agents = [
    { name: "AlphaHunter", specialty: "defi_strategy", type: "forge" },
    { name: "GovOracle", specialty: "governance", type: "forge" },
    { name: "SignalBot", specialty: "market_signal", type: "forge" },
    { name: "RiskGuard", specialty: "risk_analysis", type: "forge" },
    { name: "YieldScout", specialty: "defi_strategy", type: "forge" },
  ];

  for (const a of agents) {
    const agent = {
      id: uid(), ...a,
      reputation: 50 + Math.floor(Math.random() * 45),
      owner: null,
      created_at: now(),
      artifacts_created: 0,
      total_earned: 0,
      status: "active",
      avatar: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${a.name}`,
    };
    db.agents.push(agent);
  }

  const categories = ["defi_strategy", "governance", "market_signal", "risk_analysis", "protocol_review"];
  const titles = [
    "Liquidswap APT/USDC Pool: Optimal Entry Strategy",
    "AIP-91: Shelby Storage Incentive Framework Analysis",
    "Whale Accumulation Pattern — APT 72h Forecast",
    "Cross-Protocol Arbitrage: Econia ↔ Liquidswap",
    "Thala Stability Pool Risk Assessment Q2 2026",
    "Aptos Validator Economics: Staking vs Restaking",
    "PancakeSwap Aptos: Yield Compression Signal",
    "Governance Quorum Risk Alert — AIP-95",
    "MEV Protection Strategies for Aptos DEX Traders",
    "Amnis Finance stAPT: De-peg Risk Model",
    "DeFi Correlation Matrix: Aptos Ecosystem",
    "Smart Money Flow: Top 50 Wallets Weekly Report",
  ];
  const descriptions = [
    "Deep analysis of pool dynamics, TVL trends, and optimal position sizing with risk-adjusted return projections.",
    "Comprehensive breakdown of governance proposal impacts on protocol economics and validator incentives.",
    "On-chain behavioral analysis detecting significant accumulation patterns across whale wallets.",
    "Real-time spread monitoring and execution strategy for cross-DEX arbitrage opportunities.",
    "Quantitative risk framework analyzing stability mechanisms under various stress scenarios.",
    "Comparative yield analysis between native staking and liquid restaking protocols.",
    "Technical signal analysis identifying yield compression trends and rotation opportunities.",
    "Alert system tracking governance participation rates and quorum achievement probability.",
    "Advanced MEV detection and protection framework for DEX order routing optimization.",
    "Statistical model predicting liquid staking token de-peg probability under market stress.",
    "Multi-factor correlation analysis across Aptos DeFi protocols for portfolio optimization.",
    "Weekly aggregated wallet analysis tracking institutional and smart money movements.",
  ];

  for (let i = 0; i < 12; i++) {
    const agent = db.agents[i % db.agents.length];
    const price = (0.001 + Math.random() * 0.05).toFixed(4);
    const artifact = {
      id: uid(),
      title: titles[i],
      description: descriptions[i],
      category: categories[i % categories.length],
      creator_agent_id: agent.id,
      creator_agent_name: agent.name,
      creator_avatar: agent.avatar,
      owner_wallet: null,
      price_shelby_usd: parseFloat(price),
      quality_score: 55 + Math.floor(Math.random() * 40),
      read_count: Math.floor(Math.random() * 150),
      fork_count: Math.floor(Math.random() * 8),
      total_earned: parseFloat((Math.random() * 0.5).toFixed(4)),
      royalty_split: { [agent.id]: 1.0 },
      tags: [categories[i % categories.length].replace(/_/g, " "), "aptos", ["shelby", "defi", "governance", "risk"][i % 4]],
      provenance_hash: hash(titles[i] + now()),
      shelby_blob_id: `blob_${hash(titles[i])}`,
      fork_depth: 0,
      parent_id: null,
      status: "active",
      created_at: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      licenses: Math.floor(Math.random() * 20),
    };
    db.artifacts.push(artifact);
    agent.artifacts_created++;
    agent.total_earned += artifact.total_earned;
  }

  // Add some forked artifacts
  for (let i = 0; i < 3; i++) {
    const parent = db.artifacts[i];
    const forker = db.agents[(i + 2) % db.agents.length];
    const forked = {
      id: uid(),
      title: `[Fork] ${parent.title} — Enhanced v2`,
      description: `Improved version with additional data points and updated analysis. Original by ${parent.creator_agent_name}.`,
      category: parent.category,
      creator_agent_id: forker.id,
      creator_agent_name: forker.name,
      creator_avatar: forker.avatar,
      owner_wallet: null,
      price_shelby_usd: parseFloat((parent.price_shelby_usd * 1.2).toFixed(4)),
      quality_score: Math.min(99, parent.quality_score + 5 + Math.floor(Math.random() * 10)),
      read_count: Math.floor(Math.random() * 40),
      fork_count: 0,
      total_earned: parseFloat((Math.random() * 0.1).toFixed(4)),
      royalty_split: { [forker.id]: 0.4, [parent.creator_agent_id]: 0.6 },
      tags: [...parent.tags, "fork"],
      provenance_hash: hash(parent.title + "fork" + now()),
      shelby_blob_id: `blob_${hash(parent.title + "fork")}`,
      fork_depth: 1,
      parent_id: parent.id,
      status: "active",
      created_at: now(),
      licenses: Math.floor(Math.random() * 5),
    };
    db.artifacts.push(forked);
    parent.fork_count++;
    forker.artifacts_created++;
  }

  // Seed events
  const eventTypes = ["artifact_created", "artifact_read", "artifact_forked", "royalty_paid", "agent_created", "quality_scored"];
  for (let i = 0; i < 30; i++) {
    db.events.push({
      id: uid(),
      type: eventTypes[i % eventTypes.length],
      agent_id: db.agents[i % db.agents.length].id,
      agent_name: db.agents[i % db.agents.length].name,
      artifact_id: db.artifacts[i % db.artifacts.length]?.id,
      artifact_title: db.artifacts[i % db.artifacts.length]?.title?.slice(0, 50),
      details: {},
      timestamp: new Date(Date.now() - Math.random() * 3 * 86400000).toISOString(),
    });
  }

  console.log(`  Seeded: ${db.agents.length} agents, ${db.artifacts.length} artifacts, ${db.events.length} events`);
}

seed();

// ════════════════════════════════════════════
//  API ROUTES
// ════════════════════════════════════════════

// Health
app.get("/api/health", (_, res) => res.json({ status: "ok", network: "shelby-testnet", mode: "testnet" }));

// Stats
app.get("/api/stats", (_, res) => {
  const arts = db.artifacts;
  res.json({
    total_agents: db.agents.length,
    total_artifacts: arts.length,
    total_reads: arts.reduce((s, a) => s + a.read_count, 0),
    total_royalties: parseFloat(arts.reduce((s, a) => s + a.total_earned, 0).toFixed(4)),
    total_forks: arts.filter(a => a.fork_depth > 0).length,
    total_licenses: arts.reduce((s, a) => s + a.licenses, 0),
    avg_quality: arts.length ? Math.round(arts.reduce((s, a) => s + a.quality_score, 0) / arts.length) : 0,
    total_events: db.events.length,
    connected_users: db.users.size,
  });
});

// Agents
app.get("/api/agents", (_, res) => res.json(db.agents.sort((a, b) => b.reputation - a.reputation)));
app.get("/api/agents/:id", (req, res) => {
  const a = db.agents.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: "Not found" });
  res.json({ ...a, artifacts: db.artifacts.filter(x => x.creator_agent_id === a.id) });
});

app.post("/api/agents", (req, res) => {
  const { name, specialty, wallet } = req.body;
  const agent = {
    id: uid(), name: name || "NewAgent", specialty: specialty || "defi_strategy", type: "forge",
    reputation: 50, owner: wallet || null, created_at: now(),
    artifacts_created: 0, total_earned: 0, status: "active",
    avatar: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${name || uid()}`,
  };
  db.agents.push(agent);
  db.events.push({ id: uid(), type: "agent_created", agent_id: agent.id, agent_name: agent.name, timestamp: now(), details: {} });
  res.json(agent);
});

// Artifacts (Marketplace)
app.get("/api/artifacts", (req, res) => {
  let result = [...db.artifacts];
  if (req.query.category && req.query.category !== "all") result = result.filter(a => a.category === req.query.category);
  if (req.query.search) {
    const q = req.query.search.toLowerCase();
    result = result.filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.tags.some(t => t.includes(q)));
  }
  const sort = req.query.sort || "newest";
  if (sort === "newest") result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  else if (sort === "quality") result.sort((a, b) => b.quality_score - a.quality_score);
  else if (sort === "popular") result.sort((a, b) => b.read_count - a.read_count);
  else if (sort === "price_low") result.sort((a, b) => a.price_shelby_usd - b.price_shelby_usd);
  else if (sort === "price_high") result.sort((a, b) => b.price_shelby_usd - a.price_shelby_usd);
  res.json(result);
});

app.get("/api/artifacts/:id", (req, res) => {
  const a = db.artifacts.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: "Not found" });
  const lineage = [];
  let curr = a;
  while (curr?.parent_id) {
    const parent = db.artifacts.find(x => x.id === curr.parent_id);
    if (parent) lineage.push(parent);
    curr = parent;
  }
  res.json({ ...a, lineage });
});

// Forge artifact
app.post("/api/artifacts/forge", (req, res) => {
  const { agent_id, title, description, category, price, tags, wallet } = req.body;
  const agent = db.agents.find(x => x.id === agent_id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  const artifact = {
    id: uid(), title: title || "New Knowledge Artifact",
    description: description || "AI-generated insight stored on Shelby Protocol.",
    category: category || agent.specialty,
    creator_agent_id: agent.id, creator_agent_name: agent.name, creator_avatar: agent.avatar,
    owner_wallet: wallet || null,
    price_shelby_usd: parseFloat(price) || 0.01,
    quality_score: 60 + Math.floor(Math.random() * 30),
    read_count: 0, fork_count: 0, total_earned: 0,
    royalty_split: { [agent.id]: 1.0 },
    tags: tags || [category || "defi"],
    provenance_hash: hash(title + now()),
    shelby_blob_id: `blob_${hash(title + now())}`,
    fork_depth: 0, parent_id: null, status: "active",
    created_at: now(), licenses: 0,
  };
  db.artifacts.push(artifact);
  agent.artifacts_created++;
  db.events.push({ id: uid(), type: "artifact_created", agent_id: agent.id, agent_name: agent.name, artifact_id: artifact.id, artifact_title: artifact.title.slice(0, 50), timestamp: now(), details: {} });
  res.json(artifact);
});

// Read (purchase) artifact
app.post("/api/artifacts/:id/read", (req, res) => {
  const art = db.artifacts.find(x => x.id === req.params.id);
  if (!art) return res.status(404).json({ error: "Not found" });
  const { wallet } = req.body;

  art.read_count++;
  art.total_earned += art.price_shelby_usd;
  art.licenses++;

  // distribute royalties
  const payments = [];
  for (const [agentId, pct] of Object.entries(art.royalty_split)) {
    const agent = db.agents.find(x => x.id === agentId);
    const amount = art.price_shelby_usd * pct;
    if (agent) agent.total_earned += amount;
    payments.push({ agent_id: agentId, agent_name: agent?.name, amount, percentage: pct });
  }

  const payment = { id: uid(), artifact_id: art.id, buyer_wallet: wallet, recipients: payments, total: art.price_shelby_usd, timestamp: now(), tx_hash: `0x${hash(uid() + now())}` };
  db.payments.push(payment);
  db.events.push({ id: uid(), type: "artifact_read", agent_id: art.creator_agent_id, agent_name: art.creator_agent_name, artifact_id: art.id, artifact_title: art.title.slice(0, 50), timestamp: now(), details: { wallet, amount: art.price_shelby_usd } });

  res.json({ ok: true, payment, artifact: art });
});

// Fork artifact
app.post("/api/artifacts/:id/fork", (req, res) => {
  const parent = db.artifacts.find(x => x.id === req.params.id);
  if (!parent) return res.status(404).json({ error: "Not found" });
  const { agent_id, title, wallet } = req.body;
  const agent = db.agents.find(x => x.id === agent_id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  // Calculate inherited royalty split
  const newSplit = { [agent.id]: 0.4 };
  for (const [aid, pct] of Object.entries(parent.royalty_split)) {
    newSplit[aid] = (newSplit[aid] || 0) + pct * 0.6;
  }

  const forked = {
    id: uid(), title: title || `[Fork] ${parent.title} — Enhanced`,
    description: `Enhanced version with additional analysis. Original by ${parent.creator_agent_name}.`,
    category: parent.category,
    creator_agent_id: agent.id, creator_agent_name: agent.name, creator_avatar: agent.avatar,
    owner_wallet: wallet || null,
    price_shelby_usd: parseFloat((parent.price_shelby_usd * 1.2).toFixed(4)),
    quality_score: Math.min(99, parent.quality_score + Math.floor(Math.random() * 10)),
    read_count: 0, fork_count: 0, total_earned: 0,
    royalty_split: newSplit,
    tags: [...parent.tags, "fork"],
    provenance_hash: hash(parent.provenance_hash + "fork" + now()),
    shelby_blob_id: `blob_${hash(parent.id + "fork")}`,
    fork_depth: parent.fork_depth + 1, parent_id: parent.id,
    status: "active", created_at: now(), licenses: 0,
  };
  db.artifacts.push(forked);
  parent.fork_count++;
  agent.artifacts_created++;
  db.events.push({ id: uid(), type: "artifact_forked", agent_id: agent.id, agent_name: agent.name, artifact_id: forked.id, artifact_title: forked.title.slice(0, 50), timestamp: now(), details: { parent_id: parent.id } });
  res.json(forked);
});

// Score
app.post("/api/artifacts/:id/score", (req, res) => {
  const art = db.artifacts.find(x => x.id === req.params.id);
  if (!art) return res.status(404).json({ error: "Not found" });
  const { score } = req.body;
  art.quality_score = Math.round((art.quality_score + score) / 2);
  const creator = db.agents.find(x => x.id === art.creator_agent_id);
  if (creator) creator.reputation = Math.min(100, Math.max(0, creator.reputation + (score > 70 ? 1 : -1)));
  db.events.push({ id: uid(), type: "quality_scored", agent_id: art.creator_agent_id, agent_name: art.creator_agent_name, artifact_id: art.id, artifact_title: art.title.slice(0, 50), timestamp: now(), details: { score } });
  res.json({ ok: true, new_score: art.quality_score });
});

// Events
app.get("/api/events", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(db.events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit));
});

// Payments
app.get("/api/payments", (req, res) => {
  const wallet = req.query.wallet;
  if (wallet) return res.json(db.payments.filter(p => p.buyer_wallet === wallet));
  res.json(db.payments.slice(-50));
});

// User profile (wallet-based)
app.post("/api/user/connect", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Wallet required" });
  if (!db.users.has(wallet)) {
    db.users.set(wallet, { wallet, connected_at: now(), agents: [], artifacts_purchased: [] });
  }
  const user = db.users.get(wallet);
  const myAgents = db.agents.filter(a => a.owner === wallet);
  const myArtifacts = db.artifacts.filter(a => a.owner_wallet === wallet);
  const myPayments = db.payments.filter(p => p.buyer_wallet === wallet);
  const totalSpent = myPayments.reduce((s, p) => s + p.total, 0);
  const totalEarned = myAgents.reduce((s, a) => s + a.total_earned, 0);
  res.json({ ...user, agents: myAgents, artifacts: myArtifacts, total_spent: totalSpent, total_earned: totalEarned });
});

// SPA fallback
app.get("*", (_, res) => res.sendFile(resolve(__dirname, "public", "index.html")));

// ── Start ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  ╔═══════════════════════════════════════════════╗`);
  console.log(`  ║   ECHOFORGE dApp — Shelby Protocol (Testnet)  ║`);
  console.log(`  ╚═══════════════════════════════════════════════╝`);
  console.log(`\n  🌐 http://localhost:${PORT}\n`);
});
