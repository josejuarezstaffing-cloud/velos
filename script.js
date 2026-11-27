const SPACES = [
  { id: 'artificial-intelligence', name: 'Artificial Intelligence', icon: '↗', tone: 'ai', description: 'Ideas, tools, and the future of intelligent machines.' },
  { id: 'careers', name: 'Careers', icon: '↗', tone: 'career', description: 'Work, growth, interviews, and finding your next move.' },
  { id: 'fitness', name: 'Fitness', icon: '↗', tone: 'fitness', description: 'Training, health, and the habits that keep us moving.' },
  { id: 'investing', name: 'Investing', icon: '↗', tone: 'investing', description: 'Long-term thinking about markets, money, and risk.' },
  { id: 'prediction-markets', name: 'Prediction Markets', icon: '↗', tone: 'prediction', description: 'Forecasts, probabilities, and what the crowd thinks.' },
  { id: 'trading', name: 'Trading', icon: '↗', tone: 'trading', description: 'Strategies, market structure, and trading tools.' }
];
const DEMO_MESSAGES = {
  'artificial-intelligence': [
    { id: 'demo-ai-1', body: 'Welcome to the AI space 👋 What are you experimenting with this week?', created_at: new Date(Date.now() - 48 * 60000).toISOString(), author: { display_name: 'Mika K.' } },
    { id: 'demo-ai-2', body: 'I have been testing small language models locally. The quality jump in the last few months is wild.', created_at: new Date(Date.now() - 41 * 60000).toISOString(), author: { display_name: 'Jordan D.' } },
    { id: 'demo-ai-3', body: 'Same here! Quantized models on a laptop are finally useful for real workflows, not just demos.', created_at: new Date(Date.now() - 35 * 60000).toISOString(), author: { display_name: 'Alex R.' } }
  ],
  careers: [{ id: 'demo-career-1', body: 'What’s one career lesson you wish you had learned earlier?', created_at: new Date(Date.now() - 35 * 60000).toISOString(), author: { display_name: 'Sam P.' } }],
  fitness: [{ id: 'demo-fit-1', body: 'Checking in: what movement did you get in today?', created_at: new Date(Date.now() - 27 * 60000).toISOString(), author: { display_name: 'Priya N.' } }],
  investing: [{ id: 'demo-invest-1', body: 'How do you keep a long-term perspective when markets get noisy?', created_at: new Date(Date.now() - 64 * 60000).toISOString(), author: { display_name: 'Mika K.' } }],
  'prediction-markets': [{ id: 'demo-prediction-1', body: 'Which public forecast are you following this week, and what would change your mind?', created_at: new Date(Date.now() - 52 * 60000).toISOString(), author: { display_name: 'Jordan D.' } }],
  trading: [{ id: 'demo-trading-1', body: 'Good risk management beats a clever entry. What rules keep you disciplined?', created_at: new Date(Date.now() - 30 * 60000).toISOString(), author: { display_name: 'Alex R.' } }]
};
const clientReady = Boolean(window.VELOS_CONFIG?.supabaseUrl && window.VELOS_CONFIG?.supabaseAnonKey && window.supabase);
const db = clientReady ? window.supabase.createClient(window.VELOS_CONFIG.supabaseUrl, window.VELOS_CONFIG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { user: null, activeSpace: null, homeView: true, messages: [], demo: !db, channel: null, toastTimer: null };
const escapeHTML = (text = '') => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const initials = (name = 'Velos member') => name.split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || 'V';
const messageProfileFields = 'display_name,username,avatar_url';

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
function renderSpaces() {
  const side = $('#space-list'); const discover = $('#discover-spaces');
  if (side) side.replaceChildren(); if (discover) discover.replaceChildren();
  SPACES.forEach(space => {
    if (side) {
      const link = document.createElement('a'); link.href = '#chat'; link.className = `space-link ${space.tone}`; link.dataset.spaceId = space.id;
      link.innerHTML = `<i class="space-icon ${space.tone}">${space.icon}</i><span>${escapeHTML(space.name)}</span><span class="space-arrow">↗</span>`;
      link.addEventListener('click', event => { event.preventDefault(); openSpace(space); }); side.append(link);
    }
    if (discover) {
      const card = document.createElement('button'); card.type = 'button'; card.className = `discover-space ${space.tone}`; card.dataset.spaceId = space.id;
      card.innerHTML = `<span class="discover-icon ${space.tone}">${space.icon}</span><span class="discover-copy"><strong>${escapeHTML(space.name)}</strong><small>${escapeHTML(space.description)}</small></span><span class="discover-arrow">→</span>`;
      card.addEventListener('click', () => openSpace(space)); discover.append(card);
    }
  });
}
function updateAccountUI() {
  const signedIn = Boolean(state.user);
  $('#header-signin').classList.toggle('hidden', signedIn); $('#header-signup').classList.toggle('hidden', signedIn);
  $('#user-avatar')?.classList.toggle('hidden', !signedIn);
  if (!signedIn) $('#user-avatar').textContent = '';
  $('#setup-notice')?.classList.toggle('hidden', !state.demo);
  $('#message-input').placeholder = signedIn && state.activeSpace ? `Message ${state.activeSpace.name}…` : 'Choose a space to join the conversation…';
  $('#composer-hint').textContent = signedIn ? (state.homeView ? 'Choose a space to start chatting' : 'Press Enter to send · Shift + Enter for a new line') : 'Join Velos to chat in this space';
}
function setAuthMode(mode) {
  const signup = mode === 'signup';
  $('#auth-title').textContent = signup ? 'Find your people.' : 'Welcome back.';
  $('#auth-intro').textContent = signup ? 'Join the conversation in every Velos space.' : 'Log in and jump back into your spaces.';
  $('#name-field').classList.toggle('hidden', !signup); $('#auth-name').required = signup;
  $('#auth-password').autocomplete = signup ? 'new-password' : 'current-password'; $('#auth-password').placeholder = signup ? 'At least 8 characters' : 'Your password'; $('#auth-password').minLength = signup ? 8 : 1;
  $('#auth-submit').innerHTML = signup ? 'Create my account <span>↗</span>' : 'Log in <span>↗</span>';
  $$('.auth-switch button').forEach(button => button.classList.toggle('active', button.dataset.authMode === mode)); $('#auth-error').textContent = '';
}
function openAuth(mode = 'signup') {
  if (state.demo) return notify('Accounts and shared chat need the Supabase chat setup first.');
  setAuthMode(mode); $('#auth-modal').showModal();
}
function avatarHTML(profile, name) {
  if (profile?.avatar_url) return `<img src="${escapeHTML(profile.avatar_url)}" alt="${escapeHTML(name)} profile picture">`;
  return escapeHTML(initials(name));
}
function renderMessages() {
  const list = $('#message-list');
  if (!list) return;
  const query = $('#search-input').value.trim().toLowerCase();
  const messages = state.messages.filter(message => !query || `${message.body} ${message.author?.display_name || ''} ${message.author?.username || ''}`.toLowerCase().includes(query));
  list.replaceChildren();
  messages.forEach(message => {
    const author = message.author?.display_name || 'Velos member';
    const username = message.author?.username ? `@${message.author.username}` : '';
    const mine = state.user && message.author_id === state.user.id;
    const row = document.createElement('article'); row.className = `message ${mine ? 'mine' : ''}`; row.dataset.messageId = message.id;
    row.innerHTML = `<div class="message-avatar">${avatarHTML(message.author, author)}</div><div class="message-content"><div class="message-meta"><strong>${escapeHTML(author)}</strong>${username ? `<span class="message-username">${escapeHTML(username)}</span>` : ''}<time datetime="${escapeHTML(message.created_at)}">${escapeHTML(relativeTime(message.created_at))}</time></div><p>${escapeHTML(message.body).replace(/\n/g, '<br>')}</p></div>`;
    list.append(row);
  });
  $('#empty-room')?.classList.toggle('hidden', messages.length > 0);
  list.scrollTop = list.scrollHeight;
}
function stopRealtime() { if (state.channel) { db?.removeChannel(state.channel); state.channel = null; } }
function listenToSpace(space) {
  if (!db) return; stopRealtime();
  state.channel = db.channel(`space:${space.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `space_id=eq.${space.id}` }, async payload => {
    const { data } = await db.from('messages').select(`id,space_id,author_id,body,created_at,author:profiles!messages_author_id_fkey(${messageProfileFields})`).eq('id', payload.new.id).single();
    if (data && state.activeSpace?.id === space.id && !state.messages.some(item => item.id === data.id)) { state.messages.push(data); renderMessages(); }
  }).subscribe();
}
async function loadMessages(space) {
  state.messages = [];
  if (state.demo) { state.messages = [...(DEMO_MESSAGES[space.id] || [])]; renderMessages(); return; }
  $('#message-list').innerHTML = '<div class="loading-state"><span class="spinner"></span> Loading the conversation…</div>';
  const { data, error } = await db.from('messages').select(`id,space_id,author_id,body,created_at,author:profiles!messages_author_id_fkey(${messageProfileFields})`).eq('space_id', space.id).order('created_at', { ascending: true }).limit(100);
  if (error) { $('#message-list').replaceChildren(); renderMessages(); notify(`Could not load messages: ${error.message}`); return; }
  state.messages = data || []; renderMessages(); listenToSpace(space);
}
function showHome() {
  stopRealtime();
  state.homeView = true; state.activeSpace = null;
  $$('.space-link').forEach(link => link.classList.remove('selected'));
  const welcome = $('.chat-welcome');
  if (welcome) welcome.classList.remove('hidden');
  const roomHeader = $('.room-header');
  if (roomHeader) roomHeader.classList.add('hidden');
  const composer = $('#message-form');
  if (composer) composer.classList.add('hidden');
  const messageArea = $('.message-area');
  if (messageArea) messageArea.classList.add('hidden');

  let homeMenu = $('#home-space-menu');
  if (!homeMenu) {
    homeMenu = document.createElement('section'); homeMenu.id = 'home-space-menu'; homeMenu.className = 'home-space-menu';
    $('.chat-main')?.append(homeMenu);
  }
  homeMenu.classList.remove('hidden');
  homeMenu.innerHTML = `<div class="home-menu-heading"><p class="section-kicker">CHOOSE YOUR SPACE</p><h2>Where do you want to start?</h2><p>Select a chat room and join the conversation.</p></div><div class="home-space-grid">${SPACES.map(space => `<button type="button" class="home-space-card" data-space-id="${space.id}"><span class="home-space-icon">${space.icon}</span><span class="home-space-copy"><strong>${escapeHTML(space.name)}</strong><small>${escapeHTML(space.description)}</small></span><span class="home-space-arrow">→</span></button>`).join('')}</div>`;
  homeMenu.querySelectorAll('[data-space-id]').forEach(card => card.addEventListener('click', () => openSpace(SPACES.find(space => space.id === card.dataset.spaceId))));
  updateAccountUI(); closeMobileNav();
}
function openSpace(space) {
  state.homeView = false; state.activeSpace = space;
  $('#home-space-menu')?.classList.add('hidden');
  $('.chat-welcome')?.classList.add('hidden');
  const roomHeader = $('.room-header'); roomHeader?.classList.remove('hidden');
  $('#message-form')?.classList.remove('hidden');
  $('.message-area')?.classList.remove('hidden');
  $$('.space-link').forEach(link => link.classList.toggle('selected', link.dataset.spaceId === space.id));
  $('#room-title').textContent = space.name; $('#room-description').textContent = space.description;
  $('#room-icon').textContent = space.icon; $('#room-icon').className = `room-icon ${space.tone}`;
  loadMessages(space); updateAccountUI(); closeMobileNav();
}
function closeMobileNav() { $('#sidebar')?.classList.remove('open'); $('#mobile-scrim')?.classList.remove('visible'); }
async function sendMessage() {
  if (!db || state.demo) return notify('Connect the Supabase chat tables to send shared messages.');
  if (!state.user) return openAuth('login');
  if (!state.activeSpace) return showHome();
  const input = $('#message-input'); const body = input.value.trim(); if (!body) return;
  const button = $('#message-form').querySelector('[type=submit]'); button.disabled = true;
  const { data, error } = await db.from('messages').insert({ space_id: state.activeSpace.id, author_id: state.user.id, body }).select(`id,space_id,author_id,body,created_at,author:profiles!messages_author_id_fkey(${messageProfileFields})`).single();
  button.disabled = false;
  if (error) { notify(`Message could not be sent: ${error.message}`); return; }
  input.value = ''; input.style.height = 'auto';
  if (!state.messages.some(message => message.id === data.id)) { state.messages.push(data); renderMessages(); }
}
async function signOut() {
  if (!db) return;
  const { error } = await db.auth.signOut(); if (error) return notify(error.message);
  state.user = null; updateAccountUI(); showHome(); notify('You’re signed out. See you soon!');
}

$('#header-signup')?.addEventListener('click', () => openAuth('signup'));
$('#header-signin')?.addEventListener('click', () => openAuth('login'));
if (!document.querySelector('#account-menu')) $('#user-avatar')?.addEventListener('click', () => { if (confirm('Would you like to log out of Velos?')) signOut(); });
$$('.auth-switch button').forEach(button => button.addEventListener('click', () => setAuthMode(button.dataset.authMode)));
$$('[data-close]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));
$('#auth-form')?.addEventListener('submit', async event => {
  event.preventDefault(); if (!db) return;
  const form = new FormData(event.currentTarget); const email = String(form.get('email')).trim(); const password = String(form.get('password')); const name = String(form.get('name') || '').trim(); const signup = !$('#name-field').classList.contains('hidden');
  const button = $('#auth-submit'); button.disabled = true; button.textContent = signup ? 'Creating account…' : 'Logging in…'; $('#auth-error').textContent = '';
  const result = signup ? await db.auth.signUp({ email, password, options: { data: { display_name: name } } }) : await db.auth.signInWithPassword({ email, password });
  button.disabled = false; button.innerHTML = signup ? 'Create my account <span>↗</span>' : 'Log in <span>↗</span>';
  if (result.error) { $('#auth-error').textContent = result.error.message; return; }
  if (signup && !result.data.session) { $('#auth-error').textContent = 'Check your email to confirm your account, then log in.'; return; }
  state.user = result.data.user; $('#auth-modal').close(); event.currentTarget.reset(); updateAccountUI(); showHome(); notify(signup ? 'Welcome to Velos!' : 'Welcome back!');
});
db?.auth.onAuthStateChange((_event, session) => { state.user = session?.user || null; updateAccountUI(); if (state.user && state.homeView) showHome(); else if (!state.user) showHome(); });
$('#message-form')?.addEventListener('submit', event => { event.preventDefault(); sendMessage(); });
$('#message-input')?.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } });
$('#message-input')?.addEventListener('input', event => { event.target.style.height = 'auto'; event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`; });
$('#emoji-button')?.addEventListener('click', () => { const input = $('#message-input'); if (state.activeSpace) { input.value += ' 👋'; input.focus(); } else showHome(); });
$('#search-input')?.addEventListener('input', renderMessages);
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search-input').focus(); } if (event.key === 'Escape') closeMobileNav(); });
$('#mobile-menu')?.addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#mobile-scrim').classList.add('visible'); });
$('#sidebar-close')?.addEventListener('click', closeMobileNav); $('#mobile-scrim')?.addEventListener('click', closeMobileNav);
$('#mobile-account')?.addEventListener('click', () => state.user ? showHome() : openAuth('login'));
$('#room-info')?.addEventListener('click', () => state.activeSpace ? notify(state.activeSpace.description) : showHome());
$('#home-link')?.addEventListener('click', event => { event.preventDefault(); showHome(); });

document.addEventListener('velos:profile-updated', event => {
  const profile = event.detail;
  if (!profile || !state.user || profile.user_id !== state.user.id) return;
  state.messages = state.messages.map(message => message.author_id === state.user.id ? { ...message, author: { ...message.author, display_name: profile.display_name, username: profile.username, avatar_url: profile.avatar_url } } : message);
  renderMessages();
});

async function start() {
  renderSpaces(); updateAccountUI();
  if (db) { const { data } = await db.auth.getSession(); state.user = data.session?.user || null; }
  updateAccountUI(); showHome();
}
start();
