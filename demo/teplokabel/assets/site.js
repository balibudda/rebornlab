(function () {
  var m = document.getElementById('modal');
  document.querySelectorAll('[data-modal]').forEach(function (b) { b.addEventListener('click', function () { m.classList.add('on'); }); });
  m.addEventListener('click', function (e) { if (e.target === m || e.target.hasAttribute('data-close')) m.classList.remove('on'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') m.classList.remove('on'); });
  // вкладки на карточке товара
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tab,.tabp').forEach(function (x) { x.classList.remove('on'); });
      t.classList.add('on'); document.getElementById(t.dataset.tab).classList.add('on');
    });
  });
  // фильтр в каталоге
  document.querySelectorAll('.chip[data-f]').forEach(function (c) {
    c.addEventListener('click', function () {
      document.querySelectorAll('.chip[data-f]').forEach(function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      document.querySelectorAll('.prod[data-t]').forEach(function (p) { p.style.display = (c.dataset.f === 'all' || p.dataset.t === c.dataset.f) ? '' : 'none'; });
    });
  });
  // плавное появление блоков
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .12 });
    document.querySelectorAll('.sol-i,.adv-i,.proj-i,.rev-i,.prod,.steps li,.card,.why-i').forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }
})();
function addCart(b) {
  var c = document.querySelector('.cart b'); c.textContent = +c.textContent + 1;
  var t = document.createElement('div'); t.className = 'toast'; t.textContent = 'Товар добавлен в корзину (демо)';
  document.body.appendChild(t); setTimeout(function () { t.remove(); }, 1800);
}
function q(b, d) { var i = b.parentNode.querySelector('input'); i.value = Math.max(1, (+i.value || 1) + d); }
