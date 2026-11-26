window.VELOS_CONFIG = {
  // Public browser configuration. Never use a Supabase service_role key here.
  supabaseUrl: "https://dmdwdmgqtskjfxkuujiw.supabase.co",
  supabaseAnonKey: "sb_publishable_GAB4g3KMYmI8N5SBgJx9ew_IxlSF76G"
};

// The profile menu/editor is a separate module so the chat app remains lightweight.
const profileStylesheet = document.createElement('link');
profileStylesheet.rel = 'stylesheet';
profileStylesheet.href = 'profile.css';
document.head.append(profileStylesheet);
const profileScript = document.createElement('script');
profileScript.src = 'profile.js';
document.head.append(profileScript);
