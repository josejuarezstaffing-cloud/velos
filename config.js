window.VELOS_CONFIG = {
  // Public browser configuration. Never use a Supabase service_role key here.
  supabaseUrl: "https://dmdwdmgqtskjfxkuujiw.supabase.co",
  supabaseAnonKey: "sb_publishable_GAB4g3KMYmI8N5SBgJx9ew_IxlSF76G"
};

// Brand title shown in browser tabs, bookmarks, and mobile app metadata.
document.title = 'Velos - For The Heavily Disciplined';
const titleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') || document.createElement('meta');
titleMeta.name = 'apple-mobile-web-app-title';
titleMeta.content = 'Velos - For The Heavily Disciplined';
if (!titleMeta.isConnected) document.head.append(titleMeta);

// Consistent upward-arrow space iconography. Only update changed text to avoid
// triggering the observer indefinitely on its own mutations.
const spaceIconStyles = document.createElement('style');
spaceIconStyles.textContent = `.space-icon,.discover-icon,.room-icon{color:#dedede!important;background:#171717!important;border-color:#333!important}`;
document.head.append(spaceIconStyles);
function applySpaceIcons() {
  document.querySelectorAll('.space-icon, .discover-icon, #room-icon').forEach(icon => {
    if (icon.textContent.trim() !== '↗') icon.textContent = '↗';
    icon.setAttribute('aria-hidden', 'true');
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applySpaceIcons, { once: true });
else applySpaceIcons();
new MutationObserver(applySpaceIcons).observe(document.body, { childList: true, subtree: true });

const stylesheets = [
  ['profile.css?v=4', 'profile-styles'],
  ['chat-avatar.css?v=3', 'chat-avatar-styles'],
  ['iphone.css?v=3', 'iphone-styles'],
  ['member-quick-card.css?v=1', 'member-quick-card-styles']
];
stylesheets.forEach(([href,id]) => {
  if (document.getElementById(id)) return;
  const link=document.createElement('link'); link.id=id; link.rel='stylesheet'; link.href=href; document.head.append(link);
});

document.addEventListener('DOMContentLoaded', () => {
  const profileScript = document.createElement('script');
  profileScript.src = 'profile.js?v=4';
  document.body.append(profileScript);
  const memberCardScript = document.createElement('script');
  memberCardScript.src = 'member-quick-card.js?v=1';
  document.body.append(memberCardScript);
}, { once: true });
