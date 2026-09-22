/* Shared map helper for the bundled Vietnam itinerary pages. */
(() => {
  'use strict';
  window.makeMap=function(id,points){
    const root=document.getElementById(id);if(!root)return;
    const clean=(Array.isArray(points)?points:[]).filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon)));
    if(!window.L||!clean.length){
      root.innerHTML='<div class="map-fallback" style="display:block">המפה דורשת חיבור לאינטרנט. פרטי המסלול וקישורי Google Maps ממשיכים לפעול.</div>';
      return;
    }
    const map=L.map(root,{scrollWheelZoom:false});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
    const bounds=[];
    clean.forEach((point,index)=>{
      const marker=L.divIcon({className:'leaflet-div-icon',html:'<span class="num-marker">'+(index+1)+'</span>',iconSize:[30,30],iconAnchor:[15,15]});
      L.marker([Number(point.lat),Number(point.lon)],{icon:marker}).addTo(map).bindPopup(String(point.name||('תחנה '+(index+1))));
      bounds.push([Number(point.lat),Number(point.lon)]);
    });
    if(bounds.length===1)map.setView(bounds[0],12);else map.fitBounds(bounds,{padding:[32,32]});
    setTimeout(()=>map.invalidateSize(),120);
  };
})();
