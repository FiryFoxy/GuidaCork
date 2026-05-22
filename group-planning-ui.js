const GroupPlanningUI = (() => {
  let state = {
    loading: true,
    message: '',
    session: null,
    profile: null,
    proposals: [],
    editing: null
  };
  let unsubscribe = null;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[ch]);

  function statusLabel(status) {
    return {
      open: 'Aperta',
      approved: 'Approvata',
      closed: 'Chiusa',
      archived: 'Archiviata'
    }[status] || status;
  }

  function voteLabel(vote) {
    return { yes: 'Si', maybe: 'Forse', no: 'No' }[vote] || 'Non votato';
  }

  async function load(root, ctx) {
    state.loading = true;
    render(root, ctx, false);
    const cfg = await window.CorkSupabase.init();
    if (!cfg.ready) {
      state = { ...state, loading: false, message: cfg.error, session: null, profile: null, proposals: [] };
      render(root, ctx, false);
      return;
    }

    if (!unsubscribe) unsubscribe = window.CorkSupabase.onAuthChange(() => load(root, ctx));

    try {
      state.session = await window.CorkSupabase.session();
      state.profile = state.session ? await window.CorkSupabase.profile() : null;
      state.proposals = state.profile?.status === 'active'
        ? await window.CorkSupabase.listProposals()
        : [];
      state.loading = false;
      state.message = '';
    } catch (error) {
      state.loading = false;
      state.message = error.message || 'Errore nel caricamento';
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
      root.innerHTML = `<div class="group-panel text-center text-gray-500">Caricamento planning di gruppo...</div>`;
      return;
    }

    if (!window.CorkSupabase.state.ready) {
      root.innerHTML = renderSetupMissing();
      bind(root, ctx);
      return;
    }

    if (!state.session) {
      root.innerHTML = renderLogin();
      bind(root, ctx);
      return;
    }

    if (!state.profile || state.profile.status !== 'active') {
      root.innerHTML = renderBlocked();
      bind(root, ctx);
      return;
    }

    root.innerHTML = renderApp(ctx);
    bind(root, ctx);
  }

  function renderSetupMissing() {
    return `
      <div class="group-panel">
        <h3 class="group-panel-title">Planning di gruppo</h3>
        <p class="text-sm text-gray-600 mt-2">Supabase e pronto nel codice. Manca solo la chiave pubblica in <code>data/supabase-config.json</code>.</p>
        <p class="text-xs text-gray-500 mt-2">La password del database non va inserita nel frontend.</p>
      </div>
    `;
  }

  function renderLogin() {
    return `
      <div class="group-panel max-w-xl">
        <h3 class="group-panel-title">Planning di gruppo</h3>
        <p class="text-sm text-gray-600 mt-2">Entra con l'email invitata e una password per proporre giornate e votare in forma aggregata.</p>
        ${state.message ? `<p class="text-sm text-red-600 mt-2">${esc(state.message)}</p>` : ''}
        <form id="group-login-form" class="mt-4">
          <label class="field-label">Email</label>
          <input type="email" id="group-login-email" required class="field-input" placeholder="nome@email.it">
          <label class="field-label">Password</label>
          <input type="password" id="group-login-password" required minlength="6" class="field-input" placeholder="Minimo 6 caratteri">
          <button type="submit" class="btn-primary mt-3">Accedi</button>
          <button type="button" id="group-magic-link" class="btn-secondary mt-3 ml-2">Ricevi link email</button>
          <p class="text-xs text-gray-500 mt-2">Al primo accesso, se l'email e invitata, viene creato l'account.</p>
        </form>
      </div>
    `;
  }

  function renderBlocked() {
    return `
      <div class="group-panel">
        <div class="group-userbar">
          <div>
            <h3 class="group-panel-title">Accesso non attivo</h3>
            <p class="text-sm text-gray-600 mt-1">${esc(state.session.user.email)} non risulta ancora tra gli invitati attivi.</p>
          </div>
          <button type="button" id="group-signout" class="btn-secondary text-xs">Esci</button>
        </div>
      </div>
    `;
  }

  function renderApp(ctx) {
    const p = state.profile;
    const approved = state.proposals.filter(x => x.status === 'approved');
    const created = state.proposals.filter(x => x.can_edit).length;
    const missingVote = state.proposals.filter(x => x.status === 'open' && !x.my_vote).length;

    return `
      <div class="group-userbar">
        <div>
          <h3 class="text-2xl font-bold text-[#344E41] serif-font">Planning di gruppo</h3>
          <p class="text-sm text-gray-600">${esc(p.display_name || p.email)} · ${p.role === 'admin' ? 'Admin' : 'Utente invitato'}</p>
        </div>
        <button type="button" id="group-signout" class="btn-secondary text-xs">Esci</button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <aside class="lg:col-span-2 space-y-4">
          <div class="group-panel">
            <div class="group-kpis">
              <div class="group-kpi"><strong>${state.proposals.length}</strong><span>Proposte</span></div>
              <div class="group-kpi"><strong>${missingVote}</strong><span>Da votare</span></div>
              <div class="group-kpi"><strong>${approved.length}</strong><span>Finali</span></div>
            </div>
          </div>
          ${renderProposalForm(ctx)}
          ${p.role === 'admin' ? renderAdminPanel() : ''}
        </aside>

        <section class="lg:col-span-3 space-y-4">
          ${approved.length ? renderApproved(approved, ctx) : ''}
          ${renderPersonalBox(created, missingVote)}
          ${renderProposalList(ctx)}
        </section>
      </div>
    `;
  }

  function renderProposalForm(ctx) {
    const edit = state.editing;
    const dates = ctx.dates.map(d => `<option value="${d}" ${edit?.day_date === d ? 'selected' : ''}>${ctx.formatDate(d)}</option>`).join('');
    const placeOptions = ctx.places.map(place => `<option value="${esc(place.id)}" ${edit?.place_id === place.id ? 'selected' : ''}>${esc(place.icon)} ${esc(place.title)}</option>`).join('');
    return `
      <form id="group-proposal-form" class="group-panel">
        <h4 class="group-panel-title">${edit ? 'Modifica proposta' : 'Nuova proposta'}</h4>
        <input type="hidden" id="group-proposal-id" value="${esc(edit?.id || '')}">
        <label class="field-label">Titolo</label>
        <input type="text" id="group-title" required class="field-input" value="${esc(edit?.title || '')}" placeholder="Es. Kinsale + cena in centro">
        <label class="field-label">Data</label>
        <select id="group-date" required class="field-input">${dates}</select>
        <label class="field-label">Luogo dalla guida</label>
        <select id="group-place" class="field-input">
          <option value="">Personalizzato</option>
          ${placeOptions}
        </select>
        <label class="field-label">Luogo libero</label>
        <input type="text" id="group-location" class="field-input" value="${esc(edit?.location || '')}" placeholder="Nome luogo o ritrovo">
        <label class="field-label">Descrizione</label>
        <textarea id="group-description" rows="4" class="field-input" placeholder="Orari, costi, idea della giornata...">${esc(edit?.description || '')}</textarea>
        <div class="flex flex-wrap gap-2 mt-3">
          <button type="submit" class="btn-primary">${edit ? 'Salva modifiche' : 'Proponi'}</button>
          ${edit ? '<button type="button" id="group-cancel-edit" class="btn-secondary">Annulla</button>' : ''}
        </div>
      </form>
    `;
  }

  function renderAdminPanel() {
    return `
      <form id="group-invite-form" class="group-panel">
        <h4 class="group-panel-title">Invita utente</h4>
        <label class="field-label">Email</label>
        <input type="email" id="group-invite-email" required class="field-input" placeholder="email da invitare">
        <label class="field-label">Ruolo</label>
        <select id="group-invite-role" class="field-input">
          <option value="user">Utente</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" class="btn-secondary mt-3">Aggiungi invito</button>
        <p class="text-xs text-gray-500 mt-2">L'invitato potra accedere con email e password dalla schermata qui sopra.</p>
      </form>
    `;
  }

  function renderApproved(items, ctx) {
    return `
      <div class="group-panel">
        <h4 class="group-panel-title">Planning finale approvato</h4>
        <div class="space-y-2 mt-3">
          ${items.map(item => renderProposalCard(item, ctx, true)).join('')}
        </div>
      </div>
    `;
  }

  function renderPersonalBox(created, missingVote) {
    return `
      <div class="group-panel">
        <h4 class="group-panel-title">La tua vista</h4>
        <p class="text-sm text-gray-600 mt-1">Hai ${created} propost${created === 1 ? 'a modificabile' : 'e modificabili'} e ${missingVote} vot${missingVote === 1 ? 'o' : 'i'} ancora da dare o riconfermare.</p>
      </div>
    `;
  }

  function renderProposalList(ctx) {
    const items = state.proposals.filter(x => x.status !== 'approved');
    if (!items.length) return `<div class="group-empty">Non ci sono ancora proposte aperte.</div>`;
    return items.map(item => renderProposalCard(item, ctx)).join('');
  }

  function renderProposalCard(item, ctx, compact = false) {
    const place = item.place_id ? ctx.placeById(item.place_id) : null;
    const canAdmin = state.profile?.role === 'admin';
    const changed = item.current_version > 1 && !item.my_vote;
    return `
      <article class="proposal-card ${item.status === 'approved' ? 'proposal-card--approved' : ''}">
        <div class="flex flex-wrap justify-between gap-2">
          <div>
            <h4 class="font-bold text-[#344E41] text-lg">${place?.icon ? esc(place.icon) + ' ' : ''}${esc(item.title)}</h4>
            <div class="proposal-meta">
              <span>${ctx.formatDate(item.day_date)}</span>
              ${item.location ? `<span>${esc(item.location)}</span>` : ''}
              <span>v${item.current_version}</span>
              <span>${esc(item.created_by_name || 'Gruppo')}</span>
            </div>
          </div>
          <span class="proposal-badge">${statusLabel(item.status)}</span>
        </div>
        ${item.description ? `<p class="text-sm text-gray-700 mt-2 leading-relaxed">${esc(item.description)}</p>` : ''}
        ${changed ? `<p class="text-xs text-[#D97757] font-bold mt-2">Modificata dopo alcuni voti: riconferma la tua scelta.</p>` : ''}
        <div class="vote-counts">
          <div class="vote-count"><strong>${item.yes_count || 0}</strong><br>Si</div>
          <div class="vote-count"><strong>${item.maybe_count || 0}</strong><br>Forse</div>
          <div class="vote-count"><strong>${item.no_count || 0}</strong><br>No</div>
        </div>
        ${compact ? '' : `
          <div class="vote-row">
            ${['yes', 'maybe', 'no'].map(v => `<button type="button" data-group-vote="${item.id}" data-vote="${v}" class="vote-btn ${item.my_vote === v ? 'vote-btn--active' : ''}">${voteLabel(v)}</button>`).join('')}
          </div>
          <div class="proposal-actions">
            ${item.can_edit ? `<button type="button" data-group-edit="${item.id}" class="btn-secondary text-xs">Modifica</button>` : ''}
            ${canAdmin && item.status === 'open' ? `<button type="button" data-group-approve="${item.id}" class="btn-secondary text-xs">Approva finale</button>` : ''}
          </div>
        `}
      </article>
    `;
  }

  function bind(root, ctx) {
    root.querySelector('#group-login-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      await run(root, ctx, async () => {
        const result = await window.CorkSupabase.signInWithPassword(
          root.querySelector('#group-login-email').value.trim(),
          root.querySelector('#group-login-password').value
        );
        state.message = result === 'confirmation-sent'
          ? "Account creato: controlla la tua email per confermare l'accesso."
          : '';
      });
    });

    root.querySelector('#group-magic-link')?.addEventListener('click', async () => {
      await run(root, ctx, async () => {
        await window.CorkSupabase.signIn(root.querySelector('#group-login-email').value.trim());
        state.message = 'Controlla la tua email: ti abbiamo inviato il link di accesso.';
      });
    });

    root.querySelector('#group-signout')?.addEventListener('click', async () => {
      await run(root, ctx, () => window.CorkSupabase.signOut());
    });

    root.querySelector('#group-proposal-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const placeId = root.querySelector('#group-place').value;
      const place = placeId ? ctx.placeById(placeId) : null;
      await run(root, ctx, async () => {
        await window.CorkSupabase.saveProposal({
          id: root.querySelector('#group-proposal-id').value || null,
          title: root.querySelector('#group-title').value.trim(),
          day_date: root.querySelector('#group-date').value,
          place_id: placeId || null,
          location: root.querySelector('#group-location').value.trim() || place?.title || '',
          description: root.querySelector('#group-description').value.trim()
        });
        state.editing = null;
        window.App?.showToast?.('Proposta salvata');
      });
    });

    root.querySelector('#group-cancel-edit')?.addEventListener('click', () => {
      state.editing = null;
      render(root, ctx, false);
    });

    root.querySelector('#group-invite-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      await run(root, ctx, async () => {
        await window.CorkSupabase.invite(
          root.querySelector('#group-invite-email').value.trim(),
          root.querySelector('#group-invite-role').value
        );
        window.App?.showToast?.('Invito registrato');
      });
    });

    root.querySelectorAll('[data-group-vote]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const item = state.proposals.find(x => x.id === btn.dataset.groupVote);
        if (!item) return;
        await run(root, ctx, async () => {
          await window.CorkSupabase.vote({
            proposal_id: item.id,
            current_version: item.current_version,
            vote: btn.dataset.vote
          });
          window.App?.showToast?.('Voto salvato');
        });
      });
    });

    root.querySelectorAll('[data-group-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.editing = state.proposals.find(x => x.id === btn.dataset.groupEdit) || null;
        render(root, ctx, false);
        root.querySelector('#group-proposal-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    root.querySelectorAll('[data-group-approve]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Approvare questa proposta come planning finale?')) return;
        await run(root, ctx, async () => {
          await window.CorkSupabase.approveProposal(btn.dataset.groupApprove);
          window.App?.showToast?.('Planning finale approvato');
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
      render(root, ctx, false);
    }
  }

  function destroy() {
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
  }

  return { render, destroy };
})();

window.GroupPlanningUI = GroupPlanningUI;
