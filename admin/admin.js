/* Atlas Admin SPA */
(() => {
  "use strict";

  const titles = {
    dashboard: "Dashboard",
    leads: "Leads / Contactos",
    clients: "Clientes",
    projects: "Proyectos",
    quotes: "Cotizaciones",
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
    if (name === "quotes") loadQuotes();
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

  document.getElementById("newLeadBtn").addEventListener("click", () => {
    const serviceOpts = Object.entries(serviceLabels)
      .map(([k, v]) => `<option value="${k}">${v}</option>`)
      .join("");
    openModal(
      "Nuevo lead (manual)",
      `
      <label>Nombre * <input id="lName" required autocomplete="name" /></label>
      <label>Empresa <input id="lCompany" autocomplete="organization" /></label>
      <label>Email * <input id="lEmail" type="email" required autocomplete="email" /></label>
      <label>Teléfono <input id="lPhone" type="tel" autocomplete="tel" /></label>
      <label>Servicio
        <select id="lService">
          <option value="">—</option>
          ${serviceOpts}
        </select>
      </label>
      <label>Estado
        <select id="lStatus">
          <option value="nuevo" selected>nuevo</option>
          <option value="contactado">contactado</option>
          <option value="calificado">calificado</option>
          <option value="convertido">convertido</option>
          <option value="descartado">descartado</option>
        </select>
      </label>
      <label>Mensaje / notas del contacto * <textarea id="lMessage" required placeholder="Cómo llegó, qué necesita…"></textarea></label>
      <label>Notas internas <textarea id="lNotes" placeholder="Solo visibles en admin"></textarea></label>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" data-close>Cancelar</button>
        <button type="button" class="btn-primary" id="saveLead">Guardar lead</button>
      </div>
    `
    );
    modalBody.querySelector("[data-close]")?.addEventListener("click", closeModal);
    document.getElementById("saveLead").addEventListener("click", async () => {
      const name = document.getElementById("lName").value.trim();
      const email = document.getElementById("lEmail").value.trim();
      const message = document.getElementById("lMessage").value.trim();
      if (!name || !email || !message) {
        return toast("Nombre, email y mensaje son obligatorios", true);
      }
      try {
        await api("/api/admin/leads", {
          method: "POST",
          body: JSON.stringify({
            name,
            company: document.getElementById("lCompany").value,
            email,
            phone: document.getElementById("lPhone").value,
            service: document.getElementById("lService").value,
            status: document.getElementById("lStatus").value,
            message,
            notes: document.getElementById("lNotes").value,
            source: "manual",
          }),
        });
        toast("Lead creado");
        closeModal();
        loadLeads();
        loadDashboard();
      } catch (e) {
        toast(e.message, true);
      }
    });
  });

  // ----- Clients -----
  function openClientModal(client = null) {
    const isEdit = Boolean(client?.id);
    openModal(
      isEdit ? "Administrar cliente" : "Nuevo cliente",
      `
      <label>Nombre * <input id="cName" value="${esc(client?.name || "")}" required /></label>
      <label>Empresa <input id="cCompany" value="${esc(client?.company || "")}" /></label>
      <label>Email <input id="cEmail" type="email" value="${esc(client?.email || "")}" /></label>
      <label>Teléfono <input id="cPhone" value="${esc(client?.phone || "")}" /></label>
      <label>Dirección <input id="cAddress" value="${esc(client?.address || "")}" /></label>
      <label>Ciudad <input id="cCity" value="${esc(client?.city || "Cabo San Lucas")}" /></label>
      <label>Región <input id="cRegion" value="${esc(client?.region || "Baja California Sur")}" /></label>
      <label>Estado
        <select id="cStatus">
          ${["activo", "inactivo", "prospecto"]
            .map(
              (s) =>
                `<option value="${s}" ${
                  (client?.status || "activo") === s ? "selected" : ""
                }>${s}</option>`
            )
            .join("")}
        </select>
      </label>
      <label>Notas <textarea id="cNotes">${esc(client?.notes || "")}</textarea></label>
      ${
        isEdit
          ? `<p class="cell-sub">Proyectos vinculados: ${client.project_count ?? 0}. Al borrar el cliente se eliminan también sus proyectos.</p>`
          : ""
      }
      <div class="modal-actions">
        ${
          isEdit
            ? `<button type="button" class="btn-sm danger" id="deleteClientBtn">Borrar cliente</button>`
            : ""
        }
        <button type="button" class="btn-ghost" data-close>Cancelar</button>
        <button type="button" class="btn-primary" id="saveClient">${
          isEdit ? "Guardar cambios" : "Crear cliente"
        }</button>
      </div>
    `
    );
    modalBody.querySelector("[data-close]")?.addEventListener("click", closeModal);

    document.getElementById("saveClient").addEventListener("click", async () => {
      const name = document.getElementById("cName").value.trim();
      if (!name) return toast("Nombre requerido", true);
      const payload = {
        name,
        company: document.getElementById("cCompany").value,
        email: document.getElementById("cEmail").value,
        phone: document.getElementById("cPhone").value,
        address: document.getElementById("cAddress").value,
        city: document.getElementById("cCity").value,
        region: document.getElementById("cRegion").value,
        status: document.getElementById("cStatus").value,
        notes: document.getElementById("cNotes").value,
      };
      try {
        if (isEdit) {
          await api("/api/admin/clients", {
            method: "PATCH",
            body: JSON.stringify({ id: client.id, ...payload }),
          });
          toast("Cliente actualizado");
        } else {
          await api("/api/admin/clients", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          toast("Cliente creado");
        }
        closeModal();
        loadClients();
      } catch (e) {
        toast(e.message, true);
      }
    });

    document.getElementById("deleteClientBtn")?.addEventListener("click", async () => {
      const n = client.project_count ?? 0;
      const msg =
        n > 0
          ? `¿Borrar a ${client.name}? También se eliminarán ${n} proyecto(s) vinculados.`
          : `¿Borrar a ${client.name} de forma permanente?`;
      if (!confirm(msg)) return;
      try {
        await api("/api/admin/clients", {
          method: "DELETE",
          body: JSON.stringify({ id: client.id }),
        });
        toast("Cliente eliminado");
        closeModal();
        loadClients();
        cache.clients = [];
      } catch (e) {
        toast(e.message, true);
      }
    });
  }

  async function loadClients() {
    const { clients } = await api("/api/admin/clients");
    cache.clients = clients;
    const tbody = document.getElementById("clientsBody");
    if (!clients.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty">Sin clientes aún. Convierte un lead o crea uno manualmente.</td></tr>`;
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
        <td class="actions">
          <button type="button" class="btn-sm manage-client" data-id="${esc(c.id)}">Administrar</button>
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll(".manage-client").forEach((btn) => {
      btn.addEventListener("click", () => {
        const client = clients.find((x) => x.id === btn.dataset.id);
        if (client) openClientModal(client);
      });
    });
  }

  document.getElementById("newClientBtn").addEventListener("click", () => {
    openClientModal(null);
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
      tbody.innerHTML = `<tr><td colspan="6" class="empty">Sin proyectos</td></tr>`;
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
        <td class="actions">
          ${
            p.status === "cancelado"
              ? `<button type="button" class="btn-sm danger delete-project" data-id="${esc(p.id)}">Borrar</button>`
              : `<span class="cell-sub">—</span>`
          }
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
          loadProjects();
        } catch (e) {
          toast(e.message, true);
        }
      });
    });

    tbody.querySelectorAll(".delete-project").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Borrar este proyecto cancelado de forma permanente?")) return;
        try {
          await api("/api/admin/projects", {
            method: "DELETE",
            body: JSON.stringify({ id: btn.dataset.id }),
          });
          toast("Proyecto eliminado");
          loadProjects();
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

  // ----- Quotes -----
  let quoteLines = [];

  function pesosFromCents(cents) {
    return (Number(cents || 0) / 100).toFixed(2);
  }

  function renderQuoteLines() {
    const tbody = document.getElementById("quoteLinesBody");
    if (!tbody) return;
    if (!quoteLines.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty">Sin partidas. Genera con IA o agrega manualmente.</td></tr>`;
      updateQuoteTotals();
      return;
    }
    tbody.innerHTML = quoteLines
      .map(
        (line, i) => `
      <tr data-i="${i}">
        <td><input class="ql-desc" data-i="${i}" value="${esc(line.description)}" /></td>
        <td><input class="ql-qty" data-i="${i}" type="number" min="0" step="0.01" value="${esc(line.quantity)}" style="width:70px" /></td>
        <td><input class="ql-unit" data-i="${i}" value="${esc(line.unit || "servicio")}" style="width:80px" /></td>
        <td><input class="ql-price" data-i="${i}" type="number" min="0" step="0.01" value="${pesosFromCents(line.unit_price_cents)}" style="width:100px" /></td>
        <td class="cell-sub">${money(Math.round((Number(line.quantity) || 0) * (Number(line.unit_price_cents) || 0)))}</td>
        <td><button type="button" class="btn-sm danger ql-del" data-i="${i}">×</button></td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll(".ql-desc").forEach((el) => {
      el.addEventListener("input", () => {
        quoteLines[el.dataset.i].description = el.value;
      });
    });
    tbody.querySelectorAll(".ql-qty").forEach((el) => {
      el.addEventListener("input", () => {
        quoteLines[el.dataset.i].quantity = Number(el.value) || 0;
        renderQuoteLines();
      });
    });
    tbody.querySelectorAll(".ql-unit").forEach((el) => {
      el.addEventListener("input", () => {
        quoteLines[el.dataset.i].unit = el.value;
      });
    });
    tbody.querySelectorAll(".ql-price").forEach((el) => {
      el.addEventListener("change", () => {
        quoteLines[el.dataset.i].unit_price_cents = Math.round((Number(el.value) || 0) * 100);
        renderQuoteLines();
      });
    });
    tbody.querySelectorAll(".ql-del").forEach((btn) => {
      btn.addEventListener("click", () => {
        quoteLines.splice(Number(btn.dataset.i), 1);
        renderQuoteLines();
      });
    });
    updateQuoteTotals();
  }

  function updateQuoteTotals() {
    const subtotal = quoteLines.reduce(
      (s, l) => s + Math.round((Number(l.quantity) || 0) * (Number(l.unit_price_cents) || 0)),
      0
    );
    const tax = Math.round(subtotal * 0.16);
    const total = subtotal + tax;
    const el = document.getElementById("quoteTotals");
    if (el) {
      el.innerHTML = `
        <div><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
        <div><span>IVA (16%)</span><strong>${money(tax)}</strong></div>
        <div class="grand"><span>Total</span><strong>${money(total)}</strong></div>
      `;
    }
    return { subtotal, tax, total };
  }

  function showQuoteWorkspace(show) {
    document.getElementById("quoteWorkspace").hidden = !show;
    document.getElementById("quotesListPanel").hidden = show;
  }

  function resetQuoteForm() {
    document.getElementById("qEditId").value = "";
    document.getElementById("qAiModel").value = "";
    document.getElementById("qClientName").value = "";
    document.getElementById("qClientCompany").value = "";
    document.getElementById("qClientEmail").value = "";
    document.getElementById("qClientPhone").value = "";
    document.getElementById("qLocation").value = "Cabo San Lucas / San José del Cabo, BCS";
    document.getElementById("qService").value = "";
    document.getElementById("qJob").value = "";
    document.getElementById("qExtra").value = "";
    document.getElementById("qTitle").value = "";
    document.getElementById("qLabor").value = "";
    document.getElementById("qMaterials").value = "";
    document.getElementById("qConditions").value = "";
    document.getElementById("qStatus").value = "borrador";
    document.getElementById("quoteAiStatus").textContent = "";
    document.getElementById("quoteFormTitle").textContent = "Nueva cotización";
    quoteLines = [];
    renderQuoteLines();
  }

  async function loadQuotes() {
    const { quotes } = await api("/api/admin/quotes");
    const tbody = document.getElementById("quotesBody");
    if (!quotes.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty">Aún no hay cotizaciones. Crea una con IA o manualmente.</td></tr>`;
      return;
    }
    tbody.innerHTML = quotes
      .map(
        (q) => `
      <tr>
        <td>
          <div class="cell-title">${esc(q.title)}</div>
        </td>
        <td>
          <div class="cell-title">${esc(q.client_name)}</div>
          <div class="cell-sub">${esc(q.client_company || "")}</div>
        </td>
        <td>${esc(serviceLabels[q.service_type] || q.service_type || "—")}</td>
        <td>${money(q.total_cents)}</td>
        <td>${pill(q.status)}</td>
        <td class="cell-sub">${fmtDate(q.created_at)}</td>
        <td class="actions">
          <button type="button" class="btn-sm edit-quote" data-id="${esc(q.id)}">Editar</button>
          <button type="button" class="btn-sm print-quote" data-id="${esc(q.id)}">Imprimir</button>
          <button type="button" class="btn-sm danger del-quote" data-id="${esc(q.id)}">Borrar</button>
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll(".edit-quote").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const { quote } = await api(`/api/admin/quotes?id=${encodeURIComponent(btn.dataset.id)}`);
          openQuoteEditor(quote);
        } catch (e) {
          toast(e.message, true);
        }
      });
    });

    tbody.querySelectorAll(".print-quote").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const { quote } = await api(`/api/admin/quotes?id=${encodeURIComponent(btn.dataset.id)}`);
          printQuote(quote);
        } catch (e) {
          toast(e.message, true);
        }
      });
    });

    tbody.querySelectorAll(".del-quote").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Eliminar esta cotización?")) return;
        try {
          await api("/api/admin/quotes", {
            method: "DELETE",
            body: JSON.stringify({ id: btn.dataset.id }),
          });
          toast("Cotización eliminada");
          loadQuotes();
        } catch (e) {
          toast(e.message, true);
        }
      });
    });
  }

  function openQuoteEditor(quote) {
    showQuoteWorkspace(true);
    document.getElementById("quoteFormTitle").textContent = "Editar cotización";
    document.getElementById("qEditId").value = quote.id;
    document.getElementById("qAiModel").value = quote.ai_model || "";
    document.getElementById("qClientName").value = quote.client_name || "";
    document.getElementById("qClientCompany").value = quote.client_company || "";
    document.getElementById("qClientEmail").value = quote.client_email || "";
    document.getElementById("qClientPhone").value = quote.client_phone || "";
    document.getElementById("qService").value = quote.service_type || "";
    document.getElementById("qJob").value = quote.job_description || "";
    document.getElementById("qTitle").value = quote.title || "";
    document.getElementById("qLabor").value = quote.labor_notes || "";
    document.getElementById("qMaterials").value = quote.materials_notes || "";
    document.getElementById("qConditions").value = quote.conditions || "";
    document.getElementById("qStatus").value = quote.status || "borrador";
    const items = Array.isArray(quote.line_items) ? quote.line_items : [];
    quoteLines = items.map((it) => ({
      description: it.description || "",
      quantity: Number(it.quantity) || 1,
      unit: it.unit || "servicio",
      unit_price_cents: Number(it.unit_price_cents) || 0,
    }));
    renderQuoteLines();
  }

  function printQuote(q) {
    const items = Array.isArray(q.line_items) ? q.line_items : [];
    const logoUrl = `${window.location.origin}/assets/logo.png`;
    const quoteId = String(q.id || "").slice(0, 8).toUpperCase();
    const serviceName = serviceLabels[q.service_type] || q.service_type || "Servicios integrales";
    const rows = items
      .map(
        (it, i) => `
        <tr class="${i % 2 ? "alt" : ""}">
          <td class="col-desc">${esc(it.description)}</td>
          <td class="num">${esc(it.quantity)}</td>
          <td class="num">${esc(it.unit)}</td>
          <td class="num">${money(it.unit_price_cents)}</td>
          <td class="num strong">${money(
            it.total_cents ?? Math.round(Number(it.quantity) * Number(it.unit_price_cents))
          )}</td>
        </tr>`
      )
      .join("");

    const w = window.open("", "_blank");
    if (!w) {
      toast("Permite ventanas emergentes para imprimir", true);
      return;
    }

    w.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(q.title)} · Atlas</title>
  <style>
    @page { size: letter; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0b1d3a;
      background: #fff;
      font-size: 11.5px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { max-width: 800px; margin: 0 auto; padding: 8px 4px 24px; }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding-bottom: 16px;
      border-bottom: 3px solid #123056;
    }
    .brand-block { display: flex; align-items: center; gap: 14px; min-width: 0; }
    .logo {
      width: 78px; height: 78px;
      object-fit: contain;
      border-radius: 50%;
      background: #fff;
      border: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .brand-text strong {
      display: block;
      font-size: 18px;
      letter-spacing: 0.14em;
      color: #0b1d3a;
      line-height: 1.1;
    }
    .brand-text span {
      display: block;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #64748b;
      margin-top: 2px;
    }
    .brand-text em {
      display: block;
      font-style: normal;
      font-size: 10px;
      color: #1e4d8c;
      margin-top: 6px;
      max-width: 280px;
    }
    .doc-meta {
      text-align: right;
      flex-shrink: 0;
    }
    .doc-badge {
      display: inline-block;
      background: linear-gradient(135deg, #0b1d3a, #1e4d8c);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 8px 14px;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .doc-meta .ref { font-size: 11px; color: #475569; }
    .doc-meta .ref strong { color: #0b1d3a; }

    /* Title band */
    .title-band {
      margin: 18px 0 14px;
      padding: 14px 16px;
      background: linear-gradient(90deg, #f0f6ff 0%, #fff 70%);
      border-left: 4px solid #2563eb;
      border-radius: 0 8px 8px 0;
    }
    .title-band h1 {
      margin: 0 0 4px;
      font-size: 17px;
      color: #0b1d3a;
      font-weight: 700;
      line-height: 1.25;
    }
    .title-band p {
      margin: 0;
      color: #64748b;
      font-size: 11px;
    }

    /* Info grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      background: #fafbfc;
    }
    .card h3 {
      margin: 0 0 8px;
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #1e4d8c;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .card .row { margin: 3px 0; color: #334155; }
    .card .row b { color: #0b1d3a; font-weight: 600; }
    .scope {
      margin-bottom: 14px;
      padding: 12px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .scope h3 {
      margin: 0 0 6px;
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #1e4d8c;
    }
    .scope p { margin: 0; color: #334155; white-space: pre-wrap; }

    /* Table */
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0 8px;
      font-size: 11px;
    }
    table.items thead th {
      background: #0b1d3a;
      color: #fff;
      font-size: 9.5px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-weight: 600;
      padding: 9px 10px;
      text-align: left;
    }
    table.items thead th.num { text-align: right; }
    table.items tbody td {
      padding: 9px 10px;
      border-bottom: 1px solid #e8eef5;
      vertical-align: top;
      color: #1e293b;
    }
    table.items tbody tr.alt td { background: #f8fafc; }
    table.items .col-desc { width: 48%; }
    table.items .num { text-align: right; white-space: nowrap; }
    table.items .strong { font-weight: 600; color: #0b1d3a; }

    /* Totals */
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin: 8px 0 18px;
    }
    .totals {
      width: 260px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .totals .line {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      color: #475569;
      border-bottom: 1px solid #eef2f7;
    }
    .totals .line.grand {
      background: #0b1d3a;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      border-bottom: none;
      padding: 11px 12px;
    }

    /* Notes */
    .notes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .note-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      background: #fff;
    }
    .note-box.full { grid-column: 1 / -1; }
    .note-box h4 {
      margin: 0 0 6px;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #1e4d8c;
    }
    .note-box p {
      margin: 0;
      color: #475569;
      white-space: pre-wrap;
      font-size: 11px;
    }

    /* Footer */
    .footer {
      margin-top: 22px;
      padding-top: 12px;
      border-top: 2px solid #123056;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-end;
    }
    .footer .contact {
      font-size: 10.5px;
      color: #475569;
      line-height: 1.55;
    }
    .footer .contact strong {
      display: block;
      color: #0b1d3a;
      font-size: 11px;
      margin-bottom: 2px;
    }
    .footer .tagline {
      text-align: right;
      font-size: 10px;
      color: #64748b;
      max-width: 240px;
    }
    .footer .services {
      margin-top: 4px;
      font-size: 9px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #94a3b8;
    }

    @media print {
      body { padding: 0; }
      .page { padding: 0; max-width: none; }
    }
    @media (max-width: 640px) {
      .info-grid, .notes-grid { grid-template-columns: 1fr; }
      .header { flex-direction: column; align-items: flex-start; }
      .doc-meta { text-align: left; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <div class="brand-block">
        <img class="logo" src="${logoUrl}" alt="Atlas Facility Services" width="78" height="78" />
        <div class="brand-text">
          <strong>ATLAS</strong>
          <span>Facility Services</span>
          <em>HVAC · Eléctrico · Plomería · Pintura · Mantenimiento · Seguridad</em>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-badge">Cotización</div>
        <div class="ref"><strong>Folio:</strong> ATL-${esc(quoteId)}</div>
        <div class="ref"><strong>Fecha:</strong> ${fmtDay(q.created_at)}</div>
        <div class="ref"><strong>Vigencia:</strong> ${fmtDay(q.valid_until)}</div>
      </div>
    </header>

    <div class="title-band">
      <h1>${esc(q.title)}</h1>
      <p>Propuesta de servicios profesionales · ${esc(serviceName)}</p>
    </div>

    <div class="info-grid">
      <div class="card">
        <h3>Cliente</h3>
        <div class="row"><b>${esc(q.client_name)}</b></div>
        ${q.client_company ? `<div class="row">${esc(q.client_company)}</div>` : ""}
        ${q.client_email ? `<div class="row">${esc(q.client_email)}</div>` : ""}
        ${q.client_phone ? `<div class="row">${esc(q.client_phone)}</div>` : ""}
        ${q.client_address ? `<div class="row">${esc(q.client_address)}</div>` : ""}
      </div>
      <div class="card">
        <h3>Detalle del documento</h3>
        <div class="row"><b>Servicio:</b> ${esc(serviceName)}</div>
        <div class="row"><b>Moneda:</b> ${esc(q.currency || "MXN")}</div>
        <div class="row"><b>Estado:</b> ${esc(q.status || "borrador")}</div>
        <div class="row"><b>Zona:</b> Cabo San Lucas / San José del Cabo, BCS</div>
      </div>
    </div>

    ${
      q.job_description
        ? `<div class="scope"><h3>Alcance del trabajo</h3><p>${esc(q.job_description)}</p></div>`
        : ""
    }

    <table class="items">
      <thead>
        <tr>
          <th>Descripción</th>
          <th class="num">Cant.</th>
          <th class="num">Unidad</th>
          <th class="num">P. unitario</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5">Sin partidas</td></tr>`}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals">
        <div class="line"><span>Subtotal</span><span>${money(q.subtotal_cents)}</span></div>
        <div class="line"><span>IVA (16%)</span><span>${money(q.tax_cents)}</span></div>
        <div class="line grand"><span>Total</span><span>${money(q.total_cents)} ${esc(q.currency || "MXN")}</span></div>
      </div>
    </div>

    <div class="notes-grid">
      ${
        q.labor_notes
          ? `<div class="note-box"><h4>Mano de obra</h4><p>${esc(q.labor_notes)}</p></div>`
          : ""
      }
      ${
        q.materials_notes
          ? `<div class="note-box"><h4>Materiales</h4><p>${esc(q.materials_notes)}</p></div>`
          : ""
      }
      ${
        q.conditions
          ? `<div class="note-box full"><h4>Condiciones comerciales</h4><p>${esc(q.conditions)}</p></div>`
          : ""
      }
    </div>

    <footer class="footer">
      <div class="contact">
        <strong>Atlas Facility Services</strong>
        angeluis012@hotmail.com<br />
        +52 624 100 0381<br />
        Baja California Sur · Los Cabos
      </div>
      <div class="tagline">
        Soluciones integrales.<br />Resultados confiables.
        <div class="services">Documento generado por el sistema Atlas Admin</div>
      </div>
    </footer>
  </div>
  <script>
    window.onload = function () {
      var img = document.querySelector('.logo');
      function go() { setTimeout(function(){ window.print(); }, 150); }
      if (img && !img.complete) { img.onload = go; img.onerror = go; }
      else go();
    };
  <\/script>
</body>
</html>`);
    w.document.close();
  }

  document.getElementById("newQuoteBtn")?.addEventListener("click", () => {
    resetQuoteForm();
    showQuoteWorkspace(true);
  });
  document.getElementById("closeQuoteForm")?.addEventListener("click", () => showQuoteWorkspace(false));
  document.getElementById("cancelQuoteForm")?.addEventListener("click", () => {
    showQuoteWorkspace(false);
    resetQuoteForm();
  });
  document.getElementById("refreshQuotes")?.addEventListener("click", () =>
    loadQuotes().catch((e) => toast(e.message, true))
  );
  document.getElementById("addQuoteLine")?.addEventListener("click", () => {
    quoteLines.push({
      description: "",
      quantity: 1,
      unit: "servicio",
      unit_price_cents: 0,
    });
    renderQuoteLines();
  });

  document.getElementById("generateQuoteAi")?.addEventListener("click", async () => {
    const job = document.getElementById("qJob").value.trim();
    const clientName = document.getElementById("qClientName").value.trim();
    if (!job || job.length < 10) {
      return toast("Describe el trabajo con más detalle", true);
    }
    const btn = document.getElementById("generateQuoteAi");
    const status = document.getElementById("quoteAiStatus");
    btn.disabled = true;
    status.textContent = "Generando con IA…";
    try {
      const data = await api("/api/admin/quotes-generate", {
        method: "POST",
        body: JSON.stringify({
          job_description: job,
          client_name: clientName,
          client_company: document.getElementById("qClientCompany").value,
          service_type: document.getElementById("qService").value,
          location: document.getElementById("qLocation").value,
          extra_context: document.getElementById("qExtra").value,
        }),
      });
      const d = data.draft;
      document.getElementById("qTitle").value = d.title || "";
      document.getElementById("qLabor").value = d.labor_notes || "";
      document.getElementById("qMaterials").value = d.materials_notes || "";
      document.getElementById("qConditions").value = d.conditions || "";
      document.getElementById("qAiModel").value = d.ai_model || "";
      if (d.service_type && !document.getElementById("qService").value) {
        document.getElementById("qService").value = d.service_type;
      }
      quoteLines = (d.line_items || []).map((it) => ({
        description: it.description,
        quantity: Number(it.quantity) || 1,
        unit: it.unit || "servicio",
        unit_price_cents: Number(it.unit_price_cents) || 0,
      }));
      renderQuoteLines();
      status.textContent = "Listo. Revisa y ajusta las partidas.";
      toast("Cotización generada con IA");
    } catch (e) {
      status.textContent = "";
      toast(e.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("saveQuoteBtn")?.addEventListener("click", async () => {
    const clientName = document.getElementById("qClientName").value.trim();
    const title = document.getElementById("qTitle").value.trim();
    const job = document.getElementById("qJob").value.trim();
    if (!clientName || !title || !job) {
      return toast("Cliente, título y descripción son obligatorios", true);
    }
    if (!quoteLines.length) {
      return toast("Agrega al menos una partida", true);
    }
    const payload = {
      client_name: clientName,
      client_company: document.getElementById("qClientCompany").value,
      client_email: document.getElementById("qClientEmail").value,
      client_phone: document.getElementById("qClientPhone").value,
      service_type: document.getElementById("qService").value,
      title,
      job_description: job,
      line_items: quoteLines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_price_cents: l.unit_price_cents,
        total_cents: Math.round((Number(l.quantity) || 0) * (Number(l.unit_price_cents) || 0)),
      })),
      labor_notes: document.getElementById("qLabor").value,
      materials_notes: document.getElementById("qMaterials").value,
      conditions: document.getElementById("qConditions").value,
      status: document.getElementById("qStatus").value,
      ai_model: document.getElementById("qAiModel").value || null,
      tax_rate: 0.16,
    };
    const editId = document.getElementById("qEditId").value;
    try {
      if (editId) {
        await api("/api/admin/quotes", {
          method: "PATCH",
          body: JSON.stringify({ id: editId, ...payload }),
        });
        toast("Cotización actualizada");
      } else {
        await api("/api/admin/quotes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast("Cotización guardada");
      }
      showQuoteWorkspace(false);
      resetQuoteForm();
      loadQuotes();
    } catch (e) {
      toast(e.message, true);
    }
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
