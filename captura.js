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

  // con espacio duro: el pop-up es estrecho y sin el, '15' y '%' pueden
  // acabar en lineas distintas
  var DESCUENTO = '15 %';

  /* UNA SOLA MEMORIA, y dura lo que dura la visita.
     Con que el pop-up SE HAYA ABIERTO basta para no repetirlo: el sitio son
     cuatro paginas y sin esto salia una vez por pagina.
     Antes habia ademas un silencio de 30 dias en localStorage, y se retira:
     dejaba el pop-up imposible de volver a ver durante un mes en cuanto
     alguien lo cerraba una vez, y eso hacia imposible probarlo. Ahora, al
     cerrar la pestaña se olvida y en la siguiente visita vuelve a salir. */
  var VISTO = 'zerox-alta-visto';

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
    // quien acaba de dejar su correo no tiene que volver a ver el pop-up en
    // esta visita, aunque lo haya enviado desde el bloque de la pagina
    marcarSalida();
    // el mensaje sale igual que antes, sin esperar a la red: si Klaviyo tarda
    // o falla, hacer esperar a quien ya ha dejado su correo no arregla nada
    if (ok) { ok.classList.add('on'); ok.classList.add('show'); }
    f.style.display = 'none';
    // si el que se ha enviado es el del pop-up, la salida pasa a ser el unico
    // boton que queda, y conviene que diga otra cosa
    var no = document.querySelector('.pop-alta-no');
    if (no && f.classList.contains('pop-alta-form')) { no.textContent = 'Seguir mirando'; }
  });

  /* ---------- el pop-up ---------- */

  /* NO SALE AL ENTRAR, y con este ocupando la pantalla entera importa mas que
     antes: Google penaliza los intersticiales que tapan el contenido nada mas
     llegar en movil. Ademas pedirle el correo a alguien que no ha visto nada
     es pedirlo antes de dar. Sale cuando se ha leido casi la mitad de la
     pagina o tras 25 segundos, lo que pase antes.
     Solo se sale pulsando: no se cierra tocando fuera, porque a pantalla
     completa no hay fuera. Escape SI cierra: es invisible para casi todo el
     mundo, pero quien navega con teclado lo necesita.
     Dentro de una misma visita sale UNA vez, aunque se recorran las cuatro
     paginas. En la siguiente visita vuelve a salir. */
  var UMBRAL = 0.45;
  var ESPERA = 25000;

  function montar() {
    if (document.getElementById('pop-alta')) { return null; }

    var pop = document.createElement('div');
    pop.className = 'pop-alta';
    pop.id = 'pop-alta';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-modal', 'true');
    pop.setAttribute('aria-labelledby', 'pop-alta-titulo');
    // Sin velo y sin cruz. El pop-up ocupa la pantalla entera, asi que no hay
    // un "fuera" que oscurecer, y la salida es un texto debajo del boton.
    pop.innerHTML =
      '<div class="pop-alta-caja">' +
        '<h2 class="pop-alta-titulo" id="pop-alta-titulo">Llega antes <span class="h2-soft">y paga menos</span></h2>' +
        // UNA LINEA. La version larga ocupaba cinco lineas en un movil y hacia
        // que el bloque pesara mas que cualquier otro de la pagina. Lo que hay
        // que decir aqui son dos datos: cuanto y cuando. El resto —que se manda
        // poco correo, que la baja es de un clic— vive en la politica de
        // privacidad, que esta enlazada dos lineas mas abajo.
        '<p class="pop-alta-lede">Un ' + DESCUENTO + ' en tu primer pedido el día que abramos.</p>' +
        '<form class="pop-alta-form" data-alta="pop-alta-ok" data-origen="popup">' +
          '<input type="email" placeholder="Tu email" aria-label="Tu email" required>' +
          '<button type="submit">Quiero mi código</button>' +
        '</form>' +
        '<p class="pop-alta-ok" id="pop-alta-ok">Apuntado. Te escribimos el día que salga, con tu código dentro.</p>' +
        '<p class="pop-alta-legal">Al dejar tu email aceptas recibir nuestros correos comerciales. ' +
          '<a href="privacidad.html">Política de privacidad</a>.</p>' +
        // LA SALIDA, en texto y no en cruz. Dice "Ahora no, gracias" y NO "no
        // quiero mi descuento": eso ultimo es confirmshaming, hacer que decir
        // que no suene a error. Funciona a corto plazo y deja mal cuerpo, y
        // aqui ademas contradice lo que promete la propia web tres pantallas
        // mas abajo: "no hay cuentas atras ni ofertas que caducan esta noche".
        '<button type="button" class="pop-alta-no" data-pop-cerrar>Ahora no, gracias</button>' +
      '</div>';
    document.body.appendChild(pop);
    return pop;
  }

  var pop = null;
  var abierto = false;
  var devolverFoco = null;

  /* forzar: lo pide alguien a proposito —el boton de la cesta, o ?pop=1 para
     probarlo— y entonces la memoria no cuenta. */
  function abrir(forzar) {
    if (abierto) { return; }
    if (!forzar && yaSalio()) { return; }
    pop = pop || montar();
    if (!pop) { return; }
    // se marca AL ABRIR, no al cerrar: quien lo ignora y cambia de pagina
    // tampoco tiene que volver a verlo
    marcarSalida();
    devolverFoco = document.activeElement;
    abierto = true;
    pop.classList.add('visto');
    // se bloquea el desplazamiento de detras: si la pagina sigue moviendose
    // por debajo, el pop-up a pantalla completa se lee como un fallo
    document.documentElement.classList.add('sin-scroll');
    var campo = pop.querySelector('input[type="email"]');
    if (campo) { campo.focus(); }
  }

  function cerrar() {
    if (!pop || !abierto) { return; }
    abierto = false;
    pop.classList.remove('visto');
    document.documentElement.classList.remove('sin-scroll');
    // cerrarlo ya cuenta como visto en esta visita; lo marco abrir()
    if (devolverFoco && devolverFoco.focus) { devolverFoco.focus(); }
  }

  document.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-pop-cerrar]')) { cerrar(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { cerrar(); }
  });

  if (!yaSalio()) {
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

  /* ?pop=1 lo abre en el acto y saltandose las memorias. Es para poder verlo
     sin esperar 25 segundos ni borrar el almacenamiento del navegador: una vez
     que lo cierras, no vuelve en 30 dias, y probarlo se vuelve imposible. */
  if (/[?&]pop=1(&|$)/.test(location.search)) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { abrir(true); });
    } else { abrir(true); }
  }

  /* para poder comprobarlo sin esperar 25 segundos ni desplazarse */
  window.zeroxCaptura = {
    abrir: abrir, cerrar: cerrar, alta: alta, yaSalio: yaSalio, VISTO: VISTO,
    // borra la memoria de la visita, para poder volver a probarlo sin cerrar
    // la pestaña. Tambien limpia la llave vieja de los 30 dias, que puede
    // seguir guardada en navegadores que ya la tenian.
    olvidar: function () {
      try {
        sessionStorage.removeItem(VISTO);
        localStorage.removeItem('zerox-alta');
      } catch (e) {}
    }
  };
})();
