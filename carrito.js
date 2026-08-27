/* ===========================================================================
   CARRITO
   Compartido por las tres paginas. No hay servidor detras: el carrito vive
   en el localStorage del navegador, asi que sobrevive a recargas y a saltar
   de una pagina a otra, que es lo que se le pide a un carrito de verdad.

   Se cuelga de un solo atributo, data-add, para no tener que tocar el JS
   cada vez que se añade un producto. Cualquier boton con:

     data-add="mag" data-nombre="Magnesio" data-sub="Bisglicinato · 360 mg"
     data-precio="22.90"

   entra en el carrito solo.

   LO QUE ESTE CARRITO NO HACE, A PROPOSITO: cobrar. No hay pasarela, ni
   formulario de tarjeta, ni nada que se le parezca. El panel termina
   diciendo que todavia no esta a la venta y ofreciendo el aviso por email,
   que es lo unico que hoy es verdad. Los precios siguen siendo
   orientativos.
   =========================================================================== */
(function () {
  'use strict';

  var LLAVE = 'zerox-carrito';
  var ENVIO_GRATIS = 27.95;

  /* ---------- estado ---------- */

  function leer() {
    try {
      var v = JSON.parse(localStorage.getItem(LLAVE));
      return Array.isArray(v) ? v : [];
    } catch (e) {
      // modo privado, almacenamiento bloqueado, JSON corrupto: se empieza
      // de cero en vez de dejar la pagina rota
      return [];
    }
  }

  function guardar(items) {
    try { localStorage.setItem(LLAVE, JSON.stringify(items)); } catch (e) {}
  }

  var carrito = leer();

  function unidades() {
    return carrito.reduce(function (n, i) { return n + i.cant; }, 0);
  }

  function total() {
    return carrito.reduce(function (n, i) { return n + i.precio * i.cant; }, 0);
  }

  function euros(n) {
    return n.toFixed(2).replace('.', ',') + ' €';
  }

  /* ---------- operaciones ---------- */

  function añadir(datos) {
    var y = null;
    for (var i = 0; i < carrito.length; i++) {
      if (carrito[i].id === datos.id) { y = carrito[i]; break; }
    }
    if (y) { y.cant += 1; } else {
      carrito.push({
        id: datos.id, nombre: datos.nombre, sub: datos.sub || '',
        precio: datos.precio, cant: 1
      });
    }
    guardar(carrito);
    pintar();
  }

  function cambiarCant(id, delta) {
    for (var i = 0; i < carrito.length; i++) {
      if (carrito[i].id !== id) { continue; }
      carrito[i].cant += delta;
      if (carrito[i].cant < 1) { carrito.splice(i, 1); }
      break;
    }
    guardar(carrito);
    pintar();
  }

  /* ---------- el panel, montado desde aqui para no repetirlo en cada
       pagina. Si mañana hay una cuarta, hereda el carrito sin tocarla ---- */

  var panel, velo, cuerpo, pieTotal, barra, barraTexto, ultimoFoco;

  function montar() {
    velo = document.createElement('div');
    velo.className = 'cart-velo';
    velo.hidden = true;

    panel = document.createElement('aside');
    panel.className = 'cart';
    panel.id = 'cart';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Tu cesta');
    panel.innerHTML =
      '<div class="cart-cab">' +
        '<h2>Tu cesta</h2>' +
        '<button type="button" class="cart-x" aria-label="Cerrar la cesta">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="cart-envio"><div class="cart-barra"><span></span></div><p></p></div>' +
      '<div class="cart-cuerpo"></div>' +
      '<div class="cart-pie">' +
        '<p class="cart-total"><span>Total</span><b></b></p>' +
        '<p class="cart-aviso">Todavía no está a la venta. Déjanos tu email y te avisamos el día que salga, con precio de lanzamiento.</p>' +
        '<a class="cart-cta" href="#alta">Avisadme cuando salga</a>' +
      '</div>';

    document.body.appendChild(velo);
    document.body.appendChild(panel);

    cuerpo = panel.querySelector('.cart-cuerpo');
    pieTotal = panel.querySelector('.cart-total b');
    barra = panel.querySelector('.cart-barra span');
    barraTexto = panel.querySelector('.cart-envio p');

    velo.addEventListener('click', cerrar);
    panel.querySelector('.cart-x').addEventListener('click', cerrar);
    panel.querySelector('.cart-cta').addEventListener('click', cerrar);

    cuerpo.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-cant]');
      if (!b) { return; }
      cambiarCant(b.getAttribute('data-id'), +b.getAttribute('data-cant'));
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !panel.hidden) { cerrar(); }
    });
  }

  function abrir() {
    ultimoFoco = document.activeElement;
    velo.hidden = false;
    panel.hidden = false;
    // el reflow fuerza que la transicion se vea; sin esto el panel aparece
    // ya puesto en su sitio y no se desliza
    void panel.offsetWidth;
    velo.classList.add('visto');
    panel.classList.add('visto');
    document.body.style.overflow = 'hidden';
    panel.querySelector('.cart-x').focus();
  }

  function cerrar() {
    velo.classList.remove('visto');
    panel.classList.remove('visto');
    document.body.style.overflow = '';
    var fin = function () { velo.hidden = true; panel.hidden = true; };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { fin(); }
    else { setTimeout(fin, 260); }
    if (ultimoFoco && ultimoFoco.focus) { ultimoFoco.focus(); }
  }

  /* ---------- pintar ---------- */

  function pintar() {
    var n = unidades();

    // el contador de la bolsa, en las tres paginas
    Array.prototype.forEach.call(document.querySelectorAll('[data-cart-abrir]'), function (b) {
      var punto = b.querySelector('.cart-num');
      if (!punto) {
        punto = document.createElement('span');
        punto.className = 'cart-num';
        b.appendChild(punto);
      }
      punto.textContent = n;
      punto.hidden = n === 0;
      b.setAttribute('aria-label', n === 0 ? 'Tu cesta, vacía' : 'Tu cesta, ' + n + (n === 1 ? ' artículo' : ' artículos'));
    });

    if (!cuerpo) { return; }

    if (!carrito.length) {
      cuerpo.innerHTML = '<p class="cart-vacia">La cesta está vacía.</p>';
    } else {
      cuerpo.innerHTML = carrito.map(function (i) {
        return '<div class="cart-linea">' +
            '<div class="cart-linea-txt">' +
              '<b>' + i.nombre + '</b>' +
              (i.sub ? '<span>' + i.sub + '</span>' : '') +
            '</div>' +
            '<div class="cart-cant">' +
              '<button type="button" data-cant="-1" data-id="' + i.id + '" aria-label="Quitar uno de ' + i.nombre + '">&minus;</button>' +
              '<span>' + i.cant + '</span>' +
              '<button type="button" data-cant="1" data-id="' + i.id + '" aria-label="Añadir uno de ' + i.nombre + '">+</button>' +
            '</div>' +
            '<b class="cart-linea-precio">' + euros(i.precio * i.cant) + '</b>' +
          '</div>';
      }).join('');
    }

    pieTotal.textContent = euros(total());

    var falta = ENVIO_GRATIS - total();
    var pct = Math.min(100, Math.round((total() / ENVIO_GRATIS) * 100));
    barra.style.width = pct + '%';
    barraTexto.textContent = falta > 0
      ? 'Te faltan ' + euros(falta) + ' para el envío gratis'
      : 'Envío gratis conseguido';
    barraTexto.classList.toggle('cart-envio-ok', falta <= 0);
  }

  /* ---------- enganches ---------- */

  document.addEventListener('click', function (ev) {
    var abre = ev.target.closest('[data-cart-abrir]');
    if (abre) { ev.preventDefault(); abrir(); return; }

    var b = ev.target.closest('[data-add]');
    if (!b) { return; }
    ev.preventDefault();
    // en la ficha el precio y el nombre cambian con la opcion elegida, asi
    // que se leen del boton en el momento de pulsar y no al cargar
    añadir({
      id: b.getAttribute('data-add'),
      nombre: b.getAttribute('data-nombre'),
      sub: b.getAttribute('data-sub'),
      precio: parseFloat(b.getAttribute('data-precio'))
    });
    abrir();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { montar(); pintar(); });
  } else {
    montar(); pintar();
  }
})();
