// Guest-first auth helper for FisikaSeru
// Rules:
// - Experiments are always accessible (no login required)
// - Login required ONLY for PDF export / saving history
// - PDF login gate must use a modal (no redirect page)
// - For PDF flow, use OAuth popup so the simulation page does not reload

const Auth = (() => {
  const LS_SESSION_ID = 'fs_sid';
  const LS_PENDING_ACTION = 'fs_pending_action';

  const state = {
    user: null,
    providers: { google: true, github: true },
  };

  function ensureSessionId() {
    let sid = localStorage.getItem(LS_SESSION_ID);
    if (!sid) {
      sid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
      localStorage.setItem(LS_SESSION_ID, sid);
    }
    return sid;
  }

  function getIdentityKey() {
    const sid = ensureSessionId();
    return state.user ? state.user.uid : `anon:${sid}`;
  }

  async function fetchMe() {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.authenticated ? data.user : null;
    } catch {
      return null;
    }
  }

  async function fetchAuthStatus() {
    try {
      const res = await fetch('/auth/status', { credentials: 'include' });
      if (res.ok) return await res.json();
    } catch {}
    return { google: true, github: true };
  }

  function prelimKey(simKey, identityKey = getIdentityKey()) {
    return `prelim:${identityKey}:${simKey}`;
  }

  function hasPrelim(simKey) {
    const data = localStorage.getItem(prelimKey(simKey));
    if (!data) return false;
    try {
      const obj = JSON.parse(data);
      if (simKey === 'millikan') {
        // v3: Millikan preliminary is a pre-test
        // Includes programStudy + university + written responses.
        const version = Number(obj.version || 0);
        const name = String(obj.studentName || '').trim();
        const nim = String(obj.studentNIM || '').trim();
        const programStudy = String(obj.programStudy || '').trim();
        const university = String(obj.university || '').trim();
        const variables = String(obj.variablesIdentification || '').trim();
        const hypothesis = String(obj.hypothesis || '').trim();
        const confirm = !!obj.understandingConfirm;

        if (version !== 3) return false;
        if (!name || /^\d+$/.test(name) || name.length < 3) return false;
        if (!nim) return false;
        if (!programStudy) return false;
        if (!university) return false;
        if (variables.length < 50) return false;
        if (hypothesis.length < 100) return false;
        if (!confirm) return false;
        return true;
      }

      // Default (legacy) preliminary schema for other simulations
      const name = String(obj.studentName || '').trim();
      const nim = String(obj.studentNIM || '').trim();
      const program = String(obj.programStudy || '').trim();
      const university = String(obj.university || '').trim();
      if (!name || /^\d+$/.test(name)) return false;
      if (!nim) return false;
      if (!program) return false;
      if (!university) return false;
      return true;
    } catch {
      return false;
    }
  }

  function migrateAnonToUserIfNeeded() {
    if (!state.user) return;
    const sid = ensureSessionId();
    const anonPrefix = `prelim:anon:${sid}:`;
    const userPrefix = `prelim:${state.user.uid}:`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(anonPrefix)) continue;
      const rest = key.slice(anonPrefix.length);
      const userKey = userPrefix + rest;
      if (!localStorage.getItem(userKey)) {
        localStorage.setItem(userKey, localStorage.getItem(key));
      }
    }
  }

  function openOAuthPopup(provider) {
    const width = 520;
    const height = 680;
    const left = Math.max(0, Math.floor((window.screen.width - width) / 2));
    const top = Math.max(0, Math.floor((window.screen.height - height) / 2));
    const url = provider === 'google'
      ? '/auth/google?popup=1'
      : '/auth/github?popup=1';

    const w = window.open(
      url,
      'fs_oauth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    if (!w) {
      // Popup blocked; fall back to full-page redirect (state is stored in localStorage)
      window.location.href = url.replace('popup=1', '');
      return null;
    }
    return w;
  }

  function waitForPopupAuth({ timeoutMs = 120000 } = {}) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Auth timeout'));
      }, timeoutMs);

      function onMessage(ev) {
        if (ev.origin !== window.location.origin) return;
        if (!ev.data || ev.data.type !== 'fs-auth-complete') return;
        cleanup();
        resolve(true);
      }

      function cleanup() {
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
      }

      window.addEventListener('message', onMessage);
    });
  }

  function ensureAuthModal() {
    let modal = document.getElementById('fsAuthGateModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'fsAuthGateModal';
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl border border-border shadow-xl w-full max-w-md p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-heading font-semibold text-text-primary">Login diperlukan</h3>
            <p id="fsAuthGateMessage" class="text-sm text-text-secondary mt-1">Untuk mengunduh atau menyimpan hasil eksperimen, silakan login terlebih dahulu.</p>
          </div>
          <button id="fsAuthGateClose" class="btn btn-ghost px-3 py-2">Tutup</button>
        </div>

        <div class="mt-5 flex gap-2">
          <button id="fsAuthGateGoogle" class="btn btn-primary rounded-lg px-4 py-2 flex-1">Login Google</button>
          <button id="fsAuthGateGitHub" class="btn btn-outline rounded-lg px-4 py-2 flex-1">Login GitHub</button>
        </div>

        <p id="fsAuthGateHint" class="text-xs text-text-tertiary mt-3"></p>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function showAuthModal({ message } = {}) {
    const modal = ensureAuthModal();
    const msg = modal.querySelector('#fsAuthGateMessage');
    const hint = modal.querySelector('#fsAuthGateHint');
    const btnClose = modal.querySelector('#fsAuthGateClose');
    const btnGoogle = modal.querySelector('#fsAuthGateGoogle');
    const btnGitHub = modal.querySelector('#fsAuthGateGitHub');

    if (msg && message) msg.textContent = message;
    if (hint) hint.textContent = '';

    // Hide providers if not configured
    if (btnGoogle) btnGoogle.style.display = state.providers.google ? '' : 'none';
    if (btnGitHub) btnGitHub.style.display = state.providers.github ? '' : 'none';

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const close = () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    };
    if (btnClose) btnClose.onclick = close;

    const onLogin = async (provider) => {
      try {
        if (hint) hint.textContent = 'Membuka jendela login...';
        localStorage.setItem(LS_PENDING_ACTION, localStorage.getItem(LS_PENDING_ACTION) || '');
        openOAuthPopup(provider);
        await waitForPopupAuth();
        state.user = await fetchMe();
        migrateAnonToUserIfNeeded();
        close();
        // Let caller resume via pending action handler
        window.dispatchEvent(new CustomEvent('fs-auth-changed', { detail: { user: state.user } }));
      } catch (e) {
        if (hint) hint.textContent = 'Login belum selesai. Coba lagi.';
      }
    };
    if (btnGoogle) btnGoogle.onclick = () => onLogin('google');
    if (btnGitHub) btnGitHub.onclick = () => onLogin('github');
  }

  function requireAuthForPdfExport(resumeFn) {
    return requireLogin(
      {
        action: 'pdf_export',
        message: 'Untuk mengunduh atau menyimpan hasil eksperimen, silakan login terlebih dahulu.',
      },
      resumeFn
    );
  }

  function requireLogin({ action, message }, resumeFn) {
    if (state.user) return resumeFn();
    const actionName = String(action || 'login').trim() || 'login';
    localStorage.setItem(LS_PENDING_ACTION, actionName);
    showAuthModal({ message });

    const handler = () => {
      window.removeEventListener('fs-auth-changed', handler);
      const pending = localStorage.getItem(LS_PENDING_ACTION);
      localStorage.removeItem(LS_PENDING_ACTION);
      if (pending === actionName) resumeFn();
    };
    window.addEventListener('fs-auth-changed', handler);
  }

  function loginGoogle() { window.location.href = '/auth/google'; }
  function loginGitHub() { window.location.href = '/auth/github'; }
  async function logout() {
    await fetch('/logout', { method: 'POST', credentials: 'include' });
    window.location.reload();
  }

  function beginMilikan() {
    // Guest-first: no login required
    if (!hasPrelim('millikan')) {
      window.location.href = '/pages/simulations/milikan/preliminary.html';
    } else {
      window.location.href = '/pages/simulations/milikan/index.html';
    }
  }

  function myLabs() {
    // Guest-first: hub is always accessible
    window.location.href = '/pages/simulations_hub.html';
  }

  function bindEvents() {
    const g = document.getElementById('loginGoogle');
    const gh = document.getElementById('loginGitHub');
    const b1 = document.getElementById('beginMilikan');
    const b2 = document.getElementById('beginMilikanMobile');
    const b3 = document.getElementById('beginMilikanCard');
    const myLabsBtn = document.getElementById('myLabsBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    if (g) g.onclick = loginGoogle;
    if (gh) gh.onclick = loginGitHub;
    if (logoutBtn) logoutBtn.onclick = logout;
    if (myLabsBtn) myLabsBtn.onclick = myLabs;
    [b1, b2, b3].forEach(b => { if (b) b.onclick = (e) => { e.preventDefault(); beginMilikan(); }; });
  }

  async function init() {
    ensureSessionId();
    state.providers = await fetchAuthStatus();
    state.user = await fetchMe();
    migrateAnonToUserIfNeeded();

    const authControls = document.getElementById('authControls');
    const userControls = document.getElementById('userControls');
    if (state.user && userControls) {
      userControls.style.display = 'flex';
      if (authControls) authControls.style.display = 'none';
      const avatarEl = document.getElementById('userAvatar');
      const nameEl = document.getElementById('userName');
      if (avatarEl && state.user.avatar) avatarEl.src = state.user.avatar;
      if (nameEl) nameEl.textContent = state.user.name || state.user.uid;
    } else if (authControls) {
      authControls.style.display = 'flex';
      // Hide buttons if provider not configured
      const g = document.getElementById('loginGoogle');
      const gh = document.getElementById('loginGitHub');
      if (g && !state.providers.google) g.style.display = 'none';
      if (gh && !state.providers.github) gh.style.display = 'none';
    }

    bindEvents();
  }

  return {
    init,
    state,
    ensureSessionId,
    getIdentityKey,
    prelimKey,
    hasPrelim,
    requireAuthForPdfExport,
    requireLogin,
    showAuthModal,
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
