// Robust member quick card for chat message avatars.
// This listens at window capture so no older document-level avatar listener can
// swallow the event before the member card opens.
(() => {
  const cfg=window.VELOS_CONFIG;
  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || !window.supabase) return;
  const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const escapeHTML=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials=name=>String(name||'V').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'V';
  let activeAnchor=null, request=0;
  function getCard(){
    let card=document.getElementById('member-quick-card');
    if(!card){card=document.createElement('section');card.id='member-quick-card';card.className='member-quick-card hidden';card.setAttribute('role','dialog');card.setAttribute('aria-label','Member profile');document.body.append(card);}
    return card;
  }
  function position(card,anchor){
    const rect=anchor.getBoundingClientRect(),width=Math.min(280,window.innerWidth-24);
    card.style.width=`${width}px`;
    card.style.left=`${Math.max(12,Math.min(window.innerWidth-width-12,rect.left+rect.width/2-width/2))}px`;
    const height=card.offsetHeight;
    card.style.top=`${rect.bottom+height+12<=window.innerHeight?rect.bottom+10:Math.max(12,rect.top-height-10)}px`;
  }
  function close(){const card=getCard();card.classList.add('hidden');activeAnchor=null;request++;}
  async function open(anchor){
    const card=getCard();
    if(activeAnchor===anchor&&!card.classList.contains('hidden')){close();return;}
    activeAnchor=anchor;const current=++request;
    card.innerHTML='<div class="member-card-loading">Loading member profile…</div>';
    card.classList.remove('hidden');position(card,anchor);
    const messageId=anchor.closest('.message')?.dataset.messageId;
    let member=null;
    if(messageId){
      const {data:message}=await db.from('messages').select('author_id').eq('id',messageId).maybeSingle();
      if(message?.author_id){
        const {data}=await db.from('profiles').select('user_id,display_name,username,avatar_url,points').eq('user_id',message.author_id).maybeSingle();
        member=data;
      }
    }
    if(current!==request||activeAnchor!==anchor)return;
    if(!member){
      const fallbackName=anchor.closest('.message')?.querySelector('.message-meta strong')?.textContent||'Velos member';
      const fallbackHandle=anchor.closest('.message')?.querySelector('.message-username')?.textContent||'';
      card.innerHTML=`<div class="member-card-top"><div class="member-card-avatar">${escapeHTML(initials(fallbackName))}</div><div class="member-card-name"><strong>${escapeHTML(fallbackName)}</strong><span>${escapeHTML(fallbackHandle||'Member profile unavailable')}</span></div><button class="member-card-close" type="button" aria-label="Close member card">×</button></div>`;
    }else{
      const name=member.display_name||'Velos member';
      const avatar=member.avatar_url?`<img src="${escapeHTML(member.avatar_url)}" alt="">`:escapeHTML(initials(name));
      card.innerHTML=`<div class="member-card-top"><div class="member-card-avatar">${avatar}</div><div class="member-card-name"><strong>${escapeHTML(name)}</strong><span>${member.username?`@${escapeHTML(member.username)}`:'Velos member'}</span></div><button class="member-card-close" type="button" aria-label="Close member card">×</button></div><div class="member-card-score"><span>✳</span><strong>${Number(member.points||0).toLocaleString()}</strong><small>Velos points</small></div>`;
    }
    card.querySelector('.member-card-close')?.addEventListener('click',event=>{event.stopPropagation();close();});
    position(card,anchor);
  }
  function avatarFrom(target){return target instanceof Element?target.closest('.message-avatar'):null;}
  function enhanceAvatars(root=document){root.querySelectorAll('.message-avatar').forEach(avatar=>{
    avatar.setAttribute('role','button');avatar.setAttribute('tabindex','0');
    const name=avatar.closest('.message')?.querySelector('.message-meta strong')?.textContent||'member';
    avatar.setAttribute('aria-label',`View ${name}'s profile`);
  });}
  enhanceAvatars();
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    if(node.matches?.('.message-avatar')) enhanceAvatars(node.parentElement||document);
    else enhanceAvatars(node);
  }))).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('click',event=>{
    const avatar=avatarFrom(event.target);
    if(avatar){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();open(avatar);return;}
    const card=document.getElementById('member-quick-card');
    if(card&&!card.contains(event.target))close();
  },true);
  window.addEventListener('keydown',event=>{
    const avatar=avatarFrom(event.target);
    if(avatar&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.stopPropagation();open(avatar);return;}
    if(event.key==='Escape')close();
  },true);
  window.addEventListener('resize',()=>{if(activeAnchor)position(getCard(),activeAnchor);});
  window.addEventListener('scroll',close,true);
})();
