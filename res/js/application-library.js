(function(){"use strict";var input=document.getElementById("application-search"),result=document.getElementById("application-results"),cards=Array.prototype.slice.call(document.querySelectorAll("[data-app-card]")),categories=Array.prototype.slice.call(document.querySelectorAll("[data-library-category]"));if(!input||!result)return;function norm(v){return String(v||"").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"")}function filter(){var q=norm(input.value.trim()),visible=0;categories.forEach(function(cat){var n=0;cat.querySelectorAll("[data-app-card]").forEach(function(card){var match=!q||norm(card.getAttribute("data-search")).indexOf(q)!==-1;card.hidden=!match;if(match){visible++;n++}});cat.hidden=n===0;var d=cat.querySelector("details");if(q&&n&&d)d.open=true;if(!q&&d)d.open=false});result.textContent=q?visible+(visible===1?" resultado":" resultados"):cards.length+" aplicaciones disponibles"}input.addEventListener("input",filter);input.addEventListener("search",filter)})();
/* Logotipos vectoriales de marca disponibles localmente. */
(function(){
"use strict";
var icons={
"blender":"blender","gimp":"gimp","krita":"krita","obs-studio":"obsstudio",
"docker-desktop":"docker","steam":"steam","brave":"brave","firefox":"firefox",
"audacity":"audacity","7-zip":"7zip","qbittorrent":"qbittorrent",
"tailscale":"tailscale","rustdesk":"rustdesk","localsend":"localsend",
"obsidian":"obsidian","libreoffice":"libreoffice","autohotkey":"autohotkey",
"epic-games-store":"epicgames","ubisoft-connect":"ubisoft","bitwarden":"bitwarden",
"keepassxc":"keepassxc","proton-vpn":"protonvpn","winamp":"winamp","inkscape":"inkscape","kdenlive":"kdenlive","dbeaver-community":"dbeaver","joplin":"joplin","vscodium":"vscodium","syncthing":"syncthing","freecad":"freecad","mixxx":"mixxx","kde-connect":"kdeconnect","windhawk":"windhawk","seelen-ui":"seelen-ui","quicklook":"quicklook"
};
document.querySelectorAll("[data-app-card]").forEach(function(card){
var link=card.querySelector(".library-card-link");
var top=card.querySelector(".library-card-top");
if(!link||!top)return;
var file=(link.getAttribute("href")||"").split("/").pop().replace(/\.html$/,"");
var icon=icons[file];
if(!icon)return;
var image=document.createElement("img");
image.className="library-app-logo";
image.src="/Libreta/images/apps/"+icon+".svg";
image.alt="";
image.setAttribute("aria-hidden","true");
image.loading="lazy";
image.decoding="async";
image.addEventListener("error",function(){image.remove();},{once:true});
top.prepend(image);
});
})();