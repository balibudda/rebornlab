// Демо-подписка: в боевой версии форма шлёт почту на сервер, тот присылает письмо «подтвердите подписку».
document.querySelectorAll('[data-sub-form]').forEach(function (f) {
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = f.querySelector('[data-sub-msg]');
    var email = f.querySelector('input[type=email]').value.trim();
    var ok = f.querySelector('[data-sub-consent]').checked;
    msg.className = 'sub-msg err';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = 'Проверьте адрес почты'; return; }
    if (!ok) { msg.textContent = 'Отметьте согласие, чтобы подписаться'; return; }
    msg.className = 'sub-msg ok';
    msg.textContent = 'Почти готово: мы отправили письмо на ' + email + ' — нажмите в нём «Подтвердить». (демо)';
    f.reset();
  });
});
