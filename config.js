window.VELOS_CONFIG = {
  // Public browser configuration. Never use a Supabase service_role key here.
  supabaseUrl: "https://dmdwdmgqtskjfxkuujiw.supabase.co",
  supabaseAnonKey: "sb_publishable_GAB4g3KMYmI8N5SBgJx9ew_IxlSF76G"
};

// Keep feature styles after the base app CSS. Load profile actions after chat handlers.
const profileStyles = document.createElement('link');
profileStyles.rel = 'stylesheet';
profileStyles.href = 'profile.css?v=2';
document.head.append(profileStyles);
const chatAvatarStyles = document.createElement('link');
chatAvatarStyles.rel = 'stylesheet';
chatAvatarStyles.href = 'chat-avatar.css?v=1';
document.head.append(chatAvatarStyles);
const iphoneStyles = document.createElement('link');
iphoneStyles.rel = 'stylesheet';
iphoneStyles.href = 'iphone.css?v=1';
document.head.append(iphoneStyles);
document.addEventListener('DOMContentLoaded', () => {
  const profileScript = document.createElement('script');
  profileScript.src = 'profile.js?v=2';
  document.body.append(profileScript);
}, { once: true });
