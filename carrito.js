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

  /* La foto viaja en data-img desde el boton, pero hace falta una red de
     seguridad: una cesta guardada ANTES de que existieran las fotos sigue
     en el navegador de quien ya habia entrado, y sus lineas no llevan img.
     Sin esto, esa gente ve la cesta sin fotos para siempre.
     La clave es la parte del id anterior al guion, para que mag-unica y
     mag-trimestral usen la del magnesio. */
  var FOTOS = {
    mag: 'ficha-magnesio.jpg',
    d3: 'hero-d3k2.jpg',
    om3: 'hero-omega3.jpg',
    pro: 'hero-probiotico.jpg',
    pack: 'pack-magnesio-libro.jpg'
  };

  function foto(i) {
    return i.img || FOTOS[String(i.id).split('-')[0]] || '';
  }

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
    // cuantas unidades. Llega en data-cant desde el selector de cantidad de la
    // ficha; sin ese atributo es 1, que es como se comportaba antes y como
    // siguen comportandose todos los demas botones de la web.
    var n = Math.max(1, parseInt(datos.cant, 10) || 1);
    var y = null;
    for (var i = 0; i < carrito.length; i++) {
      if (carrito[i].id === datos.id) { y = carrito[i]; break; }
    }
    if (y) { y.cant += n; } else {
      carrito.push({
        id: datos.id, nombre: datos.nombre, sub: datos.sub || '',
        img: datos.img || '', precio: datos.precio, cant: n
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

  var panel, velo, cuerpo, pieTotal, ultimoFoco;

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
    panel.setAttribute('aria-label', 'Tu reserva');
    panel.innerHTML =
      '<div class="cart-cab">' +
        '<h2>Tu reserva</h2>' +
        '<button type="button" class="cart-x" aria-label="Cerrar la cesta">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
      '</div>' +
      // SIN BARRA DE ENVIO GRATIS. Era la pieza que mas hacia parecer esto un
      // pedido: una barra que se llena, un "¡conseguido!" y un umbral que
      // empuja a añadir mas. Aqui no se compra nada todavia, asi que empujar a
      // gastar mas para un envio que no existe es prometer dos veces.
      // El envio gratis desde 27,95 sigue dicho en la barra de arriba y en el
      // pie; lo que se retira es el marcador de progreso.
      '<div class="cart-cuerpo"></div>' +
      '<div class="cart-pie">' +
        '<p class="cart-total"><span>Total orientativo</span><b></b></p>' +
        '<p class="cart-aviso">Todavía no está a la venta. Déjanos tu email y te reservamos el pack, con un 15 % para tu primer pedido.</p>' +
        '<button type="button" class="cart-cta">Reservar con mi email</button>' +
      '</div>';

    document.body.appendChild(velo);
    document.body.appendChild(panel);

    cuerpo = panel.querySelector('.cart-cuerpo');
    pieTotal = panel.querySelector('.cart-total b');


    velo.addEventListener('click', cerrar);
    panel.querySelector('.cart-x').addEventListener('click', cerrar);
    /* EL CTA ABRE LA CAPTURA, no salta a #alta. Saltaba a un ancla, y ese
       bloque no existe en todas las paginas: en resenas.html el enlace no
       llevaba a ningun sitio. El pop-up va montado en las cuatro.
       Se abre a la fuerza porque lo esta pidiendo alguien: aunque ya lo
       hubiera cerrado antes, aqui lo esta buscando. */
    panel.querySelector('.cart-cta').addEventListener('click', function () {
      cerrar();
      if (window.zeroxCaptura) { window.zeroxCaptura.abrir(true); }
    });
    // el enlace de la cesta vacia lleva a otra parte de la pagina: si el
    // panel se queda abierto encima, el salto no se ve
    cuerpo.addEventListener('click', function (ev) {
      if (ev.target.closest('.cart-vacia a')) { cerrar(); }
    });

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
        // el oyente se pone una sola vez, al crear el contador: si se pusiera
        // en cada añadido y la animacion no llegara a correr (pestaña de
        // fondo, por ejemplo), se irian acumulando oyentes que nunca se
        // quitan
        punto.addEventListener('animationend', function () {
          punto.classList.remove('golpe');
        });
      }
      // el golpe solo cuando SUBE. Al restar tambien cambia el numero, pero
      // ahi no hay nada que confirmar: se acaba de quitar algo a proposito
      var antes = +punto.textContent || 0;
      punto.textContent = n;
      punto.hidden = n === 0;
      if (n > antes) {
        // hay que quitar la clase y forzar un reflow antes de volver a
        // ponerla: si no, al añadir dos veces seguidas la animacion no se
        // reinicia y el segundo golpe no se ve
        punto.classList.remove('golpe');
        void punto.offsetWidth;
        punto.classList.add('golpe');
      }
      b.setAttribute('aria-label', n === 0 ? 'Tu reserva, vacía' : 'Tu reserva, ' + n + (n === 1 ? ' artículo' : ' artículos'));
    });

    if (!cuerpo) { return; }

    if (!carrito.length) {
      // La cesta vacia dejaba 400px de blanco y una frase suelta arriba. El
      // hueco es el problema, no la falta de un icono: lo que hace falta ahi
      // es una salida, porque quien abre la cesta vacia se ha quedado sin
      // sitio al que ir.
      // El catalogo esta en la portada; si la pagina lo tiene, se enlaza el
      // ancla de aqui mismo y no se hace salir de la pagina.
      var aDonde = document.getElementById('catalogo') ? '#catalogo' : 'index.html#catalogo';
      cuerpo.innerHTML =
        '<div class="cart-vacia">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 8h13l-1.1 12.2H6.6L5.5 8Z"/><path d="M9 8.5V6.2a3 3 0 0 1 6 0v2.3"/></svg>' +
          '<p>Todavía no has reservado nada.</p>' +
          '<a href="' + aDonde + '">Ver las cuatro fórmulas</a>' +
        '</div>';
    } else {
      cuerpo.innerHTML = carrito.map(function (i) {
        var img = foto(i);
        return '<div class="cart-linea">' +
            // si el archivo faltara, el onerror se lleva el hueco entero en
            // vez de dejar el icono de imagen rota
            (img ? '<div class="cart-foto"><img src="' + img + '" alt="" decoding="async"' +
                   ' onerror="this.parentNode.remove()"></div>' : '') +
            '<div class="cart-linea-txt">' +
              '<b>' + i.nombre + '</b>' +
              (i.sub ? '<span>' + i.sub + '</span>' : '') +
              '<div class="cart-cant">' +
                '<button type="button" data-cant="-1" data-id="' + i.id + '" aria-label="Quitar uno de ' + i.nombre + '">&minus;</button>' +
                '<span>' + i.cant + '</span>' +
                '<button type="button" data-cant="1" data-id="' + i.id + '" aria-label="Añadir uno de ' + i.nombre + '">+</button>' +
              '</div>' +
            '</div>' +
            '<div class="cart-linea-der">' +
              '<b class="cart-linea-precio">' + euros(i.precio * i.cant) + '</b>' +
              // el precio por unidad solo cuando hay mas de una: con una
              // sola seria repetir el mismo numero dos veces
              (i.cant > 1 ? '<span class="cart-unidad">' + euros(i.precio) + ' cada uno</span>' : '') +
            '</div>' +
          '</div>';
      }).join('');
    }

    pieTotal.textContent = euros(total());
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
      img: b.getAttribute('data-img'),
      precio: parseFloat(b.getAttribute('data-precio')),
      cant: b.getAttribute('data-cant')
    });
    abrir();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { montar(); pintar(); });
  } else {
    montar(); pintar();
  }
})();
