// Profile menu, editor, avatar, and member quick cards for Velos.
(() => {
  const cfg = window.VELOS_CONFIG;
  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || !window.supabase) return;
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHTML = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials = name => String(name || 'V').trim().split(/\s+/).slice(0,2).map(p => p[0] || '').join('').toUpperCase() || 'V';
  let user = null, profile = null, selectedAvatar = null, activeMemberCard = null, memberCardRequest = 0;

  const menu = document.createElement('section');
  menu.className = 'account-menu hidden'; menu.id = 'account-menu'; menu.setAttribute('aria-label','Account menu');
  menu.innerHTML = `<div class="account-menu-profile"><div class="account-menu-avatar" id="menu-avatar">V</div><div class="account-menu-identity"><strong id="menu-name">Velos member</strong><span id="menu-username">@member</span></div></div><div class="account-menu-points"><span class="points-icon">✳</span><span><strong id="menu-points">0</strong><small>Velos points</small></span><span class="points-caption">+1 per message</span></div><button class="account-menu-action" id="menu-edit-profile" type="button"><span>✎</span> Edit profile <b>→</b></button><button class="account-menu-logout" id="menu-signout" type="button">Sign out <span>↗</span></button>`;
  document.body.append(menu);

  const memberCard = document.createElement('section');
  memberCard.className = 'member-quick-card hidden'; memberCard.id = 'member-quick-card';
  memberCard.setAttribute('role','dialog'); memberCard.setAttribute('aria-label','Member profile');
  document.body.append(memberCard);

  const modal = document.createElement('dialog'); modal.className = 'modal profile-modal'; modal.id = 'profile-modal';
  modal.innerHTML = `<button class="modal-close" type="button" aria-label="Close profile">×</button><p class="section-kicker">YOUR VELOS IDENTITY</p><h2>Edit your profile</h2><p class="modal-intro">Your name and picture appear beside your messages.</p><form id="profile-form"><div class="profile-picture-row"><div class="profile-picture-preview" id="profile-preview">V</div><div><label class="upload-button" for="profile-avatar-file">Change picture</label><input id="profile-avatar-file" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><small>JPG, PNG, WebP or GIF · up to 3 MB</small></div></div><div class="form-field"><label for="profile-name">Display name</label><input id="profile-name" maxlength="40" required></div><div class="form-field"><label for="profile-handle">Username</label><div class="username-input"><span>@</span><input id="profile-handle" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]+" required></div><small class="username-help">3–24 letters, numbers, or underscores.</small></div><p class="profile-email" id="profile-email"></p><p class="form-error" id="profile-error" role="alert"></p><button class="primary-button full" type="submit" id="profile-save">Save changes <span>↗</span></button></form>`;
  document.body.append(modal);

  function toast(message) {
    let node = $('#toast');
    if (!node) { node = document.createElement('div'); node.id='profile-toast'; node.className='toast'; node.setAttribute('role','status'); document.body.append(node); }
    node.textContent=message; node.classList.add('visible'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>node.classList.remove('visible'),2800);
  }
  function isVerified() { return Boolean(user?.email_confirmed_at || user?.confirmed_at); }
  function imageOrInitials(url,name) { return url ? `<img src="${escapeHTML(url)}" alt="">` : escapeHTML(initials(name)); }
  function renderAccount() {
    const trigger=$('#user-avatar'); if (!trigger) return;
    if (!user) { trigger.classList.add('hidden'); menu.classList.add('hidden'); return; }
    trigger.classList.remove('hidden'); trigger.setAttribute('aria-label','Open account menu'); trigger.setAttribute('aria-haspopup','true'); trigger.setAttribute('aria-expanded',String(!menu.classList.contains('hidden')));
    trigger.innerHTML=imageOrInitials(profile?.avatar_url,profile?.display_name || user.user_metadata?.display_name || user.email);
    $('#menu-avatar').innerHTML=imageOrInitials(profile?.avatar_url,profile?.display_name || 'V');
    $('#menu-name').textContent=profile?.display_name || user.user_metadata?.display_name || 'Velos member';
    $('#menu-username').textContent=profile?.username ? `@${profile.username}` : '@member';
    $('#menu-points').textContent=Number(profile?.points || 0).toLocaleString();
  }
  async function refreshProfile() {
    const result=await db.auth.getUser(); user=result.data.user;
    if (!user) { profile=null; renderAccount(); return; }
    const {data,error}=await db.from('profiles').select('user_id,username,display_name,avatar_url,points').eq('user_id',user.id).single();
    if (!error) profile=data;
    renderAccount();
  }
  function placeCard(element, anchor) {
    const rect=anchor.getBoundingClientRect();
    const width=Math.min(element.classList.contains('member-quick-card') ? 280 : 300,window.innerWidth-24);
    element.style.width=`${width}px`;
    const preferredLeft=rect.left + rect.width / 2 - width / 2;
    element.style.left=`${Math.max(12,Math.min(window.innerWidth-width-12,preferredLeft))}px`;
    const height=element.offsetHeight;
    const top=rect.bottom+9+height <= window.innerHeight ? rect.bottom+9 : Math.max(12,rect.top-height-9);
    element.style.top=`${top}px`;
  }
  function closeMenu() { menu.classList.add('hidden'); $('#user-avatar')?.setAttribute('aria-expanded','false'); }
  function closeMemberCard() { memberCard.classList.add('hidden'); activeMemberCard=null; }
  async function openMemberCard(anchor) {
    const id=anchor.dataset.authorId;
    if (!id) return;
    if (activeMemberCard === anchor && !memberCard.classList.contains('hidden')) { closeMemberCard(); return; }
    closeMenu(); activeMemberCard=anchor; const request=++memberCardRequest;
    const embedded={
      display_name: anchor.dataset.displayName || 'Velos member',
      username: anchor.dataset.username || '',
      avatar_url: anchor.dataset.avatarUrl || '',
      points: anchor.dataset.points || '0'
    };
    memberCard.innerHTML=`<div class="member-card-loading"><span class="member-card-avatar">${imageOrInitials(embedded.avatar_url,embedded.display_name)}</span><span>Loading member…</span></div>`;
    memberCard.classList.remove('hidden'); placeCard(memberCard,anchor);
    const {data,error}=await db.from('profiles').select('user_id,display_name,username,avatar_url,points').eq('user_id',id).maybeSingle();
    if (request!==memberCardRequest || activeMemberCard!==anchor) return;
    const member=data || embedded;
    if (error && !embedded.username && !embedded.avatar_url) { memberCard.innerHTML='<p class="member-card-error">Member profile is unavailable.</p>'; placeCard(memberCard,anchor); return; }
    const name=member.display_name || 'Velos member';
    memberCard.innerHTML=`<div class="member-card-top"><div class="member-card-avatar">${imageOrInitials(member.avatar_url,name)}</div><div class="member-card-name"><strong>${escapeHTML(name)}</strong><span>${member.username ? `@${escapeHTML(member.username)}` : 'Velos member'}</span></div><button class="member-card-close" type="button" aria-label="Close member card">×</button></div><div class="member-card-score"><span>✳</span><strong>${Number(member.points || 0).toLocaleString()}</strong><small>Velos points</small></div>`;
    memberCard.querySelector('.member-card-close').addEventListener('click',closeMemberCard);
    placeCard(memberCard,anchor);
  }
  async function toggleMenu(event) {
    event?.preventDefault(); event?.stopPropagation();
    if (!user) { toast('Log in to view your account.'); return; }
    closeMemberCard();
    if (menu.classList.contains('hidden')) { await refreshProfile(); menu.classList.remove('hidden'); placeCard(menu,$('#user-avatar')); $('#user-avatar')?.setAttribute('aria-expanded','true'); }
    else closeMenu();
  }
  async function openEditor() {
    closeMenu(); await refreshProfile();
    if (!user) return toast('Log in first to edit your profile.');
    if (!isVerified()) return toast('Verify your email before editing your profile.');
    $('#profile-name').value=profile?.display_name || ''; $('#profile-handle').value=profile?.username || '';
    $('#profile-email').textContent=`Verified email · ${user.email || ''}`; $('#profile-error').textContent=''; $('#profile-avatar-file').value=''; selectedAvatar=null;
    $('#profile-preview').innerHTML=imageOrInitials(profile?.avatar_url,profile?.display_name); modal.showModal();
  }
  async function uploadAvatar(file) {
    if (!file) return profile?.avatar_url || null;
    const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'}; const ext=extensions[file.type];
    if (!ext) throw new Error('Choose a JPG, PNG, WebP, or GIF image.');
    if (file.size>3*1024*1024) throw new Error('Profile pictures must be 3 MB or smaller.');
    const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
    const {error}=await db.storage.from('avatars').upload(path,file,{contentType:file.type}); if (error) throw error;
    return db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  }

  // Use capture phase so existing chat click handlers cannot interpret the account/avatar clicks.
  document.addEventListener('click',event=>{
    const accountTrigger=event.target.closest('#user-avatar, #mobile-account');
    if (accountTrigger) { event.preventDefault(); event.stopImmediatePropagation(); toggleMenu(event); return; }
    const messageAvatar=event.target.closest('.message-avatar');
    if (messageAvatar) { event.preventDefault(); event.stopImmediatePropagation(); openMemberCard(messageAvatar); return; }
    if (!menu.contains(event.target)) closeMenu();
    if (!memberCard.contains(event.target)) closeMemberCard();
  },true);
  $('#menu-edit-profile').addEventListener('click',openEditor);
  $('#menu-signout').addEventListener('click',async()=>{const {error}=await db.auth.signOut(); if(error){toast(error.message);return;} closeMenu(); modal.close(); user=null; profile=null; renderAccount(); toast('You are signed out.');});
  menu.addEventListener('click',event=>event.stopPropagation()); memberCard.addEventListener('click',event=>event.stopPropagation());
  modal.querySelector('.modal-close').addEventListener('click',()=>modal.close());
  window.addEventListener('resize',()=>{if(activeMemberCard&&!memberCard.classList.contains('hidden'))placeCard(memberCard,activeMemberCard);if(!menu.classList.contains('hidden'))placeCard(menu,$('#user-avatar'));});
  window.addEventListener('scroll',()=>{closeMemberCard();if(!menu.classList.contains('hidden'))closeMenu();},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();closeMemberCard();}});
  $('#profile-avatar-file').addEventListener('change',event=>{
    const file=event.target.files?.[0]; if(!file)return;
    if(file.size>3*1024*1024){$('#profile-error').textContent='Profile pictures must be 3 MB or smaller.';event.target.value='';return;}
    selectedAvatar=file; const reader=new FileReader(); reader.onload=()=>$('#profile-preview').innerHTML=`<img src="${reader.result}" alt="Profile picture preview">`; reader.readAsDataURL(file);
  });
  $('#profile-name').addEventListener('input',()=>{if(!selectedAvatar&&!profile?.avatar_url)$('#profile-preview').textContent=initials($('#profile-name').value);});
  $('#profile-form').addEventListener('submit',async event=>{
    event.preventDefault(); $('#profile-error').textContent='';
    if (!isVerified()) { $('#profile-error').textContent='Verify your email before editing your profile.'; return; }
    const display_name=$('#profile-name').value.trim(), username=$('#profile-handle').value.trim().toLowerCase();
    if(!/^[a-zA-Z0-9_]{3,24}$/.test(username)){ $('#profile-error').textContent='Username must be 3–24 letters, numbers, or underscores.'; return; }
    const button=$('#profile-save'); button.disabled=true; button.textContent='Saving…';
    try {
      const avatar_url=await uploadAvatar(selectedAvatar);
      const {data,error}=await db.from('profiles').update({display_name,username,avatar_url}).eq('user_id',user.id).select('user_id,username,display_name,avatar_url,points').single();
      if(error)throw error;
      profile=data; await db.auth.updateUser({data:{display_name}}); renderAccount(); modal.close(); toast('Profile updated.');
      document.dispatchEvent(new CustomEvent('velos:profile-updated',{detail:profile}));
    } catch(error) { $('#profile-error').textContent=error.code==='23505'?'That username is already taken. Choose another.':(error.message || 'Could not save your profile.'); }
    finally {button.disabled=false;button.innerHTML='Save changes <span>↗</span>';}
  });
  db.auth.onAuthStateChange((_event,session)=>{user=session?.user || null; if(!user){profile=null;closeMenu();closeMemberCard();} setTimeout(refreshProfile,0);});
  refreshProfile();
})();
