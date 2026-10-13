# Maná

Landing del estudio de desarrollo web Maná. Sitio estático (HTML + CSS + JS), sin build.

- `index.html` — la home
- `rubros/index.html` — todos los rubros con diseños (`/rubros/`)
- `rubros/rubro.html` — un rubro (`/rubros/<rubro>`, por la regla de `vercel.json`)
- `assets/css/styles.css` — estilos
- `assets/js/main.js` — animaciones (GSAP + Motion) y carrusel de proyectos
- `assets/js/catalogo.js`, `rubros.js`, `rubro.js`, `vitrina.js`, `mockup.js` — los rubros (abajo)

## Rubros: los diseños de Radar, solos

La sección **Rubros** de la home, `/rubros/` y cada `/rubros/<rubro>` se arman con las plantillas que están cargadas y
activas ("Usarla en las demos") en [Radar Panel](https://github.com/Damsh-bit/radar-panel). No hay nada que tocar acá:
una plantilla nueva aparece al minuto, en su rubro, y un rubro aparece apenas tiene una. Radar las publica en
`GET https://radar-panel-sandy.vercel.app/api/plantillas` (ver "Vitrina en Maná" en su README).

- La home y `/rubros/` muestran cada rubro con miniaturas dibujadas en los colores de sus diseños.
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

## Local

```bash
python -m http.server 5173
```

Sin la regla de Vercel, un rubro se abre en `/rubros/rubro.html?r=<rubro>` (los links del sitio ya lo hacen solos en
localhost).

## Deploy

Vercel, como sitio estático (sin framework ni build command): cada push a `main` publica en
https://mana-sigma-sandy.vercel.app.
