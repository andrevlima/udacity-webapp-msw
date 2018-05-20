/**
* Tab Jumper
* Allows to jump from an element to another easely with [data-tab-jump-to]
* @author André Lima
* @license Apache-2.0
*/

initPassTabBind = () => {
	document.querySelectorAll("[data-tab-jump-to]").forEach(function(element) {
    var jumpTarget = document.getElementById(element.dataset.tabJumpTo);
	element.addEventListener("keydown", function(e) {
		if(e.keyCode == 9 && !e.shiftKey) {
			//Focus next input
			var fun = (e) => {
		  		jumpTarget.focus();
		  		element.removeEventListener("focusout", fun);
			}
			element.addEventListener("focusout", fun);
			jumpTarget.tabIndex = 0;
			jumpTarget.blur();
		}   
	});
	jumpTarget.addEventListener("keydown", function(e) {
	  if(e.keyCode == 9 && e.shiftKey) {
	  	  cancelNext = false;
		  //Focus previous input
		  var fun = (e) => {
			element.focus();
			jumpTarget.removeEventListener("focusout", fun);
		  }
		  jumpTarget.addEventListener("focusout", fun);
		  element.tabIndex = 0;
		  element.blur();
	  }   
	});
  });
}

document.addEventListener('DOMContentLoaded', (event) => {
  initPassTabBind();
});