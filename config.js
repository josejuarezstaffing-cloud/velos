window.VELOS_CONFIG = {
  // Public browser configuration. Never use a Supabase service_role key here.
  supabaseUrl: "https://dmdwdmgqtskjfxkuujiw.supabase.co",
  supabaseAnonKey: "sb_publishable_GAB4g3KMYmI8N5SBgJx9ew_IxlSF76G"
};

document.title = 'Velos - For The Heavily Disciplined';
const titleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') || document.createElement('meta');
titleMeta.name = 'apple-mobile-web-app-title';
titleMeta.content = 'Velos - For The Heavily Disciplined';
if (!titleMeta.isConnected) document.head.append(titleMeta);

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

[
  ['profile.css?v=5', 'profile-styles'],
  ['chat-avatar.css?v=4', 'chat-avatar-styles'],
  ['iphone.css?v=4', 'iphone-styles'],
  ['responsive.css?v=2', 'responsive-styles'],
  ['member-quick-card.css?v=2', 'member-quick-card-styles']
].forEach(([href,id]) => {
  let link=document.getElementById(id);
  if (!link) { link=document.createElement('link'); link.id=id; link.rel='stylesheet'; document.head.append(link); }
  link.href=href;
});

document.addEventListener('DOMContentLoaded', () => {
  const profileScript = document.createElement('script');
  profileScript.src = 'profile.js?v=5';
  document.body.append(profileScript);
  const memberCardScript = document.createElement('script');
  memberCardScript.src = 'member-quick-card.js?v=2';
  document.body.append(memberCardScript);
}, { once: true });
