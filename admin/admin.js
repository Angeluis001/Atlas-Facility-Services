/* Atlas Admin SPA */
(() => {
  "use strict";

  const titles = {
    dashboard: "Dashboard",
    leads: "Leads / Contactos",
    clients: "Clientes",
    projects: "Proyectos",
    finance: "Finanzas",
  };

  const serviceLabels = {
    hvac: "HVAC",
    electrico: "Eléctrico",
    plomeria: "Plomería",
    pintura: "Pintura",
    mantenimiento: "Mantenimiento",
    seguridad: "Seguridad",
    varios: "Varios",
  };

  let cache = {
    clients: [],
    projects: [],
  };

  // ----- helpers -----
  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      location.replace("/admin/");
      throw new Error("Sesión expirada");
    }
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `Error ${res.status}`);
    }
    return data;
  }

  function money(cents, currency = "MXN") {
    const n = Number(cents || 0) / 100;
    return n.toLocaleString("es-MX", { style: "currency", currency });
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function fmtDay(iso) {
    if (!iso) return "—";
    return new Date(iso + (String(iso).length === 10 ? "T12:00:00" : "")).toLocaleDateString("es-MX");
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pill(status) {
    const s = status || "—";
    return `<span class="pill ${esc(s)}">${esc(s.replace(/_/g, " "))}</span>`;
  }

  let toastTimer;
  function toast(msg, isError = false) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.toggle("error", isError);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 3200);
  }

  // ----- modal -----
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");

  function openModal(title, html) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.hidden = false;
  }

  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = "";
  }

  modal.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  // ----- auth gate -----
  async function ensureAuth() {
    const data = await api("/api/auth/me");
    document.getElementById("userChip").textContent =
      data.user.name || data.user.email;
    return data.user;
  }

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
      await api("/api/auth/logout", { method: "POST", body: "{}" });
    } catch {}
    location.replace("/admin/");
  });

  // ----- navigation -----
  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    document.getElementById(`view-${name}`)?.classList.add("active");
    document.querySelector(`.nav-item[data-view="${name}"]`)?.classList.add("active");
    document.getElementById("viewTitle").textContent = titles[name] || name;
    document.getElementById("sidebar").classList.remove("open");

    if (name === "dashboard") loadDashboard();
    if (name === "leads") loadLeads();
    if (name === "clients") loadClients();
    if (name === "projects") loadProjects();
    if (name === "finance") loadFinance();
  }

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.goto));
  });

  document.getElementById("menuBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  // ----- Dashboard -----
  async function loadDashboard() {
    const { stats } = await api("/api/admin/stats");
    const g = document.getElementById("statGrid");
    g.innerHTML = `
      <div class="stat-card cyan">
        <div class="label">Leads nuevos</div>
        <div class="value">${stats.leads.nuevos}</div>
        <div class="hint">${stats.leads.total} en total · ${stats.leads.semana} esta semana</div>
      </div>
      <div class="stat-card">
        <div class="label">Clientes activos</div>
        <div class="value">${stats.clients.activos}</div>
        <div class="hint">${stats.clients.total} registrados</div>
      </div>
      <div class="stat-card amber">
        <div class="label">Proyectos en curso</div>
        <div class="value">${stats.projects.en_progreso}</div>
        <div class="hint">${stats.projects.pendientes} pendientes · ${stats.projects.total} total</div>
      </div>
      <div class="stat-card green">
        <div class="label">Balance</div>
        <div class="value">${money(stats.finance.balance_cents)}</div>
        <div class="hint">Ing. ${money(stats.finance.ingresos_cents)} · Eg. ${money(stats.finance.egresos_cents)}</div>
      </div>
    `;

    const badge = document.getElementById("badgeLeads");
    if (stats.leads.nuevos > 0) {
      badge.hidden = false;
      badge.textContent = stats.leads.nuevos;
    } else {
      badge.hidden = true;
    }

    const tbody = document.getElementById("recentLeadsBody");
    if (!stats.recentLeads.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty">Aún no hay leads</td></tr>`;
      return;
    }
    tbody.innerHTML = stats.recentLeads
      .map(
        (l) => `
      <tr>
        <td>
          <div class="cell-title">${esc(l.name)}</div>
          <div class="cell-sub">${esc(l.company || l.email)}</div>
        </td>
        <td>${esc(serviceLabels[l.service] || l.service || "—")}</td>
        <td>${pill(l.status)}</td>
        <td class="cell-sub">${fmtDate(l.created_at)}</td>
      </tr>`
      )
      .join("");
  }

  // ----- Leads -----
  async function loadLeads() {
    const status = document.getElementById("leadStatusFilter").value;
    const q = document.getElementById("leadSearch").value.trim();
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const { leads } = await api(`/api/admin/leads?${params}`);
    const tbody = document.getElementById("leadsBody");

    if (!leads.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">Sin resultados</td></tr>`;
      return;
    }

    tbody.innerHTML = leads
      .map((l) => {
        const options = ["nuevo", "contactado", "calificado", "convertido", "descartado"]
          .map(
            (s) =>
              `<option value="${s}" ${s === l.status ? "selected" : ""}>${s}</option>`
          )
          .join("");
        return `
      <tr data-id="${esc(l.id)}">
        <td>
          <div class="cell-title">${esc(l.name)}</div>
          <div class="cell-sub">${esc(l.email)}${l.phone ? " · " + esc(l.phone) : ""}</div>
          <div class="cell-sub">${esc(l.company || "")} · ${fmtDate(l.created_at)}</div>
        </td>
        <td>${esc(serviceLabels[l.service] || l.service || "—")}</td>
        <td><div class="cell-msg" title="${esc(l.message)}">${esc(l.message)}</div></td>
        <td>
          <select class="lead-status" data-id="${esc(l.id)}">
            ${options}
          </select>
        </td>
        <td class="actions">
          <button type="button" class="btn-sm convert-lead" data-id="${esc(l.id)}" ${
          l.status === "convertido" || l.status === "descartado" ? "disabled" : ""
        }>→ Cliente</button>
          <button type="button" class="btn-sm view-lead" data-id="${esc(l.id)}">Ver</button>
          ${
            l.status === "descartado"
              ? `<button type="button" class="btn-sm danger delete-lead" data-id="${esc(l.id)}">Borrar</button>`
              : ""
          }
        </td>
      </tr>`;
      })
      .join("");

    tbody.querySelectorAll(".lead-status").forEach((sel) => {
      sel.addEventListener("change", async () => {
        try {
          await api("/api/admin/leads", {
            method: "PATCH",
            body: JSON.stringify({ id: sel.dataset.id, status: sel.value }),
          });
          toast("Estado actualizado");
          loadLeads();
          loadDashboard();
        } catch (e) {
          toast(e.message, true);
        }
      });
    });

    tbody.querySelectorAll(".convert-lead").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Convertir este lead en cliente?")) return;
        try {
          await api("/api/admin/convert-lead", {
            method: "POST",
            body: JSON.stringify({ leadId: btn.dataset.id }),
          });
          toast("Cliente creado");
          loadLeads();
          loadDashboard();
        } catch (e) {
          toast(e.message, true);
        }
      });
    });

    tbody.querySelectorAll(".delete-lead").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Borrar este lead descartado de forma permanente?")) return;
        try {
          await api("/api/admin/leads", {
            method: "DELETE",
            body: JSON.stringify({ id: btn.dataset.id }),
          });
          toast("Lead eliminado");
          loadLeads();
          loadDashboard();
        } catch (e) {
          toast(e.message, true);
        }
      });
    });

    tbody.querySelectorAll(".view-lead").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lead = leads.find((x) => x.id === btn.dataset.id);
        if (!lead) return;
        openModal(
          "Detalle del lead",
          `
          <p><strong>${esc(lead.name)}</strong></p>
          <p class="cell-sub">${esc(lead.email)} ${lead.phone ? "· " + esc(lead.phone) : ""}</p>
          <p class="cell-sub">${esc(lead.company || "Sin empresa")} · ${esc(
            serviceLabels[lead.service] || lead.service || "—"
          )}</p>
          <p style="margin-top:12px;white-space:pre-wrap">${esc(lead.message)}</p>
          ${lead.notes ? `<p style="margin-top:12px;color:var(--muted)"><em>Notas:</em> ${esc(lead.notes)}</p>` : ""}
          <label>Notas internas
            <textarea id="leadNotes">${esc(lead.notes || "")}</textarea>
          </label>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" data-close>Cerrar</button>
            <button type="button" class="btn-primary" id="saveLeadNotes">Guardar notas</button>
          </div>
        `
        );
        modalBody.querySelector("[data-close]")?.addEventListener("click", closeModal);
        document.getElementById("saveLeadNotes").addEventListener("click", async () => {
          try {
            await api("/api/admin/leads", {
              method: "PATCH",
              body: JSON.stringify({
                id: lead.id,
                notes: document.getElementById("leadNotes").value,
              }),
            });
            toast("Notas guardadas");
            closeModal();
            loadLeads();
          } catch (e) {
            toast(e.message, true);
          }
        });
      });
    });
  }

  document.getElementById("refreshLeads").addEventListener("click", () => loadLeads().catch((e) => toast(e.message, true)));
  document.getElementById("leadStatusFilter").addEventListener("change", () => loadLeads().catch((e) => toast(e.message, true)));
  let searchTimer;
  document.getElementById("leadSearch").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadLeads().catch((e) => toast(e.message, true)), 300);
  });

  // ----- Clients -----
  async function loadClients() {
    const { clients } = await api("/api/admin/clients");
    cache.clients = clients;
    const tbody = document.getElementById("clientsBody");
    if (!clients.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">Sin clientes aún. Convierte un lead o crea uno manualmente.</td></tr>`;
      return;
    }
    tbody.innerHTML = clients
      .map(
        (c) => `
      <tr>
        <td>
          <div class="cell-title">${esc(c.name)}</div>
          <div class="cell-sub">${esc(c.company || "—")}</div>
        </td>
        <td>
          <div class="cell-sub">${esc(c.email || "—")}</div>
          <div class="cell-sub">${esc(c.phone || "")}</div>
        </td>
        <td class="cell-sub">${esc(c.city || "")}${c.region ? ", " + esc(c.region) : ""}</td>
        <td>${c.project_count ?? 0}</td>
        <td>${pill(c.status)}</td>
      </tr>`
      )
      .join("");
  }

  document.getElementById("newClientBtn").addEventListener("click", () => {
    openModal(
      "Nuevo cliente",
      `
      <label>Nombre * <input id="cName" required /></label>
      <label>Empresa <input id="cCompany" /></label>
      <label>Email <input id="cEmail" type="email" /></label>
      <label>Teléfono <input id="cPhone" /></label>
      <label>Ciudad <input id="cCity" value="Cabo San Lucas" /></label>
      <label>Notas <textarea id="cNotes"></textarea></label>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" data-close>Cancelar</button>
        <button type="button" class="btn-primary" id="saveClient">Guardar</button>
      </div>
    `
    );
    modalBody.querySelector("[data-close]")?.addEventListener("click", closeModal);
    document.getElementById("saveClient").addEventListener("click", async () => {
      const name = document.getElementById("cName").value.trim();
      if (!name) return toast("Nombre requerido", true);
      try {
        await api("/api/admin/clients", {
          method: "POST",
          body: JSON.stringify({
            name,
            company: document.getElementById("cCompany").value,
            email: document.getElementById("cEmail").value,
            phone: document.getElementById("cPhone").value,
            city: document.getElementById("cCity").value,
            notes: document.getElementById("cNotes").value,
          }),
        });
        toast("Cliente creado");
        closeModal();
        loadClients();
      } catch (e) {
        toast(e.message, true);
      }
    });
  });

  // ----- Projects -----
  async function loadProjects() {
    const [{ projects }, clientsData] = await Promise.all([
      api("/api/admin/projects"),
      cache.clients.length
        ? Promise.resolve({ clients: cache.clients })
        : api("/api/admin/clients"),
    ]);
    cache.clients = clientsData.clients;
    cache.projects = projects;

    const tbody = document.getElementById("projectsBody");
    if (!projects.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">Sin proyectos</td></tr>`;
      return;
    }
    tbody.innerHTML = projects
      .map(
        (p) => `
      <tr>
        <td>
          <div class="cell-title">${esc(p.title)}</div>
          <div class="cell-sub">${esc(p.description || "").slice(0, 80)}</div>
        </td>
        <td class="cell-sub">${esc(p.client_name)}${p.client_company ? " · " + esc(p.client_company) : ""}</td>
        <td>${esc(serviceLabels[p.service_type] || p.service_type || "—")}</td>
        <td>${money(p.budget_cents, p.currency || "MXN")}</td>
        <td>
          <select class="proj-status" data-id="${esc(p.id)}">
            ${["pendiente", "en_progreso", "completado", "pausado", "cancelado"]
              .map(
                (s) =>
                  `<option value="${s}" ${s === p.status ? "selected" : ""}>${s.replace(/_/g, " ")}</option>`
              )
              .join("")}
          </select>
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll(".proj-status").forEach((sel) => {
      sel.addEventListener("change", async () => {
        try {
          await api("/api/admin/projects", {
            method: "PATCH",
            body: JSON.stringify({ id: sel.dataset.id, status: sel.value }),
          });
          toast("Proyecto actualizado");
        } catch (e) {
          toast(e.message, true);
        }
      });
    });
  }

  document.getElementById("newProjectBtn").addEventListener("click", async () => {
    if (!cache.clients.length) {
      const { clients } = await api("/api/admin/clients");
      cache.clients = clients;
    }
    if (!cache.clients.length) {
      return toast("Primero crea un cliente", true);
    }
    const opts = cache.clients
      .map((c) => `<option value="${esc(c.id)}">${esc(c.name)}${c.company ? " — " + esc(c.company) : ""}</option>`)
      .join("");
    openModal(
      "Nuevo proyecto",
      `
      <label>Cliente *
        <select id="pClient">${opts}</select>
      </label>
      <label>Título * <input id="pTitle" /></label>
      <label>Servicio
        <select id="pService">
          <option value="">—</option>
          ${Object.entries(serviceLabels)
            .map(([k, v]) => `<option value="${k}">${v}</option>`)
            .join("")}
        </select>
      </label>
      <label>Presupuesto (MXN) <input id="pBudget" type="number" min="0" step="0.01" placeholder="0" /></label>
      <label>Descripción <textarea id="pDesc"></textarea></label>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" data-close>Cancelar</button>
        <button type="button" class="btn-primary" id="saveProject">Guardar</button>
      </div>
    `
    );
    modalBody.querySelector("[data-close]")?.addEventListener("click", closeModal);
    document.getElementById("saveProject").addEventListener("click", async () => {
      const title = document.getElementById("pTitle").value.trim();
      if (!title) return toast("Título requerido", true);
      const pesos = Number(document.getElementById("pBudget").value) || 0;
      try {
        await api("/api/admin/projects", {
          method: "POST",
          body: JSON.stringify({
            client_id: document.getElementById("pClient").value,
            title,
            service_type: document.getElementById("pService").value,
            description: document.getElementById("pDesc").value,
            budget_cents: Math.round(pesos * 100),
          }),
        });
        toast("Proyecto creado");
        closeModal();
        loadProjects();
      } catch (e) {
        toast(e.message, true);
      }
    });
  });

  // ----- Finance -----
  async function loadFinance() {
    const { entries, totals } = await api("/api/admin/finance");
    document.getElementById("financeStats").innerHTML = `
      <div class="stat-card green">
        <div class="label">Ingresos</div>
        <div class="value">${money(totals.ingresos_cents)}</div>
      </div>
      <div class="stat-card red">
        <div class="label">Egresos</div>
        <div class="value">${money(totals.egresos_cents)}</div>
      </div>
      <div class="stat-card cyan">
        <div class="label">Balance</div>
        <div class="value">${money(totals.balance_cents)}</div>
      </div>
    `;

    const tbody = document.getElementById("financeBody");
    if (!entries.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty">Sin movimientos</td></tr>`;
      return;
    }
    tbody.innerHTML = entries
      .map(
        (f) => `
      <tr>
        <td class="cell-sub">${fmtDay(f.entry_date)}</td>
        <td>${pill(f.type)}</td>
        <td>
          <div class="cell-title">${esc(f.description || f.category || "—")}</div>
          <div class="cell-sub">${esc(f.category || "")}</div>
        </td>
        <td class="cell-sub">${esc(f.client_name || "—")}${
          f.project_title ? " · " + esc(f.project_title) : ""
        }</td>
        <td class="${f.type === "ingreso" ? "cell-title" : ""}" style="color:${
          f.type === "ingreso" ? "var(--green)" : "var(--red)"
        }">${f.type === "egreso" ? "−" : ""}${money(f.amount_cents)}</td>
        <td><button type="button" class="btn-sm danger del-fin" data-id="${esc(f.id)}">Eliminar</button></td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll(".del-fin").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Eliminar este movimiento?")) return;
        try {
          await api("/api/admin/finance", {
            method: "DELETE",
            body: JSON.stringify({ id: btn.dataset.id }),
          });
          toast("Eliminado");
          loadFinance();
        } catch (e) {
          toast(e.message, true);
        }
      });
    });
  }

  document.getElementById("newFinanceBtn").addEventListener("click", async () => {
    if (!cache.clients.length) {
      try {
        const { clients } = await api("/api/admin/clients");
        cache.clients = clients;
      } catch {}
    }
    const clientOpts =
      `<option value="">— Opcional —</option>` +
      cache.clients
        .map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`)
        .join("");

    openModal(
      "Nuevo movimiento",
      `
      <label>Tipo *
        <select id="fType">
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>
      </label>
      <label>Monto (MXN) * <input id="fAmount" type="number" min="0" step="0.01" /></label>
      <label>Categoría <input id="fCat" placeholder="Materiales, mano de obra, cobro…" /></label>
      <label>Descripción <input id="fDesc" /></label>
      <label>Cliente <select id="fClient">${clientOpts}</select></label>
      <label>Fecha <input id="fDate" type="date" value="${new Date().toISOString().slice(0, 10)}" /></label>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" data-close>Cancelar</button>
        <button type="button" class="btn-primary" id="saveFinance">Guardar</button>
      </div>
    `
    );
    modalBody.querySelector("[data-close]")?.addEventListener("click", closeModal);
    document.getElementById("saveFinance").addEventListener("click", async () => {
      const amount = Number(document.getElementById("fAmount").value);
      if (!Number.isFinite(amount) || amount < 0) return toast("Monto inválido", true);
      try {
        await api("/api/admin/finance", {
          method: "POST",
          body: JSON.stringify({
            type: document.getElementById("fType").value,
            amount,
            category: document.getElementById("fCat").value,
            description: document.getElementById("fDesc").value,
            client_id: document.getElementById("fClient").value || null,
            entry_date: document.getElementById("fDate").value,
          }),
        });
        toast("Movimiento registrado");
        closeModal();
        loadFinance();
      } catch (e) {
        toast(e.message, true);
      }
    });
  });

  // ----- boot -----
  (async () => {
    try {
      await ensureAuth();
      showView("dashboard");
    } catch {
      location.replace("/admin/");
    }
  })();
})();
