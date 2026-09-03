/* ===========================================================================
   CAPTURA DE EMAIL — un solo sitio para todas las paginas.

   Hace tres cosas:
     1. Manda el email a Klaviyo. UNA funcion, alta(), y todo lo demas la
        llama. Cuando cambie el proveedor se toca aqui y solo aqui.
     2. Engancha los formularios que ya hay en la pagina, los del bloque
        de captacion. Se reconocen por data-alta.
     3. Monta el pop-up y decide cuando sale.

   Se escribe en JS y no en el HTML de cada pagina por lo mismo que el
   carrito: son cuatro paginas y el dia que cambie el copy o el porcentaje no
   se pueden tocar cuatro sitios y confiar en acordarse del ultimo.

   ---------------------------------------------------------------------------
   OJO, ESTO TODAVIA NO GUARDA NADA. Faltan las dos constantes de aqui abajo.
   Mientras esten vacias el formulario se comporta como se comportaba: dice
   "hecho" y el email se pierde. Es lo que ya hacia antes, pero ahora ademas
   promete un codigo de descuento, asi que la deuda es mayor: no publicar la
   promesa del 15 % hasta que estas dos lineas tengan valor.
   =========================================================================== */
(function () {
  'use strict';

  /* La clave PUBLICA de Klaviyo, la que empieza por pk_ y puede ir en el
     navegador sin problema. La privada NUNCA entra aqui: cualquiera la leeria
     abriendo el codigo fuente. */
  var KLAVIYO_ID = '';        // company_id / public API key
  var KLAVIYO_LISTA = '';     // id de la lista

  var DESCUENTO = '15 %';

  /* DOS MEMORIAS, y hacen cosas distintas.
     LLAVE (localStorage): quien se apunto o cerro el pop-up. Ese dijo que no
     o ya esta dentro, y no se le insiste en 30 dias.
     VISTO (sessionStorage): con que SE HAYA ABIERTO basta. El sitio son
     cuatro paginas y sin esto salia una vez por pagina: veias el pop-up en
     la portada, lo ignorabas, entrabas en la ficha y volvia a saltar. Una
     visita, una vez. Al cerrar la pestaña se olvida, asi que quien vuelva
     otro dia sin haberlo cerrado si lo vera. */
  var LLAVE = 'zerox-alta';
  var VISTO = 'zerox-alta-visto';
  var DIAS_SILENCIO = 30;

  /* ---------- el envio ---------- */

  function alta(email, origen) {
    if (!KLAVIYO_ID || !KLAVIYO_LISTA) {
      // sin credenciales no hay a donde mandarlo. Se avisa por consola para
      // que no pase desapercibido en un despliegue.
      if (window.console) {
        console.warn('[captura] Falta configurar Klaviyo: el email no se ha guardado.');
      }
      return Promise.resolve(false);
    }
    return fetch('https://a.klaviyo.com/client/subscriptions/?company_id=' + KLAVIYO_ID, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', revision: '2024-10-15' },
      body: JSON.stringify({
        data: {
          type: 'subscription',
          attributes: {
            profile: { data: { type: 'profile', attributes: { email: email, properties: { origen: origen || 'web' } } } }
          },
          relationships: { list: { data: { type: 'list', id: KLAVIYO_LISTA } } }
        }
      })
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  /* ---------- memoria ---------- */

  function apuntado() {
    try {
      var v = localStorage.getItem(LLAVE);
      if (!v) { return false; }
      return (Date.now() - parseInt(v, 10)) < DIAS_SILENCIO * 864e5;
    } catch (e) { return false; }
  }
  function recordar() {
    try { localStorage.setItem(LLAVE, String(Date.now())); } catch (e) {}
  }

  function yaSalio() {
    try { return sessionStorage.getItem(VISTO) === '1'; } catch (e) { return false; }
  }
  function marcarSalida() {
    try { sessionStorage.setItem(VISTO, '1'); } catch (e) {}
  }

  /* ---------- los formularios que ya estan en la pagina ---------- */

  document.addEventListener('submit', function (ev) {
    var f = ev.target.closest('form[data-alta]');
    if (!f) { return; }
    ev.preventDefault();
    var campo = f.querySelector('input[type="email"]');
    if (!campo || !campo.value) { return; }
    var ok = document.getElementById(f.getAttribute('data-alta'));
    alta(campo.value, f.getAttribute('data-origen') || 'bloque');
    recordar();
    // el mensaje sale igual que antes, sin esperar a la red: si Klaviyo tarda
    // o falla, hacer esperar a quien ya ha dejado su correo no arregla nada
    if (ok) { ok.classList.add('on'); ok.classList.add('show'); }
    f.style.display = 'none';
  });

  /* ---------- el pop-up ---------- */

  /* NO SALE AL ENTRAR. Google penaliza los intersticiales que tapan el
     contenido nada mas llegar en movil, y ademas pedirle el correo a alguien
     que todavia no ha visto nada es pedirlo antes de dar. Sale cuando se ha
     leido casi la mitad de la pagina o tras 25 segundos, lo que pase antes.
     Si ya se apunto o ya lo cerro, no vuelve en 30 dias; y dentro de una misma
     visita sale UNA vez, aunque se recorran las cuatro paginas. */
  var UMBRAL = 0.45;
  var ESPERA = 25000;

  function montar() {
    if (apuntado() || document.getElementById('pop-alta')) { return null; }

    var pop = document.createElement('div');
    pop.className = 'pop-alta';
    pop.id = 'pop-alta';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-modal', 'true');
    pop.setAttribute('aria-labelledby', 'pop-alta-titulo');
    pop.innerHTML =
      '<div class="pop-alta-velo" data-pop-cerrar></div>' +
      '<div class="pop-alta-caja">' +
        '<button type="button" class="pop-alta-x" data-pop-cerrar aria-label="Cerrar">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
        '<h2 class="pop-alta-titulo" id="pop-alta-titulo">Te escribimos <span class="h2-soft">el día que salga</span></h2>' +
        '<p class="pop-alta-lede">Con un ' + DESCUENTO + ' para tu primer pedido, por llegar antes. Después, poco correo: lanzamientos y avisos de stock. Te das de baja en un clic.</p>' +
        '<form class="pop-alta-form" data-alta="pop-alta-ok" data-origen="popup">' +
          '<input type="email" placeholder="Tu email" aria-label="Tu email" required>' +
          '<button type="submit">Apuntarme</button>' +
        '</form>' +
        '<p class="pop-alta-ok" id="pop-alta-ok">Apuntado. Te escribimos el día que salga, con tu código dentro.</p>' +
        '<p class="pop-alta-legal">Al dejar tu email aceptas recibir nuestros correos comerciales. ' +
          '<a href="#">Politica de privacidad</a>.</p>' +
      '</div>';
    document.body.appendChild(pop);
    return pop;
  }

  var pop = null;
  var abierto = false;
  var devolverFoco = null;

  function abrir() {
    if (abierto || apuntado() || yaSalio()) { return; }
    pop = pop || montar();
    if (!pop) { return; }
    // se marca AL ABRIR, no al cerrar: quien lo ignora y cambia de pagina
    // tampoco tiene que volver a verlo
    marcarSalida();
    devolverFoco = document.activeElement;
    abierto = true;
    pop.classList.add('visto');
    var campo = pop.querySelector('input[type="email"]');
    if (campo) { campo.focus(); }
  }

  function cerrar() {
    if (!pop || !abierto) { return; }
    abierto = false;
    pop.classList.remove('visto');
    recordar();   // cerrarlo tambien cuenta: no se insiste
    if (devolverFoco && devolverFoco.focus) { devolverFoco.focus(); }
  }

  document.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-pop-cerrar]')) { cerrar(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { cerrar(); }
  });

  if (!apuntado() && !yaSalio()) {
    var reloj = setTimeout(abrir, ESPERA);
    var mirar = function () {
      var alto = document.documentElement.scrollHeight - window.innerHeight;
      if (alto <= 0) { return; }
      if ((window.scrollY / alto) >= UMBRAL) {
        clearTimeout(reloj);
        window.removeEventListener('scroll', mirar);
        abrir();
      }
    };
    window.addEventListener('scroll', mirar, { passive: true });
  }

  /* para poder comprobarlo sin esperar 25 segundos ni desplazarse */
  window.zeroxCaptura = { abrir: abrir, cerrar: cerrar, alta: alta, apuntado: apuntado, yaSalio: yaSalio, LLAVE: LLAVE, VISTO: VISTO };
})();
