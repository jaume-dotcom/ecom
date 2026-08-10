# ZEROX — Maqueta de tienda

Maqueta de la tienda online para nuestra marca de suplementación. Producto ancla: **magnesio bisglicinato**, con el resto del protocolo entrando por fases.

**Ver en vivo:** https://jaume-dotcom.github.io/ecom/

## Estado del proyecto

Es una **maqueta de concepto**, no una tienda funcional: los productos, precios y textos son provisionales y no hay pasarela de pago ni carrito real.

⚠️ **El nombre ZEROX no es definitivo.** Hay una marca viva registrada en España en clase 5 (complementos alimenticios) que usa "zerox", así que está pendiente de decisión. Cuando se cierre el nombre habrá que actualizar toda la maqueta.

## Contenido

| Sección | Qué es |
|---|---|
| Hero | Propuesta de marca: la dosis correcta |
| `#catalogo` | Las fórmulas del protocolo |
| `#protocolo` | El pack completo |
| `#criterio` | Cómo se elige cada fórmula |

## Estructura del repo

Todo el sitio vive en un único `index.html` (~1,2 MB), con los estilos y las imágenes en base64 incrustados en el propio archivo.

Es cómodo para maquetar rápido, pero tiene dos inconvenientes que conviene tener presentes:

- **Conflictos de Git.** Si dos personas editan el archivo a la vez, la fusión hay que resolverla a mano. Avisad por Discord antes de tocarlo.
- **Peso de carga.** El navegador descarga 1,2 MB antes de pintar nada.

Pendiente de decidir: separar en `index.html` + `style.css` + `script.js` + carpeta `/img`.

## Cómo trabajar en él

Antes de empezar, traer los últimos cambios:

```bash
git pull
```

Al terminar:

```bash
git add -A
git commit -m "descripción del cambio"
git push
```

Los cambios aparecen en GitHub al instante, pero la web publicada tarda 1-3 minutos en redesplegarse (GitHub Pages). Recargar con `Ctrl+F5` para saltarse la caché.

## Paleta

Paleta **Mineral Frío**, elegida por no coincidir con la de ningún competidor español del sector:

| Color | Hex | Uso |
|---|---|---|
| Cristal | `#EEF0F4` | Fondos |
| Perla azulada | `#AEBBD3` | Acentos |
| Acero suave | `#8B9AA8` | Texto secundario, líneas |
| Grafito | `#23272E` | Texto principal |

## Repos relacionados

- [`marca-suplementos-landing`](https://github.com/alejandroglobalwork-dev/marca-suplementos-landing) — landing de captación del magnesio
