# Despliegue de Ruta Norte

## Requisitos para pedidos por correo

La tienda usa una función de Vercel y Resend para mandar el comprobante PDF no fiscal al correo que escribe el cliente. Si configuras `ORDER_EMAIL_TO`, también se envía una copia oculta al correo de la tienda. No se guardan claves de correo en `web.html`.

1. Sube este proyecto a un repositorio privado o a uno público si así lo prefieres, e impórtalo en Vercel.
2. En Resend, crea una API key y verifica un dominio de correo que controles. El remitente debe pertenecer a ese dominio verificado.
3. En **Vercel → Project → Settings → Environment Variables**, configura:
   - `RESEND_API_KEY`: la clave API de Resend.
   - `ORDER_EMAIL_FROM`: remitente verificado, por ejemplo `Ruta Norte <pedidos@tu-dominio-verificado.mx>`.
   - `ORDER_EMAIL_TO`: opcional, correo de la tienda que recibe una copia oculta del pedido; por ejemplo `moisesleoncruz31@gmail.com`.
4. Asigna las variables a los entornos que vayas a publicar y vuelve a desplegar.
5. Prueba un pedido real con un importe pequeño o de prueba y revisa el correo que escribiste en la página y, si corresponde, también el de la tienda.

No escribas `RESEND_API_KEY` en este repositorio ni en el HTML. El servidor valida productos y precios, genera un folio y adjunta el comprobante PDF.

Para probar en desarrollo después de configurar estas variables en un archivo `.env` local, instala las dependencias con `npm install` y ejecuta `npx vercel dev`. El archivo `.env` está excluido de Git.

## Alcance del comprobante

El documento es un **comprobante informativo no fiscal**. No procesa pagos, no confirma inventario ni sustituye un CFDI. Emitir CFDI requiere integrar un PAC autorizado y recopilar los datos fiscales correspondientes.

La página se sirve como `web.html` en la raíz y `/api/orders` procesa los pedidos. Si se usa otra plataforma que no ejecute funciones Node compatibles con Vercel, habrá que adaptar y desplegar el endpoint en esa plataforma.
