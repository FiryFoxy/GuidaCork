const ProgramUI = (() => {
  let state = {
    loading: true,
    message: '',
    session: null,
    profile: null,
    approved: [],
    proposals: [],
    editing: null,
    adminOpen: false
  };
  let unsubscribe = null;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[ch]);

  const statusLabel = (status) => ({
    open: 'Bozza',
    approved: 'Approvata',
    closed: 'Chiusa',
    archived: 'Archiviata'
  })[status] || status;

  async function load(root, ctx) {
    state.loading = true;
    render(root, ctx, false);

    const cfg = await window.CorkSupabase.init();
    if (!cfg.ready) {
      state = { ...state, loading: false, message: cfg.error, session: null, profile: null, approved: [], proposals: [] };
      render(root, ctx, false);
      return;
    }

    if (!unsubscribe) unsubscribe = window.CorkSupabase.onAuthChange(() => load(root, ctx));

    try {
      state.session = await window.CorkSupabase.session();
      state.profile = state.session ? await window.CorkSupabase.profile() : null;

      if (state.session && state.profile?.role !== 'admin') {
        await window.CorkSupabase.signOut();
        state.session = null;
        state.profile = null;
        state.proposals = [];
        state.message = 'Accesso riservato agli admin.';
      } else {
        state.proposals = state.profile?.role === 'admin'
          ? await window.CorkSupabase.listProposals()
          : [];
      }

      state.approved = await window.CorkSupabase.listApprovedProgram();
      state.loading = false;
    } catch (error) {
      state.loading = false;
      state.message = error.message || 'Errore nel caricamento del programma';
    }

    render(root, ctx, false);
  }

  function render(root, ctx, shouldLoad = true) {
    if (!root) return;
    if (shouldLoad) {
      load(root, ctx);
      return;
    }

    if (state.loading) {
      root.innerHTML = `<div class="group-panel text-center text-gray-500">Caricamento programma...</div>`;
      return;
    }

    if (!window.CorkSupabase.state.ready) {
      root.innerHTML = renderSetupMissing();
      return;
    }

    root.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section class="lg:col-span-3 space-y-4">
          ${renderApprovedProgram(ctx)}
        </section>
        <aside class="lg:col-span-2 space-y-4">
          ${renderAdminBox(ctx)}
        </aside>
      </div>
    `;
    bind(root, ctx);
  }

  function renderSetupMissing() {
    return `
      <div class="group-panel">
        <h3 class="group-panel-title">Programma non collegato</h3>
        <p class="text-sm text-gray-600 mt-2">Supabase è pronto nel codice. Manca solo la chiave pubblica in <code>data/supabase-config.json</code>.</p>
      </div>
    `;
  }

  function renderApprovedProgram(ctx) {
    if (!state.approved.length) {
      return `
        <div class="group-empty">
          <h3 class="group-panel-title mb-2">Nessun programma approvato</h3>
          <p class="text-sm">Appena un admin approva un piano, comparira qui per tutti.</p>
        </div>
      `;
    }

    const byDate = {};
    state.approved.forEach(item => {
      if (!byDate[item.day_date]) byDate[item.day_date] = [];
      byDate[item.day_date].push(item);
    });

    return Object.keys(byDate).sort().map(date => `
      <div class="agenda-day">
        <h3 class="agenda-day-title">${ctx.formatDate(date)}</h3>
        <div class="space-y-3">
          ${byDate[date].map(item => renderProgramCard(item, ctx)).join('')}
        </div>
      </div>
    `).join('');
  }

  function renderProgramCard(item, ctx, admin = false) {
    const place = item.place_id ? ctx.placeById(item.place_id) : null;
    return `
      <article class="proposal-card ${item.status === 'approved' ? 'proposal-card--approved' : ''}">
        <div class="flex flex-wrap justify-between gap-2">
          <div>
            <h4 class="font-bold text-[#344E41] text-lg">${place?.icon ? esc(place.icon) + ' ' : ''}${esc(item.title)}</h4>
            <div class="proposal-meta">
              <span>${ctx.formatDate(item.day_date)}</span>
              ${item.location ? `<span>${esc(item.location)}</span>` : ''}
              ${admin ? `<span>${statusLabel(item.status)}</span>` : ''}
            </div>
          </div>
          <span class="proposal-badge">${admin ? statusLabel(item.status) : 'Scelto dagli admin'}</span>
        </div>
        ${item.description ? `<p class="text-sm text-gray-700 mt-2 leading-relaxed">${esc(item.description)}</p>` : ''}
        ${place?.url ? `<a href="${place.url}" target="_blank" rel="noopener" class="plan-link inline-block mt-3">Sito del luogo</a>` : ''}
        ${admin ? `
          <div class="proposal-actions">
            <button type="button" data-program-edit="${item.id}" class="btn-secondary text-xs">Modifica</button>
            ${item.status !== 'approved' ? `<button type="button" data-program-approve="${item.id}" class="btn-secondary text-xs">Approva nel programma</button>` : ''}
          </div>
        ` : ''}
      </article>
    `;
  }

  function renderAdminBox(ctx) {
    if (!state.adminOpen && state.profile?.role !== 'admin') {
      return `
        <div class="group-panel">
          <button type="button" id="program-admin-toggle" class="btn-secondary w-full">Accesso admin</button>
          ${state.message ? `<p class="text-sm text-red-600 mt-3">${esc(state.message)}</p>` : ''}
        </div>
      `;
    }

    return state.profile?.role === 'admin' ? renderAdminArea(ctx) : renderAdminLogin();
  }

  function renderAdminLogin() {
    return `
      <div class="group-panel">
        <div class="group-userbar">
          <div>
            <h3 class="group-panel-title">Accesso admin</h3>
            <p class="text-sm text-gray-600 mt-1">Solo gli admin possono modificare il programma ufficiale.</p>
          </div>
          <button type="button" id="program-admin-close" class="btn-secondary text-xs">Chiudi</button>
        </div>
        ${state.message ? `<p class="text-sm text-red-600 mt-2">${esc(state.message)}</p>` : ''}
        <form id="program-login-form" class="mt-4">
          <label class="field-label">Email</label>
          <input type="email" id="program-login-email" required class="field-input" placeholder="admin@email.it">
          <label class="field-label">Password</label>
          <input type="password" id="program-login-password" required minlength="6" class="field-input" placeholder="Password admin">
          <button type="submit" class="btn-primary mt-3 w-full">Accedi</button>
        </form>
      </div>
    `;
  }

  function renderAdminArea(ctx) {
    const open = state.proposals.filter(item => item.status !== 'archived');
    return `
      <div class="group-userbar">
        <div>
          <h3 class="group-panel-title">Pannello admin</h3>
          <p class="text-sm text-gray-600">${esc(state.profile.display_name || state.profile.email)}</p>
        </div>
        <button type="button" id="program-signout" class="btn-secondary text-xs">Esci</button>
      </div>
      ${renderProposalForm(ctx)}
      <div class="group-panel">
        <h4 class="group-panel-title">Piani admin</h4>
        <div class="space-y-3 mt-3">
          ${open.length ? open.map(item => renderProgramCard(item, ctx, true)).join('') : '<div class="group-empty">Nessun piano creato.</div>'}
        </div>
      </div>
    `;
  }

  function renderProposalForm(ctx) {
    const edit = state.editing;
    const dates = ctx.dates.map(d => `<option value="${d}" ${edit?.day_date === d ? 'selected' : ''}>${ctx.formatDate(d)}</option>`).join('');
    const placeOptions = ctx.places.map(place => `<option value="${esc(place.id)}" ${edit?.place_id === place.id ? 'selected' : ''}>${esc(place.icon)} ${esc(place.title)}</option>`).join('');
    return `
      <form id="program-proposal-form" class="group-panel">
        <h4 class="group-panel-title">${edit ? 'Modifica piano' : 'Nuovo piano'}</h4>
        <input type="hidden" id="program-proposal-id" value="${esc(edit?.id || '')}">
        <input type="hidden" id="program-proposal-status" value="${esc(edit?.status || 'open')}">
        <label class="field-label">Titolo</label>
        <input type="text" id="program-title" required class="field-input" value="${esc(edit?.title || '')}" placeholder="Es. Kinsale + cena in centro">
        <label class="field-label">Data</label>
        <select id="program-date" required class="field-input">${dates}</select>
        <label class="field-label">Luogo dalla guida</label>
        <select id="program-place" class="field-input">
          <option value="">Personalizzato</option>
          ${placeOptions}
        </select>
        <label class="field-label">Luogo libero</label>
        <input type="text" id="program-location" class="field-input" value="${esc(edit?.location || '')}" placeholder="Nome luogo o ritrovo">
        <label class="field-label">Descrizione</label>
        <textarea id="program-description" rows="4" class="field-input" placeholder="Orari, costi, idea della giornata...">${esc(edit?.description || '')}</textarea>
        <div class="flex flex-wrap gap-2 mt-3">
          <button type="submit" class="btn-primary">${edit ? 'Salva' : 'Crea piano'}</button>
          ${edit ? '<button type="button" id="program-cancel-edit" class="btn-secondary">Annulla</button>' : ''}
        </div>
      </form>
    `;
  }

  function bind(root, ctx) {
    root.querySelector('#program-admin-toggle')?.addEventListener('click', () => {
      state.adminOpen = true;
      render(root, ctx, false);
    });

    root.querySelector('#program-admin-close')?.addEventListener('click', () => {
      state.adminOpen = false;
      state.message = '';
      render(root, ctx, false);
    });

    root.querySelector('#program-login-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      await run(root, ctx, async () => {
        await window.CorkSupabase.signInWithPassword(
          root.querySelector('#program-login-email').value.trim(),
          root.querySelector('#program-login-password').value
        );
        const profile = await window.CorkSupabase.profile();
        if (profile?.role !== 'admin' || profile?.status !== 'active') {
          await window.CorkSupabase.signOut();
          throw new Error('Accesso riservato agli admin.');
        }
        state.message = '';
      });
    });

    root.querySelector('#program-signout')?.addEventListener('click', async () => {
      await run(root, ctx, () => window.CorkSupabase.signOut());
    });

    root.querySelector('#program-proposal-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const placeId = root.querySelector('#program-place').value;
      const place = placeId ? ctx.placeById(placeId) : null;
      await run(root, ctx, async () => {
        await window.CorkSupabase.saveProposal({
          id: root.querySelector('#program-proposal-id').value || null,
          title: root.querySelector('#program-title').value.trim(),
          day_date: root.querySelector('#program-date').value,
          place_id: placeId || null,
          location: root.querySelector('#program-location').value.trim() || place?.title || '',
          description: root.querySelector('#program-description').value.trim(),
          status: root.querySelector('#program-proposal-status').value || 'open'
        });
        state.editing = null;
        window.App?.showToast?.('Piano salvato');
      });
    });

    root.querySelector('#program-cancel-edit')?.addEventListener('click', () => {
      state.editing = null;
      render(root, ctx, false);
    });

    root.querySelectorAll('[data-program-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.editing = state.proposals.find(item => item.id === btn.dataset.programEdit) || null;
        render(root, ctx, false);
        root.querySelector('#program-proposal-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    root.querySelectorAll('[data-program-approve]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Aggiungere questo piano al programma ufficiale?')) return;
        await run(root, ctx, async () => {
          await window.CorkSupabase.approveProposal(btn.dataset.programApprove);
          window.App?.showToast?.('Programma aggiornato');
        });
      });
    });
  }

  async function run(root, ctx, action) {
    try {
      await action();
      await load(root, ctx);
    } catch (error) {
      state.message = error.message || 'Operazione non riuscita';
      window.App?.showToast?.(state.message);
      await load(root, ctx);
    }
  }

  function destroy() {
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
  }

  return { render, destroy };
})();

window.ProgramUI = ProgramUI;
window.GroupPlanningUI = ProgramUI;
