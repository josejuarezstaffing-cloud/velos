const initialPosts = [
  { id: 1, name: 'Mika K.', initials: 'MK', color: 'person-a', badge: 'Community regular', time: '12 min ago', space: 'Engineering', title: 'What’s a small tool you use every single day?', body: 'Not the obvious stuff like your editor or terminal. I mean the little utilities that quietly make your day better. I just found <a href="#feed">a tiny clipboard manager</a> and it’s already earned a permanent spot in my workflow.', tags: ['productivity', 'tools'], likes: 28, replies: 16, liked: false, following: true, unanswered: false },
  { id: 2, name: 'Jordan D.', initials: 'JD', color: 'person-b', badge: 'Design systems', time: '38 min ago', space: 'Design', title: 'A reminder that good design systems leave room for weird ideas', body: 'Consistency is useful, but a system that makes every screen feel the same isn’t doing its job. How do you keep a design system flexible enough for the interesting edge cases?', tags: ['design', 'designsystems'], likes: 19, replies: 8, liked: false, following: false, unanswered: false },
  { id: 3, name: 'Alex R.', initials: 'AR', color: 'person-c', badge: 'Open source contributor', time: '1 hr ago', space: 'AI & ML', title: 'Ran a 3B model on my old laptop. It was… actually useful?', body: 'Set up a local model this weekend expecting a fun experiment, and ended up using it to summarize a pile of notes. Sharing the setup and a few honest benchmarks if anyone’s interested.', tags: ['opensource', 'localai'], likes: 42, replies: 11, liked: false, following: true, unanswered: false },
  { id: 4, name: 'Sam P.', initials: 'SP', color: 'person-d', badge: 'Just joined', time: '2 hrs ago', space: 'Career', title: 'How do you make time for learning when work gets busy?', body: 'I have a long list of things I want to learn, but the week fills up quickly. Would love to hear what actually works for you — especially small habits that stick.', tags: ['learning', 'careers'], likes: 7, replies: 0, liked: false, following: false, unanswered: true },
  { id: 5, name: 'Priya N.', initials: 'PN', color: 'person-e', badge: 'Builder', time: '3 hrs ago', space: 'Show & Tell', title: 'I made a little site that turns messy notes into a map', body: 'Three weekends, a lot of SVG, and a surprising amount of fun. You can connect ideas, add notes, and export everything as a single file. Would love some early feedback!', tags: ['sideproject', 'webdev'], likes: 34, replies: 9, liked: false, following: false, unanswered: false }
];
let posts = [...initialPosts];
let activeSpace = 'All';
let activeTab = 'All';
let toastTimer;
const postList = document.querySelector('#post-list');
const searchInput = document.querySelector('#search-input');
const sortSelect = document.querySelector('#sort-select');
const emptyState = document.querySelector('#empty-state');
const dialog = document.querySelector('#post-dialog');
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function spaceClass(space) {
  return ({ 'AI & ML': 'space-ai', Design: 'space-design', Career: 'space-career', 'Show & Tell': 'space-show' })[space] || '';
}
function renderPosts() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = posts.filter((post) => {
    const inSpace = activeSpace === 'All' || activeSpace === 'Latest' || post.space === activeSpace;
    const inTab = activeTab === 'All' || (activeTab === 'Following' ? post.following : post.unanswered);
    const matches = !query || `${post.name} ${post.title} ${post.body.replace(/<[^>]*>/g, '')} ${post.space} ${post.tags.join(' ')}`.toLowerCase().includes(query);
    return inSpace && inTab && matches;
  });
  if (sortSelect.value === 'popular') visible.sort((a, b) => b.likes + b.replies - a.likes - a.replies);
  postList.innerHTML = visible.map((post) => `<article class="post-card" data-post-id="${post.id}">
    <div class="post-top"><span class="avatar ${escapeHTML(post.color)}">${escapeHTML(post.initials)}</span><div class="post-author"><strong>${escapeHTML(post.name)}</strong><span class="author-badge">${escapeHTML(post.badge)}</span><span class="post-time">· ${escapeHTML(post.time)}</span></div><button class="post-menu" aria-label="More options for ${escapeHTML(post.title)}" type="button">···</button></div>
    <span class="post-space ${spaceClass(post.space)}">${escapeHTML(post.space)}</span><h3><a href="#post-${post.id}">${escapeHTML(post.title)}</a></h3>
    <p class="post-excerpt">${post.body}</p><div class="post-tags">${post.tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join('')}</div>
    <div class="post-footer"><button class="post-action like-button ${post.liked ? 'liked' : ''}" type="button" aria-label="${post.liked ? 'Unlike' : 'Like'} this post"><span class="action-icon">${post.liked ? '♥' : '♡'}</span><span>${post.likes}</span></button><button class="post-action post-replies" type="button"><span class="action-icon">▱</span><span>${post.replies ? `${post.replies} ${post.replies === 1 ? 'reply' : 'replies'}` : 'Be the first to reply'}</span></button><button class="post-action bookmark-button ${post.bookmarked ? 'bookmarked' : ''}" type="button" aria-label="${post.bookmarked ? 'Remove bookmark' : 'Bookmark post'}"><span class="action-icon">${post.bookmarked ? '▣' : '♧'}</span></button></div>
  </article>`).join('');
  emptyState.hidden = visible.length > 0;
  document.querySelector('#load-more').hidden = visible.length === 0;
}
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}
function setSpace(space) {
  activeSpace = space;
  document.querySelectorAll('.space-link').forEach((link) => link.classList.toggle('selected', link.dataset.filter === space));
  const title = space === 'All' ? 'All discussions' : space === 'Latest' ? 'Latest discussions' : space;
  document.querySelector('#feed-title').textContent = title;
  renderPosts();
}

document.querySelectorAll('.space-link').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); setSpace(link.dataset.filter); closeMobileNav(); }));
document.querySelectorAll('[data-filter="Latest"]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); setSpace('Latest'); document.querySelector('#feed').scrollIntoView({ behavior: 'smooth' }); }));
document.querySelectorAll('.feed-tab').forEach((tab) => tab.addEventListener('click', () => {
  activeTab = tab.dataset.tab;
  document.querySelectorAll('.feed-tab').forEach((item) => { const selected = item === tab; item.classList.toggle('active', selected); item.setAttribute('aria-selected', String(selected)); });
  renderPosts();
}));
searchInput.addEventListener('input', renderPosts);
sortSelect.addEventListener('change', renderPosts);
document.querySelector('#clear-search').addEventListener('click', () => { searchInput.value = ''; activeSpace = 'All'; activeTab = 'All'; document.querySelectorAll('.feed-tab').forEach((tab) => { const selected = tab.dataset.tab === 'All'; tab.classList.toggle('active', selected); tab.setAttribute('aria-selected', String(selected)); }); setSpace('All'); });
postList.addEventListener('click', (event) => {
  const card = event.target.closest('.post-card');
  if (!card) return;
  const post = posts.find((item) => item.id === Number(card.dataset.postId));
  if (!post) return;
  if (event.target.closest('.like-button')) { post.liked = !post.liked; post.likes += post.liked ? 1 : -1; renderPosts(); }
  else if (event.target.closest('.bookmark-button')) { post.bookmarked = !post.bookmarked; renderPosts(); showToast(post.bookmarked ? 'Saved to your bookmarks' : 'Removed from bookmarks'); }
  else if (event.target.closest('.post-replies')) showToast('Replies are ready for the next conversation.');
  else if (event.target.closest('.post-menu')) showToast('Thanks for helping keep Velos welcoming.');
});
function openComposer() { dialog.showModal(); document.querySelector('#post-title').focus(); }
document.querySelectorAll('#open-composer, #mobile-compose').forEach((button) => button.addEventListener('click', openComposer));
document.querySelector('#new-post-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const spaceValue = String(data.get('space'));
  const space = spaceValue === 'AI & ML' ? 'AI & ML' : spaceValue === 'Show & Tell' ? 'Show & Tell' : spaceValue;
  posts.unshift({ id: Date.now(), name: 'Jamie L.', initials: 'JL', color: 'avatar-you', badge: 'You', time: 'just now', space, title: String(data.get('title')).trim(), body: escapeHTML(String(data.get('body') || '').trim()), tags: [], likes: 0, replies: 0, liked: false, following: true, unanswered: true });
  form.reset(); dialog.close(); activeSpace = 'All'; activeTab = 'All'; searchInput.value = '';
  document.querySelectorAll('.feed-tab').forEach((tab) => { const selected = tab.dataset.tab === 'All'; tab.classList.toggle('active', selected); tab.setAttribute('aria-selected', String(selected)); });
  setSpace('All'); postList.scrollIntoView({ behavior: 'smooth', block: 'start' }); showToast('Your post is live. Thanks for starting a conversation!');
});
document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchInput.focus(); } });
const sidebar = document.querySelector('.left-sidebar');
const scrim = document.querySelector('.sidebar-scrim');
function closeMobileNav() { sidebar.classList.remove('is-open'); scrim.classList.remove('visible'); }
document.querySelector('.mobile-menu-button').addEventListener('click', () => { sidebar.classList.add('is-open'); scrim.classList.add('visible'); });
document.querySelector('.mobile-nav-close').addEventListener('click', closeMobileNav);
scrim.addEventListener('click', closeMobileNav);
document.querySelectorAll('.trend-item').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); searchInput.value = link.querySelector('strong').textContent.split(' ').slice(0, 3).join(' '); renderPosts(); }));
renderPosts();
