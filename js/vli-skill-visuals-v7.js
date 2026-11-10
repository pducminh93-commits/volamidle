/* VLI V7: authoritative JXWEB V4 skill icons, no remote requests.
 * Source icons are img/s/708..717 and img/s/751..775 in the offline bundle.
 */
'use strict';
(function(){
  const ids=[...Array.from({length:10},(_,i)=>708+i),...Array.from({length:25},(_,i)=>751+i)];
  const available=ids.filter(id=>window.JX?.skills?.[id]);
  for(const id of available){
    // Cache-busting only; game logic and sprite texture remain unmodified.
    const name='img/s/'+id+'.png?vli7';
    JX.skills[id].ic=name;
    if(typeof SK!=='undefined'&&SK?.[id])SK[id].ic=name;
  }
  window.VLI_SKILL_VISUALS_V7={version:7,ids:available,source:'JXWEB V4',icon:id=>'img/s/'+Number(id)+'.png?vli7'};
})();
