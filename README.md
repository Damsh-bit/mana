# Maná

Landing del estudio de desarrollo web Maná. Sitio estático (HTML + CSS + JS), sin build.

- `index.html` — la home
- `rubros/index.html` — todos los rubros con diseños (`/rubros/`)
- `rubros/rubro.html` — un rubro (`/rubros/<rubro>`, por la regla de `vercel.json`)
- `assets/css/styles.css` — estilos
- `assets/js/main.js` — animaciones (GSAP + Motion) y carrusel de proyectos
- `assets/js/hablemos.js` — el formulario de contacto "Hablemos" (abajo)
- `assets/js/micro.js` — microinteracciones (abajo)
- `assets/js/catalogo.js`, `rubros.js`, `rubro.js`, `vitrina.js`, `mockup.js` — los rubros (abajo)

## Rubros: los diseños de Radar, solos

La sección **Rubros** de la home, `/rubros/` y cada `/rubros/<rubro>` se arman con las plantillas que están cargadas y
activas ("Usarla en las demos") en [Radar Panel](https://github.com/Damsh-bit/radar-panel). No hay nada que tocar acá:
una plantilla nueva aparece al minuto, en su rubro, y un rubro aparece apenas tiene una. Radar las publica en
`GET https://radar-panel-sandy.vercel.app/api/plantillas` (ver "Vitrina en Maná" en su README).

- La home y `/rubros/` listan los rubros. En computadora, al pasar el mouse sale un abanico con tres de sus diseños
  reales: el del frente se mueve y se recorre solo, los de los costados quedan quietos. En el celular, miniaturas
  dibujadas en los colores de cada diseño.
- Cada vista previa es el sitio entero, así que se cargan de a dos, corren su entrada y se congelan (sin cuadros ni
  animaciones) hasta que se les pasa el mouse; las chicas van a 30 cuadros por segundo y con el 3D a 1x. Con el visor
  abierto, todo lo de atrás queda congelado y sin dibujarse (`bridge` y `createPreview` en `vitrina.js`).
- `/rubros/<rubro>` muestra cada diseño **en vivo** (la página real, achicada) y lo abre a pantalla completa, en
  computadora o en celular. Se adapta con el mismo `adaptarPlantilla` de las demos de Radar, con un negocio de ejemplo.
  Los botones de WhatsApp, llamar y email no llaman a nadie: avisan qué harían en la web del cliente (y muestran el
  mensaje que se armó).

### El link para un cliente

`https://mana-sigma-sandy.vercel.app/rubros/<rubro>` con, si se quiere:

| Parámetro | Qué hace | Ejemplo |
| --- | --- | --- |
| `para` | Su nombre en el título y en cada diseño (sin reseñas de ejemplo) | `?para=Estudio%20Pérez` |
| `pais` | Precios, moneda y palabras de su país: `AR` (por defecto), `ES`, `MX`, `US`, `CA` | `&pais=ES` |
| `color` | Los diseños pasan al color de su marca (hex, sin `#`) | `&color=2a6f97` |
| `ver` | Abre directo un diseño (el id de la plantilla) | `&ver=pl-arquitectura-estudio` |

Las claves de rubro son las de Radar (`lib/config.js`): `arquitectura`, `construccion`, `salud`, etc. Un link con
`para` no se indexa.

## Hablemos: el formulario de contacto

Todo lo que lleva a `#contacto` (el botón "Hablemos" de arriba, "Contanos tu proyecto", "Escribinos", "Quiero esta" en el
visor de diseños) abre un popup de cinco pasos en vez de bajar a la sección: **proyecto** (qué tipo de web), **negocio**
(empresa, rubro, dónde está y su web), **objetivos** (lo principal y qué funciones quiere), **alcance** (presupuesto
orientativo en USD, para cuándo y qué contenido ya tiene) y **contacto** (nombre, por dónde prefiere que le escriban,
WhatsApp o teléfono, email y un mensaje). Después, un resumen para revisar y editar, y el envío.

- Cada consulta llega a [Radar Panel](https://github.com/Damsh-bit/radar-panel) como un **referido de Maná**
  (`POST /api/referidos`, ver "Referidos de Maná" en su README): aparece en la pestaña "Referidos de Maná" de Seguimiento y
  como próximo paso en Hoy. Las opciones del formulario usan las claves de `lib/referidos.js` de Radar: si se suma una
  opción acá, va también allá.
- Toma el contexto de la página: en `/rubros/<rubro>` el rubro ya viene elegido, el diseño que se estaba mirando (`ver`) y
  el link para un cliente (`para` y `pais`) completan la empresa y el país, y viajan con la consulta.
- `data-hablemos="<proyecto>"` en un link abre el formulario con ese tipo de proyecto elegido (los de Servicios lo usan), y
  `/#hablemos` lo abre al cargar.
- Lo respondido se guarda en el navegador hasta enviarlo: cerrar no pierde nada y al volver sigue donde quedó.
- Contra robots: un campo trampa y un tiempo mínimo; Radar además limita los envíos por conexión.

## Microinteracciones

`micro.js` y el final de `styles.css`: el menú hace rodar sus letras, los botones brillan al pasar y sueltan chispas al
tocarlos, las etiquetas de sección se decodifican al aparecer, las tarjetas de proyectos se inclinan hacia el mouse con un
reflejo, los retratos tienen profundidad, "Hablemos." se agranda letra por letra bajo el puntero, el cursor saluda sobre lo
que abre el formulario, el encabezado se achica al bajar y el logo del pie se sacude. Con "reducir movimiento" no corre
nada, y lo que sigue al mouse solo corre con mouse.

## Local

```bash
python -m http.server 5173
```

Sin la regla de Vercel, un rubro se abre en `/rubros/rubro.html?r=<rubro>` (los links del sitio ya lo hacen solos en
localhost).

## Deploy

Vercel, como sitio estático (sin framework ni build command): cada push a `main` publica en
https://mana-sigma-sandy.vercel.app.
