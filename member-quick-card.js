// Member quick card for chat avatars. Render immediately from the message row,
// then enrich with the current profile/points when the Supabase lookup completes.
(() => {
  const cfg = window.VELOS_CONFIG;
  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || !window.supabase) return;
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const escapeHTML = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials = name => String(name || 'V').trim().split(/\s+/).slice(0,2).map(p => p[0] || '').join('').toUpperCase() || 'V';
  let activeAnchor = null;
  let request = 0;

  function getCard() {
    let card = document.getElementById('member-quick-card');
    if (!card) {
      card = document.createElement('section');
      card.id = 'member-quick-card'; card.className = 'member-quick-card hidden';
      card.setAttribute('role','dialog'); card.setAttribute('aria-label','Member profile');
      document.body.append(card);
    }
    return card;
  }
  function position(card, anchor) {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 24);
    card.style.width = `${width}px`;
    card.style.left = `${Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2))}px`;
    const height = card.offsetHeight;
    card.style.top = `${rect.bottom + height + 12 <= window.innerHeight ? rect.bottom + 10 : Math.max(12, rect.top - height - 10)}px`;
  }
  function close() {
    const card = getCard(); card.classList.add('hidden'); activeAnchor = null; request += 1;
  }
  function showMember(card, member, fallbackName, fallbackUsername) {
    const name = member?.display_name || fallbackName || 'Velos member';
    const avatar = member?.avatar_url ? `<img src="${escapeHTML(member.avatar_url)}" alt="">` : escapeHTML(initials(name));
    const username = member?.username ? `@${escapeHTML(member.username)}` : escapeHTML(fallbackUsername || 'Velos member');
    const points = member ? Number(member.points || 0).toLocaleString() : '—';
    card.innerHTML = `<div class="member-card-top"><div class="member-card-avatar">${avatar}</div><div class="member-card-name"><strong>${escapeHTML(name)}</strong><span>${username}</span></div><button class="member-card-close" type="button" aria-label="Close member card">×</button></div><div class="member-card-score"><span>✳</span><strong>${points}</strong><small>Velos points</small></div>`;
    card.querySelector('.member-card-close').addEventListener('click', event => { event.stopPropagation(); close(); });
  }
  async function open(anchor) {
    const card = getCard();
    if (activeAnchor === anchor && !card.classList.contains('hidden')) { close(); return; }
    activeAnchor = anchor;
    const thisRequest = ++request;
    const row = anchor.closest('.message');
    const fallbackName = row?.querySelector('.message-meta strong')?.textContent?.trim() || 'Velos member';
    const fallbackUsername = row?.querySelector('.message-username')?.textContent?.trim() || '';

    // Show a real popover right away; never leave the user waiting for the network.
    showMember(card, null, fallbackName, fallbackUsername);
    card.classList.remove('hidden'); position(card, anchor);

    try {
      let authorId = anchor.dataset.authorId || row?.dataset.authorId;
      const messageId = row?.dataset.messageId;
      if (!authorId && messageId) {
        const { data: message } = await db.from('messages').select('author_id').eq('id', messageId).maybeSingle();
        authorId = message?.author_id;
      }
      if (!authorId) return;
      const { data: member, error } = await db.from('profiles').select('user_id,display_name,username,avatar_url,points').eq('user_id', authorId).maybeSingle();
      if (thisRequest !== request || activeAnchor !== anchor) return;
      if (member && !error) showMember(card, member, fallbackName, fallbackUsername);
      position(card, anchor);
    } catch (error) {
      // Keep the immediate name/username popover usable if profile data is unavailable.
      if (thisRequest === request && activeAnchor === anchor) position(card, anchor);
      console.warn('Could not load member profile card:', error);
    }
  }
  function findAvatar(target) { return target instanceof Element ? target.closest('.message-avatar') : null; }
  function enhance(root = document) {
    if (root.matches?.('.message-avatar')) root = root.parentElement || document;
    root.querySelectorAll?.('.message-avatar').forEach(avatar => {
      avatar.setAttribute('role','button'); avatar.setAttribute('tabindex','0');
      const name = avatar.closest('.message')?.querySelector('.message-meta strong')?.textContent?.trim() || 'member';
      avatar.setAttribute('aria-label', `View ${name}'s profile`);
    });
  }
  enhance();
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) enhance(node);
  }))).observe(document.body, { childList: true, subtree: true });

  // Window capture runs before legacy document listeners, which previously consumed
  // these clicks as account-menu actions and left the message-avatar card unopened.
  window.addEventListener('click', event => {
    const avatar = findAvatar(event.target);
    if (avatar) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); open(avatar); return; }
    const card = document.getElementById('member-quick-card');
    if (card && !card.contains(event.target)) close();
  }, true);
  window.addEventListener('keydown', event => {
    const avatar = findAvatar(event.target);
    if (avatar && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); open(avatar); return; }
    if (event.key === 'Escape') close();
  }, true);
  window.addEventListener('resize', () => { if (activeAnchor) position(getCard(), activeAnchor); });
  window.addEventListener('scroll', close, true);
})();
