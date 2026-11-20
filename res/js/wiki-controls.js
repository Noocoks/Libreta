(function () {
"use strict";
document.addEventListener("DOMContentLoaded",function(){
var expand=document.getElementById("tree_expand_all");
var collapse=document.getElementById("tree_collapse_all");
var search=document.getElementById("tree_search");
var clear=document.getElementById("tree_search_clear");
if(expand)expand.addEventListener("click",expandAllSubtrees);
if(collapse)collapse.addEventListener("click",collapseAllSubtrees);
if(search)search.addEventListener("input",function(){filterTree(search.value);});
if(clear)clear.addEventListener("click",clearTreeSearch);
});
})();
