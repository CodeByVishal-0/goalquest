import { useState, useEffect, useCallback } from "react";

// ─── SEED DATA ───────────────────────────────────────────────────────────────
const THRUST_AREAS = ["Revenue Growth", "Customer Experience", "Operational Excellence", "People & Culture", "Innovation", "Compliance & Risk"];
const UOM_TYPES = ["Numeric (Min)", "Numeric (Max)", "Percentage (Min)", "Percentage (Max)", "Timeline", "Zero-Based"];

const INITIAL_USERS = [
  { id: "emp1", name: "Priya Sharma", email: "priya@company.com", role: "employee", managerId: "mgr1", department: "Sales" },
  { id: "emp2", name: "Rahul Gupta", email: "rahul@company.com", role: "employee", managerId: "mgr1", department: "Sales" },
  { id: "emp3", name: "Neha Patel", email: "neha@company.com", role: "employee", managerId: "mgr2", department: "Operations" },
  { id: "mgr1", name: "Amit Kumar", email: "amit@company.com", role: "manager", managerId: "admin1", department: "Sales" },
  { id: "mgr2", name: "Sunita Rao", email: "sunita@company.com", role: "manager", managerId: "admin1", department: "Operations" },
  { id: "admin1", name: "HR Admin", email: "hr@company.com", role: "admin", managerId: null, department: "HR" },
];

const INITIAL_GOALS = [
  {
    id: "g1", employeeId: "emp1", title: "Achieve Q4 Sales Target", description: "Close 120% of assigned quota", thrustArea: "Revenue Growth",
    uom: "Percentage (Min)", target: 120, weightage: 40, status: "approved", lockedAt: "2024-05-10",
    actuals: { Q1: 95, Q2: 105, Q3: null, Q4: null }, checkInComments: { Q1: "On track after strong March", Q2: "Good momentum" }
  },
  {
    id: "g2", employeeId: "emp1", title: "NPS Score Improvement", description: "Improve Net Promoter Score by 15 points", thrustArea: "Customer Experience",
    uom: "Numeric (Min)", target: 15, weightage: 30, status: "approved", lockedAt: "2024-05-10",
    actuals: { Q1: 8, Q2: 12, Q3: null, Q4: null }, checkInComments: {}
  },
  {
    id: "g3", employeeId: "emp1", title: "Zero Safety Incidents", description: "Maintain zero workplace safety incidents", thrustArea: "Compliance & Risk",
    uom: "Zero-Based", target: 0, weightage: 30, status: "approved", lockedAt: "2024-05-10",
    actuals: { Q1: 0, Q2: 0, Q3: null, Q4: null }, checkInComments: {}
  },
  {
    id: "g4", employeeId: "emp2", title: "New Account Acquisition", description: "Acquire 25 new enterprise accounts", thrustArea: "Revenue Growth",
    uom: "Numeric (Min)", target: 25, weightage: 50, status: "pending_approval", lockedAt: null,
    actuals: {}, checkInComments: {}
  },
  {
    id: "g5", employeeId: "emp2", title: "Pipeline Coverage Ratio", description: "Maintain 3x pipeline coverage", thrustArea: "Revenue Growth",
    uom: "Numeric (Min)", target: 3, weightage: 50, status: "pending_approval", lockedAt: null,
    actuals: {}, checkInComments: {}
  },
];

const INITIAL_AUDIT_LOG = [
  { id: "a1", timestamp: "2024-05-10 09:32", userId: "mgr1", action: "Approved goals for Priya Sharma", targetId: "emp1" },
  { id: "a2", timestamp: "2024-05-08 14:15", userId: "emp1", action: "Submitted goal sheet for approval", targetId: "emp1" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function computeScore(goal, quarter) {
  const actual = goal.actuals?.[quarter];
  if (actual === null || actual === undefined) return null;
  const { uom, target } = goal;
  if (uom === "Zero-Based") return actual === 0 ? 100 : 0;
  if (uom === "Timeline") return actual <= target ? 100 : Math.max(0, 100 - (actual - target) * 10);
  if (uom === "Numeric (Max)" || uom === "Percentage (Max)") return actual === 0 ? 100 : Math.min(100, (target / actual) * 100);
  return Math.min(100, (actual / target) * 100);
}

function getStatusBadge(status) {
  const map = {
    draft: { bg: "#F1EFE8", color: "#5F5E5A", label: "Draft" },
    pending_approval: { bg: "#FAEEDA", color: "#854F0B", label: "Pending Approval" },
    approved: { bg: "#EAF3DE", color: "#3B6D11", label: "Approved" },
    returned: { bg: "#FCEBEB", color: "#A32D2D", label: "Returned" },
    shared: { bg: "#E6F1FB", color: "#185FA5", label: "Shared" },
  };
  return map[status] || map.draft;
}

function totalWeightage(goals) {
  return goals.reduce((s, g) => s + (Number(g.weightage) || 0), 0);
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const CURRENT_QUARTER = "Q2";

// ─── APP SHELL ────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [auditLog, setAuditLog] = useState(INITIAL_AUDIT_LOG);
  const [view, setView] = useState("dashboard");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [notification, setNotification] = useState(null);

  const addAudit = useCallback((userId, action, targetId = null) => {
    setAuditLog(prev => [{
      id: "a" + Date.now(), timestamp: new Date().toLocaleString("sv").slice(0, 16).replace("T", " "),
      userId, action, targetId
    }, ...prev]);
  }, []);

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  if (!currentUser) return <LoginScreen users={users} onLogin={u => { setCurrentUser(u); setView("dashboard"); }} />;

  const myGoals = goals.filter(g => g.employeeId === currentUser.id);
  const teamMembers = currentUser.role === "manager" ? users.filter(u => u.managerId === currentUser.id) : [];
  const teamGoals = goals.filter(g => teamMembers.some(m => m.id === g.employeeId));

  const props = { currentUser, users, goals, setGoals, auditLog, setAuditLog, addAudit, showNotif, myGoals, teamMembers, teamGoals, setUsers, selectedEmployee, setSelectedEmployee, setView };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" }}>
      {notification && (
        <div style={{
          position: "fixed", top: 16, right: 16, zIndex: 999,
          background: notification.type === "success" ? "var(--color-background-success)" : "var(--color-background-danger)",
          color: notification.type === "success" ? "var(--color-text-success)" : "var(--color-text-danger)",
          border: `0.5px solid ${notification.type === "success" ? "var(--color-border-success)" : "var(--color-border-danger)"}`,
          borderRadius: "var(--border-radius-lg)", padding: "12px 20px", fontSize: 14, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 8
        }}>
          <i className={`ti ti-${notification.type === "success" ? "check" : "alert-circle"}`} aria-hidden="true" />
          {notification.msg}
        </div>
      )}
      <Sidebar currentUser={currentUser} view={view} setView={setView} onLogout={() => { setCurrentUser(null); setView("dashboard"); }} />
      <div style={{ marginLeft: 240, padding: "32px 40px", minHeight: "100vh" }}>
        {view === "dashboard" && <Dashboard {...props} />}
        {view === "my-goals" && <MyGoals {...props} />}
        {view === "goal-form" && <GoalForm {...props} />}
        {view === "team-goals" && currentUser.role === "manager" && <TeamGoals {...props} />}
        {view === "checkin" && <CheckIn {...props} />}
        {view === "reports" && <Reports {...props} />}
        {view === "admin" && currentUser.role === "admin" && <AdminPanel {...props} />}
        {view === "audit" && currentUser.role === "admin" && <AuditLog auditLog={auditLog} users={users} />}
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ users, onLogin }) {
  const roleGroups = [
    { label: "Employee", color: "#185FA5", bg: "#E6F1FB", icon: "ti-user", users: users.filter(u => u.role === "employee") },
    { label: "Manager (L1)", color: "#3B6D11", bg: "#EAF3DE", icon: "ti-users", users: users.filter(u => u.role === "manager") },
    { label: "Admin / HR", color: "#854F0B", bg: "#FAEEDA", icon: "ti-shield", users: users.filter(u => u.role === "admin") },
  ];
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ maxWidth: 720, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "10px 20px", marginBottom: 24 }}>
            <i className="ti ti-target" style={{ fontSize: 22, color: "#185FA5" }} aria-hidden="true" />
            <span style={{ fontWeight: 500, fontSize: 18, color: "var(--color-text-primary)" }}>GoalQuest</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: "0 0 8px", color: "var(--color-text-primary)" }}>Goal Setting & Tracking Portal</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 15, margin: 0 }}>Select a demo account to continue</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {roleGroups.map(rg => (
            <div key={rg.label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "20px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--border-radius-md)", background: rg.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`ti ${rg.icon}`} style={{ fontSize: 16, color: rg.color }} aria-hidden="true" />
                </div>
                <span style={{ fontWeight: 500, fontSize: 14, color: "var(--color-text-primary)" }}>{rg.label}</span>
              </div>
              {rg.users.map(u => (
                <button key={u.id} onClick={() => onLogin(u)} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
                  marginBottom: 8, borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)",
                  background: "var(--color-background-secondary)", cursor: "pointer", textAlign: "left"
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: rg.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: rg.color, flexShrink: 0 }}>
                    {u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{u.department}</div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ currentUser, view, setView, onLogout }) {
  const navItems = [
    { id: "dashboard", icon: "ti-layout-dashboard", label: "Dashboard", roles: ["employee", "manager", "admin"] },
    { id: "my-goals", icon: "ti-target", label: "My Goals", roles: ["employee"] },
    { id: "goal-form", icon: "ti-plus", label: "Add Goals", roles: ["employee"] },
    { id: "team-goals", icon: "ti-users", label: "Team Goals", roles: ["manager"] },
    { id: "checkin", icon: "ti-clipboard-check", label: "Check-ins", roles: ["employee", "manager"] },
    { id: "reports", icon: "ti-chart-bar", label: "Reports", roles: ["employee", "manager", "admin"] },
    { id: "admin", icon: "ti-settings", label: "Admin Panel", roles: ["admin"] },
    { id: "audit", icon: "ti-history", label: "Audit Log", roles: ["admin"] },
  ].filter(n => n.roles.includes(currentUser.role));

  return (
    <div style={{
      position: "fixed", left: 0, top: 0, bottom: 0, width: 240,
      background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-tertiary)",
      display: "flex", flexDirection: "column", padding: "0 12px"
    }}>
      <div style={{ padding: "20px 8px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-target" style={{ fontSize: 20, color: "#185FA5" }} aria-hidden="true" />
          <span style={{ fontWeight: 500, fontSize: 16, color: "var(--color-text-primary)" }}>GoalQuest</span>
        </div>
      </div>
      <nav style={{ flex: 1 }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setView(n.id)} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px",
            marginBottom: 2, borderRadius: "var(--border-radius-md)", border: "none", cursor: "pointer", textAlign: "left",
            background: view === n.id ? "var(--color-background-info)" : "transparent",
            color: view === n.id ? "var(--color-text-info)" : "var(--color-text-secondary)",
            fontWeight: view === n.id ? 500 : 400, fontSize: 14
          }}>
            <i className={`ti ${n.icon}`} style={{ fontSize: 17 }} aria-hidden="true" />
            {n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "12px 0", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-background-info)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: "var(--color-text-info)", flexShrink: 0 }}>
            {currentUser.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.name}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{currentUser.role}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px",
          borderRadius: "var(--border-radius-md)", border: "none", cursor: "pointer",
          background: "transparent", color: "var(--color-text-secondary)", fontSize: 13
        }}>
          <i className="ti ti-logout" style={{ fontSize: 16 }} aria-hidden="true" />
          Switch user
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ currentUser, goals, users, myGoals, teamGoals, setView }) {
  const approvedGoals = myGoals.filter(g => g.status === "approved");
  const pendingGoals = myGoals.filter(g => g.status === "pending_approval");
  const avgScore = approvedGoals.length ? Math.round(approvedGoals.reduce((s, g) => {
    const sc = computeScore(g, CURRENT_QUARTER);
    return s + (sc !== null ? sc : 0);
  }, 0) / approvedGoals.length) : 0;

  const cards = currentUser.role === "employee" ? [
    { label: "Total goals", value: myGoals.length, icon: "ti-target", color: "#185FA5", bg: "#E6F1FB" },
    { label: "Approved", value: approvedGoals.length, icon: "ti-check", color: "#3B6D11", bg: "#EAF3DE" },
    { label: "Pending review", value: pendingGoals.length, icon: "ti-clock", color: "#854F0B", bg: "#FAEEDA" },
    { label: `${CURRENT_QUARTER} avg score`, value: avgScore + "%", icon: "ti-chart-line", color: "#533BB7", bg: "#EEEDFE" },
  ] : currentUser.role === "manager" ? [
    { label: "Team members", value: users.filter(u => u.managerId === currentUser.id).length, icon: "ti-users", color: "#185FA5", bg: "#E6F1FB" },
    { label: "Goals to review", value: teamGoals.filter(g => g.status === "pending_approval").length, icon: "ti-bell", color: "#854F0B", bg: "#FAEEDA" },
    { label: "Approved goals", value: teamGoals.filter(g => g.status === "approved").length, icon: "ti-check", color: "#3B6D11", bg: "#EAF3DE" },
    { label: "Check-ins due", value: teamGoals.filter(g => g.status === "approved" && g.actuals?.[CURRENT_QUARTER] === null).length, icon: "ti-clipboard-check", color: "#533BB7", bg: "#EEEDFE" },
  ] : [
    { label: "Total employees", value: users.filter(u => u.role === "employee").length, icon: "ti-users", color: "#185FA5", bg: "#E6F1FB" },
    { label: "All goals", value: goals.length, icon: "ti-target", color: "#3B6D11", bg: "#EAF3DE" },
    { label: "Pending approvals", value: goals.filter(g => g.status === "pending_approval").length, icon: "ti-clock", color: "#854F0B", bg: "#FAEEDA" },
    { label: "Approved goals", value: goals.filter(g => g.status === "approved").length, icon: "ti-check", color: "#533BB7", bg: "#EEEDFE" },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>Welcome back, {currentUser.name.split(" ")[0]}</h1>
      <p style={{ color: "var(--color-text-secondary)", margin: "0 0 28px", fontSize: 14 }}>Current cycle: May 2024 — April 2025 · {CURRENT_QUARTER} check-in active</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "20px 20px 16px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--border-radius-md)", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <i className={`ti ${c.icon}`} style={{ fontSize: 18, color: c.color }} aria-hidden="true" />
            </div>
            <div style={{ fontSize: 24, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>{c.value}</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {currentUser.role === "employee" && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 16px", color: "var(--color-text-primary)" }}>My goals overview</h2>
          {myGoals.length === 0 ? (
            <EmptyState icon="ti-target" title="No goals yet" desc="Create your goal sheet to get started." action="Add Goals" onAction={() => setView("goal-form")} />
          ) : (
            <GoalTable goals={myGoals} />
          )}
        </div>
      )}

      {currentUser.role === "manager" && teamGoals.filter(g => g.status === "pending_approval").length > 0 && (
        <div style={{ background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", borderRadius: "var(--border-radius-lg)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 18, color: "var(--color-text-warning)" }} aria-hidden="true" />
          <span style={{ fontSize: 14, color: "var(--color-text-warning)", fontWeight: 500 }}>
            {teamGoals.filter(g => g.status === "pending_approval").length} goal sheets awaiting your review
          </span>
          <button onClick={() => setView("team-goals")} style={{ marginLeft: "auto", fontSize: 13, color: "var(--color-text-warning)", border: "0.5px solid var(--color-border-warning)", background: "transparent", borderRadius: "var(--border-radius-md)", padding: "6px 12px", cursor: "pointer" }}>Review now</button>
        </div>
      )}
    </div>
  );
}

// ─── MY GOALS ─────────────────────────────────────────────────────────────────
function MyGoals({ currentUser, myGoals, goals, setGoals, addAudit, showNotif, setView }) {
  const tw = totalWeightage(myGoals);
  const canSubmit = myGoals.length > 0 && tw === 100 && myGoals.every(g => g.status === "draft");
  const hasPending = myGoals.some(g => g.status === "pending_approval");

  function handleSubmit() {
    setGoals(prev => prev.map(g => g.employeeId === currentUser.id && g.status === "draft" ? { ...g, status: "pending_approval" } : g));
    addAudit(currentUser.id, "Submitted goal sheet for approval", currentUser.id);
    showNotif("Goals submitted for manager approval.");
  }

  function handleDelete(gid) {
    setGoals(prev => prev.filter(g => g.id !== gid));
    showNotif("Goal deleted.");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px" }}>My Goals</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>
            {myGoals.length} / 8 goals · Total weightage: <strong style={{ color: tw === 100 ? "var(--color-text-success)" : "var(--color-text-danger)" }}>{tw}%</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {myGoals.some(g => g.status === "draft") && (
            <button onClick={() => setView("goal-form")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", cursor: "pointer", fontSize: 13 }}>
              <i className="ti ti-plus" aria-hidden="true" /> Add goal
            </button>
          )}
          {canSubmit && (
            <button onClick={handleSubmit} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#185FA5", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
              <i className="ti ti-send" aria-hidden="true" /> Submit for approval
            </button>
          )}
          {hasPending && <span style={{ padding: "8px 14px", background: "var(--color-background-warning)", color: "var(--color-text-warning)", borderRadius: "var(--border-radius-md)", fontSize: 13 }}>Awaiting approval</span>}
        </div>
      </div>

      {tw !== 100 && myGoals.length > 0 && myGoals.some(g => g.status === "draft") && (
        <div style={{ background: "var(--color-background-danger)", border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "var(--color-text-danger)" }}>
          <i className="ti ti-alert-circle" aria-hidden="true" style={{ marginRight: 6 }} />
          Total weightage must equal 100% before submitting. Current: {tw}%
        </div>
      )}

      {myGoals.length === 0 ? (
        <EmptyState icon="ti-target" title="No goals created" desc="Start by adding your goals for this cycle." action="Add your first goal" onAction={() => setView("goal-form")} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {myGoals.map(g => <GoalCard key={g.id} goal={g} onDelete={g.status === "draft" ? () => handleDelete(g.id) : null} />)}
        </div>
      )}
    </div>
  );
}

// ─── GOAL FORM ────────────────────────────────────────────────────────────────
function GoalForm({ currentUser, myGoals, goals, setGoals, showNotif, setView, addAudit }) {
  const [form, setForm] = useState({ title: "", description: "", thrustArea: THRUST_AREAS[0], uom: UOM_TYPES[0], target: "", weightage: "" });
  const [errors, setErrors] = useState({});

  const draftGoals = myGoals.filter(g => g.status === "draft");
  const usedWeightage = totalWeightage(draftGoals);

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = "Goal title is required";
    if (!form.target || isNaN(form.target)) e.target = "Enter a valid target";
    const w = Number(form.weightage);
    if (!w || w < 10) e.weightage = "Minimum weightage is 10%";
    if (w > 100) e.weightage = "Weightage cannot exceed 100%";
    if (usedWeightage + w > 100) e.weightage = `Adding this would exceed 100% (current: ${usedWeightage}%)`;
    if (draftGoals.length >= 8) e.title = "Maximum 8 goals allowed";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const newGoal = {
      id: "g" + Date.now(), employeeId: currentUser.id, ...form,
      target: Number(form.target), weightage: Number(form.weightage),
      status: "draft", lockedAt: null, actuals: {}, checkInComments: {}
    };
    setGoals(prev => [...prev, newGoal]);
    addAudit(currentUser.id, `Created goal: ${form.title}`, currentUser.id);
    showNotif("Goal added successfully.");
    setView("my-goals");
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <button onClick={() => setView("my-goals")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0, marginBottom: 20 }}>
        <i className="ti ti-arrow-left" aria-hidden="true" /> Back to my goals
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 24px" }}>Add new goal</h1>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 28 }}>
        <FormField label="Goal title" error={errors.title} required>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Achieve Q4 Sales Target" style={{ width: "100%", boxSizing: "border-box" }} />
        </FormField>
        <FormField label="Description">
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe what success looks like..." style={{ width: "100%", boxSizing: "border-box", resize: "vertical", padding: 8, border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "var(--font-sans)", fontSize: 14 }} />
        </FormField>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FormField label="Thrust area" required>
            <select value={form.thrustArea} onChange={e => setForm(p => ({ ...p, thrustArea: e.target.value }))} style={{ width: "100%", boxSizing: "border-box" }}>
              {THRUST_AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </FormField>
          <FormField label="Unit of measurement (UoM)" required>
            <select value={form.uom} onChange={e => setForm(p => ({ ...p, uom: e.target.value }))} style={{ width: "100%", boxSizing: "border-box" }}>
              {UOM_TYPES.map(u => <option key={u}>{u}</option>)}
            </select>
          </FormField>
          <FormField label="Target" error={errors.target} required>
            <input type="number" value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} placeholder="e.g. 100" style={{ width: "100%", boxSizing: "border-box" }} />
          </FormField>
          <FormField label="Weightage (%)" error={errors.weightage} required>
            <input type="number" value={form.weightage} onChange={e => setForm(p => ({ ...p, weightage: e.target.value }))} placeholder={`Remaining: ${100 - usedWeightage}%`} min={10} max={100} style={{ width: "100%", boxSizing: "border-box" }} />
          </FormField>
        </div>
        <div style={{ marginTop: 8, padding: "10px 14px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 13, color: "var(--color-text-secondary)" }}>
          <i className="ti ti-info-circle" aria-hidden="true" style={{ marginRight: 6 }} />
          Validation: max 8 goals · min 10% weightage per goal · total must equal 100%
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={handleSubmit} style={{ padding: "10px 20px", background: "#185FA5", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
            Save goal
          </button>
          <button onClick={() => setView("my-goals")} style={{ padding: "10px 20px", border: "0.5px solid var(--color-border-secondary)", background: "transparent", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TEAM GOALS (MANAGER) ─────────────────────────────────────────────────────
function TeamGoals({ currentUser, users, teamMembers, teamGoals, goals, setGoals, addAudit, showNotif }) {
  const [selected, setSelected] = useState(teamMembers[0]?.id);
  const [editingGoal, setEditingGoal] = useState(null);
  const [comment, setComment] = useState("");

  const member = users.find(u => u.id === selected);
  const memberGoals = teamGoals.filter(g => g.employeeId === selected);
  const tw = totalWeightage(memberGoals);
  const pendingGoals = memberGoals.filter(g => g.status === "pending_approval");

  function handleApprove() {
    setGoals(prev => prev.map(g => g.employeeId === selected && g.status === "pending_approval"
      ? { ...g, status: "approved", lockedAt: new Date().toISOString().slice(0, 10) } : g));
    addAudit(currentUser.id, `Approved all goals for ${member?.name}`, selected);
    showNotif(`Goals approved for ${member?.name}.`);
  }

  function handleReturn() {
    setGoals(prev => prev.map(g => g.employeeId === selected && g.status === "pending_approval" ? { ...g, status: "returned" } : g));
    addAudit(currentUser.id, `Returned goals for rework to ${member?.name}`, selected);
    showNotif("Goals returned for rework.");
  }

  function handleInlineEdit(goalId, field, value) {
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, [field]: field === "weightage" || field === "target" ? Number(value) : value } : g));
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 24px" }}>Team Goals</h1>
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          {teamMembers.map(m => {
            const mg = teamGoals.filter(g => g.employeeId === m.id);
            const hasPending = mg.some(g => g.status === "pending_approval");
            return (
              <button key={m.id} onClick={() => setSelected(m.id)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
                marginBottom: 6, borderRadius: "var(--border-radius-md)", border: selected === m.id ? "1.5px solid #185FA5" : "0.5px solid var(--color-border-tertiary)",
                background: selected === m.id ? "var(--color-background-info)" : "var(--color-background-primary)", cursor: "pointer", textAlign: "left"
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: "#185FA5", flexShrink: 0 }}>
                  {m.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{m.name}</div>
                  {hasPending && <div style={{ fontSize: 11, color: "#854F0B" }}>Awaiting review</div>}
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }}>
          {member && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 16 }}>{member.name}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{memberGoals.length} goals · Weightage: <strong style={{ color: tw === 100 ? "var(--color-text-success)" : "var(--color-text-danger)" }}>{tw}%</strong></div>
                </div>
                {pendingGoals.length > 0 && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleReturn} style={{ padding: "7px 14px", border: "0.5px solid var(--color-border-danger)", background: "transparent", color: "var(--color-text-danger)", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13 }}>
                      <i className="ti ti-rotate-2" aria-hidden="true" style={{ marginRight: 4 }} />Return for rework
                    </button>
                    <button onClick={handleApprove} disabled={tw !== 100} style={{ padding: "7px 14px", background: tw === 100 ? "#3B6D11" : "#B4B2A9", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: tw === 100 ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 500 }}>
                      <i className="ti ti-check" aria-hidden="true" style={{ marginRight: 4 }} />Approve all
                    </button>
                  </div>
                )}
              </div>
              {memberGoals.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-secondary)", fontSize: 14 }}>No goals submitted yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {memberGoals.map(g => (
                    <div key={g.id} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{g.title}</div>
                          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{g.thrustArea} · {g.uom}</div>
                        </div>
                        <StatusBadge status={g.status} />
                      </div>
                      {g.status === "pending_approval" ? (
                        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                          <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Target:
                            <input type="number" defaultValue={g.target} onBlur={e => handleInlineEdit(g.id, "target", e.target.value)} style={{ marginLeft: 6, width: 80, fontSize: 12 }} />
                          </label>
                          <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Weightage:
                            <input type="number" defaultValue={g.weightage} onBlur={e => handleInlineEdit(g.id, "weightage", e.target.value)} style={{ marginLeft: 6, width: 60, fontSize: 12 }} />%
                          </label>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--color-text-secondary)" }}>
                          <span>Target: {g.target}</span>
                          <span>Weightage: {g.weightage}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CHECK-IN ─────────────────────────────────────────────────────────────────
function CheckIn({ currentUser, users, myGoals, teamGoals, teamMembers, goals, setGoals, addAudit, showNotif }) {
  const [selectedQ, setSelectedQ] = useState(CURRENT_QUARTER);
  const [selectedMember, setSelectedMember] = useState(teamMembers[0]?.id);
  const [comments, setComments] = useState({});

  const isEmployee = currentUser.role === "employee";
  const targetGoals = isEmployee ? myGoals.filter(g => g.status === "approved") : teamGoals.filter(g => g.employeeId === selectedMember && g.status === "approved");

  function handleActualUpdate(goalId, value) {
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, actuals: { ...g.actuals, [selectedQ]: value === "" ? null : Number(value) } } : g));
  }

  function handleCommentSave(goalId) {
    const c = comments[goalId];
    if (!c?.trim()) return;
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, checkInComments: { ...g.checkInComments, [selectedQ]: c } } : g));
    addAudit(currentUser.id, `Added ${selectedQ} check-in comment for goal`, goalId);
    showNotif("Check-in comment saved.");
  }

  const windowInfo = { Q1: "July", Q2: "October", Q3: "January", Q4: "March/April" };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 8px" }}>Quarterly Check-ins</h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: 14, margin: "0 0 24px" }}>Log actual achievements and manager feedback for each quarter.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {QUARTERS.map(q => (
          <button key={q} onClick={() => setSelectedQ(q)} style={{
            padding: "7px 16px", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13, fontWeight: selectedQ === q ? 500 : 400,
            border: selectedQ === q ? "1.5px solid #185FA5" : "0.5px solid var(--color-border-tertiary)",
            background: selectedQ === q ? "var(--color-background-info)" : "var(--color-background-primary)",
            color: selectedQ === q ? "var(--color-text-info)" : "var(--color-text-secondary)"
          }}>{q} {q === CURRENT_QUARTER && <span style={{ fontSize: 10, marginLeft: 4 }}>●</span>}</button>
        ))}
        <span style={{ marginLeft: 8, fontSize: 12, color: "var(--color-text-secondary)", alignSelf: "center" }}>
          {selectedQ} window opens: {windowInfo[selectedQ]}
        </span>
      </div>

      {!isEmployee && teamMembers.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {teamMembers.map(m => (
            <button key={m.id} onClick={() => setSelectedMember(m.id)} style={{
              padding: "6px 14px", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13,
              border: selectedMember === m.id ? "1.5px solid #185FA5" : "0.5px solid var(--color-border-tertiary)",
              background: selectedMember === m.id ? "var(--color-background-info)" : "var(--color-background-primary)",
              color: selectedMember === m.id ? "var(--color-text-info)" : "var(--color-text-secondary)"
            }}>{m.name}</button>
          ))}
        </div>
      )}

      {targetGoals.length === 0 ? (
        <EmptyState icon="ti-clipboard-check" title="No approved goals" desc="Goals must be approved before check-ins can be logged." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {targetGoals.map(g => {
            const actual = g.actuals?.[selectedQ];
            const score = computeScore(g, selectedQ);
            const existingComment = g.checkInComments?.[selectedQ];
            return (
              <div key={g.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>{g.title}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{g.thrustArea} · UoM: {g.uom} · Target: {g.target} · Weight: {g.weightage}%</div>
                  </div>
                  {score !== null && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 500, color: score >= 80 ? "#3B6D11" : score >= 50 ? "#854F0B" : "#A32D2D" }}>{Math.round(score)}%</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>progress score</div>
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Planned target</div>
                    <div style={{ fontWeight: 500, fontSize: 16 }}>{g.target}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Actual achievement {selectedQ}</div>
                    {isEmployee ? (
                      <input type="number" value={actual ?? ""} onChange={e => handleActualUpdate(g.id, e.target.value)} placeholder="Enter actual..." style={{ fontSize: 14 }} />
                    ) : (
                      <div style={{ fontWeight: 500, fontSize: 16 }}>{actual !== null && actual !== undefined ? actual : "—"}</div>
                    )}
                  </div>
                </div>
                {isEmployee && (
                  <div style={{ marginBottom: 8 }}>
                    <select value={g.status} onChange={e => setGoals(prev => prev.map(gl => gl.id === g.id ? { ...gl, goalStatus: e.target.value } : gl))} style={{ fontSize: 13 }}>
                      <option value="not_started">Not started</option>
                      <option value="on_track">On track</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
                {!isEmployee && (
                  <div>
                    {existingComment && (
                      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 12px", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                        <i className="ti ti-message-circle" aria-hidden="true" style={{ marginRight: 6 }} />
                        {existingComment}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={comments[g.id] || ""} onChange={e => setComments(p => ({ ...p, [g.id]: e.target.value }))} placeholder={`Add ${selectedQ} check-in comment...`} style={{ flex: 1, fontSize: 13 }} />
                      <button onClick={() => handleCommentSave(g.id)} style={{ padding: "6px 14px", background: "#185FA5", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13 }}>Save</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
function Reports({ currentUser, users, goals }) {
  const employees = users.filter(u => u.role === "employee");

  function exportCSV() {
    const rows = [["Employee", "Goal Title", "Thrust Area", "UoM", "Target", "Weightage", "Q1 Actual", "Q2 Actual", "Q1 Score", "Q2 Score", "Status"]];
    goals.forEach(g => {
      const emp = users.find(u => u.id === g.employeeId);
      rows.push([emp?.name || "", g.title, g.thrustArea, g.uom, g.target, g.weightage + "%", g.actuals?.Q1 ?? "", g.actuals?.Q2 ?? "", computeScore(g, "Q1")?.toFixed(1) ?? "", computeScore(g, "Q2")?.toFixed(1) ?? "", g.status]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "achievement_report.csv";
    a.click();
  }

  const completedCheckins = goals.filter(g => g.status === "approved" && g.actuals?.[CURRENT_QUARTER] !== null && g.actuals?.[CURRENT_QUARTER] !== undefined);
  const totalApproved = goals.filter(g => g.status === "approved");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Reports & Analytics</h1>
        <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#185FA5", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
          <i className="ti ti-download" aria-hidden="true" /> Export CSV
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Check-in completion", value: totalApproved.length ? Math.round(completedCheckins.length / totalApproved.length * 100) + "%" : "0%", sub: `${completedCheckins.length} / ${totalApproved.length} goals updated` },
          { label: "Goals pending approval", value: goals.filter(g => g.status === "pending_approval").length, sub: "Awaiting manager review" },
          { label: "Avg org score", value: (() => { const s = totalApproved.filter(g => computeScore(g, CURRENT_QUARTER) !== null).map(g => computeScore(g, CURRENT_QUARTER)); return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) + "%" : "N/A"; })(), sub: `Based on ${CURRENT_QUARTER} actuals` },
        ].map(c => (
          <div key={c.label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>{c.value}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>Achievement report — all employees</h2>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)" }}>
              {["Employee", "Goal Title", "Thrust Area", "Target", "Q1 Actual", "Q1 Score", "Q2 Actual", "Q2 Score", "Status"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {goals.map(g => {
              const emp = users.find(u => u.id === g.employeeId);
              const s1 = computeScore(g, "Q1"), s2 = computeScore(g, "Q2");
              return (
                <tr key={g.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "10px 14px" }}>{emp?.name}</td>
                  <td style={{ padding: "10px 14px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.title}</td>
                  <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 11, padding: "2px 8px", background: "var(--color-background-secondary)", borderRadius: 99 }}>{g.thrustArea}</span></td>
                  <td style={{ padding: "10px 14px" }}>{g.target}</td>
                  <td style={{ padding: "10px 14px" }}>{g.actuals?.Q1 ?? "—"}</td>
                  <td style={{ padding: "10px 14px" }}>{s1 !== null ? <ScoreChip score={s1} /> : "—"}</td>
                  <td style={{ padding: "10px 14px" }}>{g.actuals?.Q2 ?? "—"}</td>
                  <td style={{ padding: "10px 14px" }}>{s2 !== null ? <ScoreChip score={s2} /> : "—"}</td>
                  <td style={{ padding: "10px 14px" }}><StatusBadge status={g.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ users, goals, setGoals, addAudit, showNotif, currentUser }) {
  const [activeTab, setActiveTab] = useState("overview");

  function handleUnlock(goalId) {
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: "draft", lockedAt: null } : g));
    addAudit(currentUser.id, `Admin unlocked goal id:${goalId}`, goalId);
    showNotif("Goal unlocked for editing.");
  }

  function handlePushSharedGoal() {
    const employees = users.filter(u => u.role === "employee");
    const sharedGoals = employees.map(e => ({
      id: "sg" + Date.now() + e.id, employeeId: e.id,
      title: "Departmental KPI: Zero Customer Complaints", description: "Org-wide shared goal pushed by HR",
      thrustArea: "Customer Experience", uom: "Zero-Based", target: 0,
      weightage: 10, status: "shared", lockedAt: new Date().toISOString().slice(0, 10),
      actuals: {}, checkInComments: {}, isShared: true
    }));
    setGoals(prev => [...prev, ...sharedGoals]);
    addAudit(currentUser.id, "Pushed shared departmental KPI to all employees", null);
    showNotif("Shared goal pushed to all employees.");
  }

  const tabs = ["overview", "goal-management", "shared-goals"];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 24px" }}>Admin Panel</h1>
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: "8px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: activeTab === t ? 500 : 400,
            color: activeTab === t ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            borderBottom: activeTab === t ? "2px solid #185FA5" : "2px solid transparent",
            textTransform: "capitalize"
          }}>{t.replace(/-/g, " ")}</button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
            {[
              { label: "Total users", value: users.length },
              { label: "Total goals", value: goals.length },
              { label: "Approved goals", value: goals.filter(g => g.status === "approved").length },
              { label: "Pending approval", value: goals.filter(g => g.status === "pending_approval").length },
            ].map(c => (
              <div key={c.label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 20 }}>
                <div style={{ fontSize: 24, fontWeight: 500 }}>{c.value}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{c.label}</div>
              </div>
            ))}
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>Org hierarchy</h2>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 20 }}>
            {users.filter(u => u.role === "manager").map(mgr => (
              <div key={mgr.id} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#EAF3DE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: "#3B6D11" }}>
                    {mgr.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{mgr.name}</span>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>· {mgr.department}</span>
                </div>
                {users.filter(u => u.managerId === mgr.id).map(e => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 40, marginBottom: 4 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--color-border-tertiary)" }} />
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{e.name} · {e.department}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "goal-management" && (
        <div>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 16 }}>Unlock approved/locked goals for exceptional editing.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {goals.filter(g => g.status === "approved").map(g => {
              const emp = users.find(u => u.id === g.employeeId);
              return (
                <div key={g.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{g.title}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{emp?.name} · Locked: {g.lockedAt}</div>
                  </div>
                  <button onClick={() => handleUnlock(g.id)} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-warning)", color: "var(--color-text-warning)", background: "var(--color-background-warning)", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 12 }}>
                    Unlock
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "shared-goals" && (
        <div>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 16 }}>Push a departmental KPI to all employees. Recipients can only adjust weightage.</p>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 24, maxWidth: 480 }}>
            <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>Departmental KPI: Zero Customer Complaints</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>UoM: Zero-Based · Target: 0 · Thrust: Customer Experience</div>
            <button onClick={handlePushSharedGoal} style={{ padding: "9px 18px", background: "#185FA5", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
              <i className="ti ti-send" aria-hidden="true" style={{ marginRight: 6 }} />Push to all employees
            </button>
          </div>
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8 }}>Shared goals already pushed:</div>
            {goals.filter(g => g.isShared).length === 0
              ? <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>None yet.</div>
              : goals.filter(g => g.isShared).slice(0, 5).map(g => {
                const emp = users.find(u => u.id === g.employeeId);
                return <div key={g.id} style={{ fontSize: 13, padding: "4px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{emp?.name} · {g.title}</div>;
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
function AuditLog({ auditLog, users }) {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 24px" }}>Audit Trail</h1>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)" }}>
              {["Timestamp", "User", "Action"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {auditLog.map(a => {
              const u = users.find(x => x.id === a.userId);
              return (
                <tr key={a.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "10px 16px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{a.timestamp}</td>
                  <td style={{ padding: "10px 16px", fontWeight: 500 }}>{u?.name || a.userId}</td>
                  <td style={{ padding: "10px 16px" }}>{a.action}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function GoalTable({ goals }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--color-background-secondary)" }}>
            {["Goal", "Thrust Area", "UoM", "Target", "Weightage", "Status"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {goals.map(g => (
            <tr key={g.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <td style={{ padding: "10px 14px", fontWeight: 500 }}>{g.title}</td>
              <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)" }}>{g.thrustArea}</td>
              <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)" }}>{g.uom}</td>
              <td style={{ padding: "10px 14px" }}>{g.target}</td>
              <td style={{ padding: "10px 14px" }}>{g.weightage}%</td>
              <td style={{ padding: "10px 14px" }}><StatusBadge status={g.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GoalCard({ goal, onDelete }) {
  const { bg, color, label } = getStatusBadge(goal.status);
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 3 }}>{goal.title}</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{goal.thrustArea} · {goal.uom}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusBadge status={goal.status} />
          {onDelete && (
            <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: 4 }}>
              <i className="ti ti-trash" style={{ fontSize: 15 }} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <span>Target: <strong style={{ color: "var(--color-text-primary)" }}>{goal.target}</strong></span>
        <span>Weightage: <strong style={{ color: "var(--color-text-primary)" }}>{goal.weightage}%</strong></span>
        {goal.lockedAt && <span>Locked: {goal.lockedAt}</span>}
      </div>
      {(goal.actuals?.Q1 !== undefined || goal.actuals?.Q2 !== undefined) && (
        <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
          {QUARTERS.filter(q => goal.actuals?.[q] !== undefined && goal.actuals?.[q] !== null).map(q => {
            const sc = computeScore(goal, q);
            return (
              <div key={q} style={{ fontSize: 12, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "4px 10px" }}>
                {q}: {goal.actuals[q]} {sc !== null && <ScoreChip score={sc} small />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const { bg, color, label } = getStatusBadge(status);
  return <span style={{ background: bg, color, fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 500, whiteSpace: "nowrap" }}>{label}</span>;
}

function ScoreChip({ score, small }) {
  const c = score >= 80 ? "#3B6D11" : score >= 50 ? "#854F0B" : "#A32D2D";
  const bg = score >= 80 ? "#EAF3DE" : score >= 50 ? "#FAEEDA" : "#FCEBEB";
  return <span style={{ background: bg, color: c, fontSize: small ? 10 : 12, padding: small ? "1px 6px" : "2px 8px", borderRadius: 99, fontWeight: 500 }}>{Math.round(score)}%</span>;
}

function FormField({ label, children, error, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "var(--color-text-danger)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 12, color: "var(--color-text-danger)", marginTop: 4 }}><i className="ti ti-alert-circle" aria-hidden="true" style={{ marginRight: 4 }} />{error}</div>}
    </div>
  );
}

function EmptyState({ icon, title, desc, action, onAction }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)" }}>
      <i className={`ti ${icon}`} style={{ fontSize: 36, color: "var(--color-text-secondary)", display: "block", marginBottom: 12 }} aria-hidden="true" />
      <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: onAction ? 16 : 0 }}>{desc}</div>
      {onAction && (
        <button onClick={onAction} style={{ padding: "8px 18px", background: "#185FA5", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13 }}>{action}</button>
      )}
    </div>
  );
}
