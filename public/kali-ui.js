/* eslint-env browser */
(function () {
  var appmenu = document.getElementById('appmenu');
  if (!appmenu) return;

  appmenu.addEventListener('click', function (event) {
    if (!event.target.closest('.appmenu-shell')) {
      appmenu.close();
    }
  });
})();
