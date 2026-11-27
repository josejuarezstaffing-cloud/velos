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

// Keep all space iconography consistent with the Velos upward-arrow brand.
const spaceIconStyles = document.createElement('style');
spaceIconStyles.textContent = `
  .space-icon, .discover-icon, .room-icon {
    color: #dedede !important;
    background: #171717 !important;
    border-color: #333 !important;
  }
`;
document.head.append(spaceIconStyles);
function applySpaceIcons() {
  document.querySelectorAll('.space-icon, .discover-icon, #room-icon').forEach(icon => {
    icon.textContent = '↗';
    icon.setAttribute('aria-hidden', 'true');
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applySpaceIcons, { once: true });
else applySpaceIcons();
const iconObserver = new MutationObserver(applySpaceIcons);
iconObserver.observe(document.body, { childList: true, subtree: true });

// Keep feature styles after the base app CSS. Load profile actions after chat handlers.
const profileStyles = document.createElement('link');
profileStyles.rel = 'stylesheet';
profileStyles.href = 'profile.css?v=3';
document.head.append(profileStyles);
const chatAvatarStyles = document.createElement('link');
chatAvatarStyles.rel = 'stylesheet';
chatAvatarStyles.href = 'chat-avatar.css?v=2';
document.head.append(chatAvatarStyles);
const iphoneStyles = document.createElement('link');
iphoneStyles.rel = 'stylesheet';
iphoneStyles.href = 'iphone.css?v=2';
document.head.append(iphoneStyles);
document.addEventListener('DOMContentLoaded', () => {
  const profileScript = document.createElement('script');
  profileScript.src = 'profile.js?v=3';
  document.body.append(profileScript);
}, { once: true });
