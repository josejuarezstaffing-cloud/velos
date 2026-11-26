const DEMO_POSTS = [
  { id: 'demo-1', title: 'What’s a small tool you use every single day?', body: 'Not the obvious stuff like your editor or terminal. I mean the little utilities that quietly make your day better. What has earned a permanent spot in your workflow?', space: 'Engineering', score: 28, created_at: new Date(Date.now() - 12 * 60000).toISOString(), author: { display_name: 'Mika K.', username: 'mikak' }, comments: [{ count: 16 }] },
  { id: 'demo-2', title: 'Good design systems leave room for weird ideas', body: 'Consistency is useful, but a system that makes every screen feel the same isn’t doing its job. How do you keep a design system flexible enough for interesting edge cases?', space: 'Design', score: 19, created_at: new Date(Date.now() - 38 * 60000).toISOString(), author: { display_name: 'Jordan D.', username: 'jordand' }, comments: [{ count: 8 }] },
  { id: 'demo-3', title: 'Small models, surprisingly big results', body: 'I set up a local model this weekend expecting a fun experiment, and ended up using it to summarize a pile of notes. Happy to share the setup and honest benchmarks.', space: 'AI & ML', score: 42, created_at: new Date(Date.now() - 3600000).toISOString(), author: { display_name: 'Alex R.', username: 'alexr' }, comments: [{ count: 11 }] },
  { id: 'demo-4', title: 'How do you make time for learning when work gets busy?', body: 'I have a long list of things I want to learn, but the week fills up quickly. Would love to hear what actually works for you — especially small habits that stick.', space: 'Career', score: 7, created_at: new Date(Date.now() - 7200000).toISOString(), author: { display_name: 'Sam P.', username: 'samp' }, comments: [{ count: 0 }] },
  { id: 'demo-5', title: 'I made a little site that turns messy notes into a map', body: 'Three weekends, a lot of SVG, and a surprising amount of fun. You can connect ideas, add notes, and export everything as a single file. Would love some early feedback!', space: 'Show & Tell', score: 34, created_at: new Date(Date.now() - 10800000).toISOString(), author: { display_name: 'Priya N.', username: 'priyan' }, comments: [{ count: 9 }] }
];
const clientReady = Boolean(window.VELOS_CONFIG?.supabaseUrl && window.VELOS_CONFIG?.supabaseAnonKey && window.supabase);
const db = clientReady ? window.supabase.createClient(window.VELOS_CONFIG.supabaseUrl, window.VELOS_CONFIG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { user: null, posts: [], demo: !db, space: 'All', view: 'All', tab: 'All', query: '', offset: 0, pageSize: 20, hasMore: false, loading: false, selectedPost: null, toastTimer: null };
const escapeHTML = (text = '') => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const displayName = (post) => post.author?.display_name || 'Velos member';
const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'V';
const spaceStyle = (space) => ({ 'AI & ML': 'ai', Design: 'design', Career: 'career', 'Show & Tell': 'show' })[space] || 'eng';

function notify(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible');
  clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}
function relativeTime(value) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'just now'; if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24); return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function updateAccountUI() {
  const signedIn = Boolean(state.user);
  $('#header-signin').classList.toggle('hidden', signedIn);
  $('#header-signup').classList.toggle('hidden', signedIn);
  $('#user-avatar').classList.toggle('hidden', !signedIn);
  $('#composer-avatar').textContent = signedIn ? initials(state.user.user_metadata?.display_name || state.user.email) : 'V';
  $('#composer-input').textContent = signedIn ? `What’s on your mind, ${state.user.user_metadata?.display_name?.split(' ')[0] || 'there'}?` : 'Join the conversation — share an idea...';
  $('#setup-notice').classList.toggle('hidden', !state.demo);
  $('#hero-join').textContent = signedIn ? 'Create a post' : 'Join the conversation ↗';
  $('#header-signup').textContent = signedIn ? '' : 'Join Velos ↗';
  $('#user-avatar').textContent = signedIn ? initials(state.user.user_metadata?.display_name || state.user.email) : '';
}
function openAuth(mode = 'signup') {
  if (state.demo) return notify('Account sign-up becomes available after connecting the forum database.');
  setAuthMode(mode); $('#auth-modal').showModal();
}
function setAuthMode(mode) {
  const signup = mode === 'signup';
  $('#auth-title').textContent = signup ? 'Find your people.' : 'Welcome back.';
  $('#auth-intro').textContent = signup ? 'Join a community of people who love making things.' : 'Pick up where your conversations left off.';
  $('#name-field').classList.toggle('hidden', !signup);
  $('#auth-name').required = signup;
  $('#auth-password').autocomplete = signup ? 'new-password' : 'current-password';
  $('#auth-password').placeholder = signup ? 'At least 8 characters' : 'Your password';
  $('#auth-password').minLength = signup ? 8 : 1;
  $('#auth-submit').innerHTML = signup ? 'Create my account <span>↗</span>' : 'Log in <span>↗</span>';
  $$('.auth-switch button').forEach((button) => button.classList.toggle('active', button.dataset.authMode === mode));
  $('#auth-error').textContent = '';
}
function renderPost(post) {
  const author = displayName(post);
  const commentCount = post.comments?.[0]?.count ?? post.comment_count ?? 0;
  const vote = post.my_vote || 0;
  const card = document.createElement('article');
  card.className = 'post-card'; card.dataset.postId = post.id;
  card.innerHTML = `<div class="vote-rail"><button class="vote-button ${vote === 1 ? 'voted' : ''}" data-vote="1" aria-label="Upvote" title="Upvote">▲</button><strong>${Number(post.score || 0)}</strong><button class="vote-button ${vote === -1 ? 'downvoted' : ''}" data-vote="-1" aria-label="Downvote" title="Downvote">▼</button></div><div class="post-main"><div class="post-meta"><span class="space-badge ${spaceStyle(post.space)}">✳ ${escapeHTML(post.space)}</span><span>Posted by <b>${escapeHTML(author)}</b></span><span>· ${relativeTime(post.created_at)}</span></div><h3 class="post-title"><button class="post-open" type="button">${escapeHTML(post.title)}</button></h3>${post.body ? `<p class="post-body">${escapeHTML(post.body).replace(/\n/g, '<br>')}</p>` : ''}<div class="post-actions"><button class="post-action comments-open" type="button"><span>▱</span> ${commentCount} ${commentCount === 1 ? 'reply' : 'replies'}</button><button class="post-action share-post" type="button"><span>↗</span> Share</button><button class="post-action save-post ${post.saved ? 'saved' : ''}" type="button"><span>${post.saved ? '▣' : '♧'}</span> Save</button></div></div>`;
  return card;
}
function renderPosts() {
  const list = $('#post-list'); list.replaceChildren();
  const query = state.query.trim().toLowerCase();
  let posts = state.posts.filter((post) => {
    const spaceOK = state.space === 'All' || post.space === state.space;
    const queryOK = !query || `${post.title} ${post.body || ''} ${post.space} ${displayName(post)}`.toLowerCase().includes(query);
    const tabOK = state.tab !== 'Unanswered' || (post.comments?.[0]?.count ?? post.comment_count ?? 0) === 0;
    return spaceOK && queryOK && tabOK;
  });
  if (state.view === 'Popular' || $('#sort-select').value === 'popular') posts = [...posts].sort((a, b) => Number(b.score) - Number(a.score));
  posts.forEach((post) => list.append(renderPost(post)));
  $('#empty-state').classList.toggle('hidden', posts.length > 0 || state.loading);
  $('#feed-end').classList.toggle('hidden', posts.length === 0 || state.demo);
  $('#loading').classList.toggle('hidden', !state.loading);
  renderPopular();
}
function renderPopular() {
  const items = [...state.posts].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 3);
  const popular = $('#popular-list'); popular.replaceChildren();
  if (!items.length) { popular.innerHTML = '<p class="rail-loading">Start a conversation and it could be here.</p>'; return; }
  items.forEach((post, index) => {
    const link = document.createElement('button'); link.className = 'popular-item'; link.type = 'button';
    link.innerHTML = `<span class="popular-index">0${index + 1}</span><span class="popular-copy"><strong>${escapeHTML(post.title)}</strong><small>${escapeHTML(post.space)} <i>·</i> ${Number(post.score || 0)} votes</small></span><span class="popular-arrow">↗</span>`;
    link.addEventListener('click', () => openComments(post)); popular.append(link);
  });
}
async function loadPosts({ reset = true } = {}) {
  if (state.demo) { state.posts = [...DEMO_POSTS]; state.loading = false; renderPosts(); return; }
  if (state.loading) return;
  state.loading = true; if (reset) { state.offset = 0; state.posts = []; } renderPosts();
  let request = db.from('posts').select('id,title,body,space,score,created_at,author:profiles!posts_author_id_fkey(display_name,username),comments(count)').order('created_at', { ascending: false }).range(state.offset, state.offset + state.pageSize - 1);
  if (state.space !== 'All') request = request.eq('space', state.space);
  if (state.view === 'Popular' || $('#sort-select').value === 'popular') request = db.from('posts').select('id,title,body,space,score,created_at,author:profiles!posts_author_id_fkey(display_name,username),comments(count)').order('score', { ascending: false }).range(state.offset, state.offset + state.pageSize - 1);
  const { data, error } = await request;
  if (error) { state.loading = false; renderPosts(); notify(`Could not load posts: ${error.message}`); return; }
  const rows = data || [];
  if (state.user && rows.length) {
    const { data: votes } = await db.from('post_votes').select('post_id,value').in('post_id', rows.map((row) => row.id));
    const voteMap = new Map((votes || []).map((vote) => [vote.post_id, vote.value]));
    rows.forEach((post) => { post.my_vote = voteMap.get(post.id) || 0; });
  }
  state.posts = reset ? rows : [...state.posts, ...rows];
  state.hasMore = rows.length === state.pageSize; state.offset += rows.length; state.loading = false; renderPosts();
}
function setSpace(space) {
  state.space = space; state.view = 'All';
  $$('.space-link').forEach((link) => link.classList.toggle('selected', link.dataset.space === space));
  $('#feed-title').textContent = space === 'All' ? 'All discussions' : space;
  loadPosts(); closeMobileNav();
}
function setView(view) {
  state.view = view; state.space = 'All';
  $$('.space-link').forEach((link) => link.classList.toggle('selected', link.dataset.space === 'All'));
  $('#feed-title').textContent = view === 'Popular' ? 'Popular discussions' : view === 'Latest' ? 'Latest discussions' : 'All discussions';
  if (view === 'Following' && !state.user) { openAuth('login'); return; }
  loadPosts(); closeMobileNav(); $('#feed').scrollIntoView({ behavior: 'smooth' });
}
function closeMobileNav() { $('#sidebar').classList.remove('open'); $('#mobile-scrim').classList.remove('visible'); }
function openCompose() {
  if (state.demo) return notify('Connect the Supabase project to create your account and publish posts.');
  if (!state.user) return openAuth('signup');
  $('#post-error').textContent = ''; $('#compose-modal').showModal(); $('#post-title').focus();
}
async function signOut() {
  if (!db) return;
  const { error } = await db.auth.signOut(); if (error) return notify(error.message);
  state.user = null; updateAccountUI(); await loadPosts(); notify('You’re signed out. See you soon!');
}
function openComments(post) {
  state.selectedPost = post; $('#comments-title').textContent = post.title; $('#comments-content').innerHTML = '<div class="loading-state"><span class="spinner"></span> Loading replies…</div>';
  $('#comment-error').textContent = ''; $('#comments-modal').showModal(); loadComments(post);
}
async function loadComments(post) {
  if (state.demo) { $('#comments-content').innerHTML = '<p class="comment-empty">Replies will appear here when the community backend is connected.</p>'; return; }
  const { data, error } = await db.from('comments').select('id,body,created_at,author:profiles!comments_author_id_fkey(display_name)').eq('post_id', post.id).order('created_at');
  if (error) { $('#comments-content').textContent = error.message; return; }
  const container = $('#comments-content'); container.replaceChildren();
  if (!data?.length) { container.innerHTML = '<p class="comment-empty">No replies yet. You could be the first.</p>'; return; }
  data.forEach((comment) => { const item = document.createElement('article'); item.className = 'comment-item'; item.innerHTML = `<div class="comment-author"><span class="comment-avatar">${escapeHTML(initials(comment.author?.display_name || 'V'))}</span><strong>${escapeHTML(comment.author?.display_name || 'Velos member')}</strong><time>${relativeTime(comment.created_at)}</time></div><p>${escapeHTML(comment.body).replace(/\n/g, '<br>')}</p>`; container.append(item); });
}

$('#header-signup').addEventListener('click', () => openAuth('signup'));
$('#header-signin').addEventListener('click', () => openAuth('login'));
['hero-join', 'strip-join', 'sidebar-join', 'rail-join'].forEach((id) => $(`#${id}`).addEventListener('click', () => state.user ? openCompose() : openAuth('signup')));
$('#composer-open').addEventListener('click', openCompose); $('#composer-new').addEventListener('click', openCompose); $('#empty-create').addEventListener('click', openCompose); $('#mobile-create').addEventListener('click', openCompose);
$$('[data-close]').forEach((button) => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));
$$('.auth-switch button').forEach((button) => button.addEventListener('click', () => setAuthMode(button.dataset.authMode)));
$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault(); if (!db) return;
  const form = new FormData(event.currentTarget); const email = String(form.get('email')).trim(); const password = String(form.get('password')); const name = String(form.get('name') || '').trim(); const signup = !$('#name-field').classList.contains('hidden');
  const button = $('#auth-submit'); button.disabled = true; button.textContent = signup ? 'Creating account…' : 'Logging in…'; $('#auth-error').textContent = '';
  const result = signup ? await db.auth.signUp({ email, password, options: { data: { display_name: name } } }) : await db.auth.signInWithPassword({ email, password });
  button.disabled = false; button.innerHTML = signup ? 'Create my account <span>↗</span>' : 'Log in <span>↗</span>';
  if (result.error) { $('#auth-error').textContent = result.error.message; return; }
  if (signup && !result.data.session) { $('#auth-error').textContent = 'Check your email to confirm your account, then log in.'; return; }
  state.user = result.data.user; $('#auth-modal').close(); event.currentTarget.reset(); updateAccountUI(); await loadPosts(); notify(signup ? 'Welcome to Velos. You’re in!' : 'Welcome back!');
});
db?.auth.onAuthStateChange((_event, session) => { state.user = session?.user || null; updateAccountUI(); if (!state.demo) loadPosts(); });
$('#user-avatar').addEventListener('click', () => { if (confirm('Would you like to log out of Velos?')) signOut(); });
$('#post-form').addEventListener('submit', async (event) => {
  event.preventDefault(); if (!state.user || !db) return;
  const form = new FormData(event.currentTarget); const button = event.currentTarget.querySelector('[type=submit]'); button.disabled = true; $('#post-error').textContent = '';
  const { error } = await db.from('posts').insert({ author_id: state.user.id, title: String(form.get('title')).trim(), body: String(form.get('body') || '').trim(), space: String(form.get('space')) });
  button.disabled = false;
  if (error) { $('#post-error').textContent = error.message; return; }
  event.currentTarget.reset(); $('#compose-modal').close(); state.space = 'All'; state.view = 'All'; $('#feed-title').textContent = 'All discussions'; $$('.space-link').forEach((link) => link.classList.toggle('selected', link.dataset.space === 'All')); await loadPosts(); notify('Your post is live. Thanks for starting a conversation!');
});
$('#comment-form').addEventListener('submit', async (event) => {
  event.preventDefault(); if (!state.user) return openAuth('login');
  const body = $('#comment-input').value.trim(); const button = event.currentTarget.querySelector('[type=submit]'); button.disabled = true; $('#comment-error').textContent = '';
  const { error } = await db.from('comments').insert({ post_id: state.selectedPost.id, author_id: state.user.id, body }); button.disabled = false;
  if (error) { $('#comment-error').textContent = error.message; return; }
  event.currentTarget.reset(); await loadComments(state.selectedPost); await loadPosts(); notify('Reply posted. Thanks for contributing!');
});
$('#post-list').addEventListener('click', async (event) => {
  const card = event.target.closest('.post-card'); if (!card) return;
  const post = state.posts.find((item) => String(item.id) === card.dataset.postId); if (!post) return;
  if (event.target.closest('.post-open') || event.target.closest('.comments-open')) return openComments(post);
  if (event.target.closest('.share-post')) { try { await navigator.clipboard.writeText(`${location.origin}${location.pathname}#post-${post.id}`); notify('Link copied to clipboard.'); } catch { notify('Copy the page link to share this post.'); } return; }
  if (event.target.closest('.save-post')) { if (!state.user) return openAuth('login'); post.saved = !post.saved; event.target.closest('.save-post').classList.toggle('saved', post.saved); notify(post.saved ? 'Saved for later.' : 'Removed from saved posts.'); return; }
  const voteButton = event.target.closest('.vote-button'); if (!voteButton) return;
  if (!state.user) return openAuth('login');
  voteButton.disabled = true; const { data, error } = await db.rpc('toggle_post_vote', { p_post_id: post.id, p_value: Number(voteButton.dataset.vote) });
  if (error) { voteButton.disabled = false; return notify(error.message); }
  post.score = data; post.my_vote = Number(voteButton.dataset.vote) === post.my_vote ? 0 : Number(voteButton.dataset.vote); renderPosts();
});
$$('.space-link').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); setSpace(link.dataset.space); }));
$$('.nav-link').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); setView(link.dataset.view); }));
$$('[data-view="Popular"]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); setView('Popular'); }));
$$('.feed-tab').forEach((tab) => tab.addEventListener('click', () => { state.tab = tab.dataset.tab; $$('.feed-tab').forEach((item) => { const active = item === tab; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)); }); if (state.tab === 'Following' && !state.user) return openAuth('login'); renderPosts(); }));
$('#sort-select').addEventListener('change', () => loadPosts());
$('#search-input').addEventListener('input', (event) => { state.query = event.target.value; renderPosts(); });
document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search-input').focus(); } if (event.key === 'Escape') closeMobileNav(); });
$('#mobile-menu').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#mobile-scrim').classList.add('visible'); });
$('#sidebar-close').addEventListener('click', closeMobileNav); $('#mobile-scrim').addEventListener('click', closeMobileNav);
$('#mobile-popular').addEventListener('click', () => setView('Popular')); $('#mobile-home').addEventListener('click', () => setView('All'));
$('#mobile-spaces').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#mobile-scrim').classList.add('visible'); });
$('#mobile-account').addEventListener('click', () => state.user ? (confirm('Would you like to log out of Velos?') && signOut()) : openAuth('login'));
$('#spaces-info').addEventListener('click', () => notify('Choose a space to explore conversations by topic.'));
$('#search-input').addEventListener('search', (event) => { state.query = event.target.value; renderPosts(); });

async function start() {
  updateAccountUI();
  if (!db) { state.demo = true; $('#loading').classList.add('hidden'); await loadPosts(); return; }
  db.auth.getSession().then(({ data }) => { state.user = data.session?.user || null; updateAccountUI(); });
  await loadPosts();
}
start();
