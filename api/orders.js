const { randomUUID } = require("node:crypto");
const PDFDocument = require("pdfkit");
const { Resend } = require("resend");

const products = new Map([
  ["Kit de frenos cerámicos", 1890],
  ["Cadena reforzada 520", 740],
  ["Filtro de aire de alto flujo", 560],
  ["Pastillas de freno HD", 2450],
  ["Juego de luces LED", 890],
  ["Bomba manual de achique", 1320],
  ["Batería ciclo profundo 12 V", 2180],
  ["Banda de transmisión agrícola", 990],
  ["Banda de accesorios para motor", 1190],
  ["Filtro de combustible en línea", 3250],
  ["Caja de rodamiento ferroviaria", 4890]
]);

function respond(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatPrice(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0
  }).format(value);
}

function createInvoice(order) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
    const chunks = [];
    pdf.on("data", chunk => chunks.push(chunk));
    pdf.on("error", reject);
    pdf.on("end", () => resolve(Buffer.concat(chunks)));

    const navy = "#183044";
    const muted = "#687986";
    const gold = "#eab257";
    const right = 547;

    pdf.rect(0, 0, 595.28, 132).fill(navy);
    pdf.fillColor(gold).font("Helvetica-Bold").fontSize(11).text("RUTA NORTE", 48, 42);
    pdf.fillColor("#ffffff").fontSize(24).text("Comprobante de pedido", 48, 62);
    pdf.fillColor("#e4edf3").font("Helvetica").fontSize(9).text("DOCUMENTO NO FISCAL · NO ES COMPROBANTE DE PAGO", 48, 99);

    pdf.fillColor(navy).font("Helvetica-Bold").fontSize(10).text("Folio", 48, 158);
    pdf.font("Helvetica").text(order.id, 48, 174);
    pdf.font("Helvetica-Bold").text("Fecha", 310, 158);
    pdf.font("Helvetica").text(order.date, 310, 174);

    pdf.moveTo(48, 202).lineTo(right, 202).lineWidth(1).strokeColor("#d7e0e6").stroke();
    pdf.fillColor(navy).font("Helvetica-Bold").fontSize(11).text("Datos del cliente", 48, 218);
    pdf.fillColor("#263b4b").font("Helvetica").fontSize(9)
      .text(order.customer.name, 48, 238)
      .text(order.customer.email, 48, 253)
      .text(`Teléfono: ${order.customer.phone || "No indicado"}`, 48, 268)
      .text(`Ciudad y estado: ${order.customer.city}`, 48, 283);

    const tableTop = 320;
    pdf.rect(48, tableTop, right - 48, 25).fill("#edf2f5");
    pdf.fillColor(navy).font("Helvetica-Bold").fontSize(8)
      .text("PRODUCTO", 58, tableTop + 8)
      .text("CANT.", 342, tableTop + 8, { width: 42, align: "right" })
      .text("PRECIO", 398, tableTop + 8, { width: 62, align: "right" })
      .text("IMPORTE", 466, tableTop + 8, { width: 72, align: "right" });

    let rowY = tableTop + 37;
    for (const item of order.items) {
      pdf.fillColor("#263b4b").font("Helvetica").fontSize(9)
        .text(item.name, 58, rowY, { width: 270 })
        .text(String(item.quantity), 342, rowY, { width: 42, align: "right" })
        .text(formatPrice(item.price), 398, rowY, { width: 62, align: "right" })
        .text(formatPrice(item.price * item.quantity), 466, rowY, { width: 72, align: "right" });
      rowY += 24;
      pdf.moveTo(48, rowY - 5).lineTo(right, rowY - 5).lineWidth(.5).strokeColor("#e5eaee").stroke();
    }

    const totalY = rowY + 10;
    pdf.fillColor(navy).font("Helvetica-Bold").fontSize(12)
      .text("Total estimado", 330, totalY, { width: 130, align: "right" })
      .text(formatPrice(order.total), 466, totalY, { width: 72, align: "right" });

    const noticeY = totalY + 45;
    pdf.rect(48, noticeY, right - 48, 62).fill("#f3f6f8");
    pdf.fillColor(navy).font("Helvetica-Bold").fontSize(8)
      .text("IMPORTANTE", 60, noticeY + 12);
    pdf.fillColor(muted).font("Helvetica").fontSize(8)
      .text("Comprobante informativo no fiscal. No es un CFDI ni confirma el pago o la disponibilidad. La tienda confirmará existencias, envío y forma de pago.", 60, noticeY + 27, { width: right - 72, lineGap: 2 });
    pdf.end();
  });
}

function createEmailHtml(order) {
  const rows = order.items.map(item => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #e5eaee">${escapeHtml(item.name)}</td>
      <td style="padding:10px;border-bottom:1px solid #e5eaee;text-align:center">${item.quantity}</td>
      <td style="padding:10px;border-bottom:1px solid #e5eaee;text-align:right">${formatPrice(item.price * item.quantity)}</td>
    </tr>`).join("");

  return `<div style="font-family:Arial,sans-serif;color:#183044;max-width:680px;margin:auto">
    <div style="background:#183044;padding:24px;color:white">
      <strong style="color:#eab257">RUTA NORTE</strong>
      <h1 style="font-size:22px;margin-bottom:4px">Comprobante de pedido</h1>
      <p style="font-size:12px;margin:0;color:#e4edf3">DOCUMENTO NO FISCAL · NO ES COMPROBANTE DE PAGO</p>
    </div>
    <div style="padding:22px">
      <p><strong>Folio:</strong> ${escapeHtml(order.id)}<br><strong>Fecha:</strong> ${escapeHtml(order.date)}</p>
      <h2 style="font-size:16px">Datos del cliente</h2>
      <p>${escapeHtml(order.customer.name)}<br>${escapeHtml(order.customer.email)}<br>Teléfono: ${escapeHtml(order.customer.phone || "No indicado")}<br>Ciudad y estado: ${escapeHtml(order.customer.city)}</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        <thead><tr style="background:#edf2f5"><th style="padding:10px;text-align:left">Producto</th><th style="padding:10px">Cantidad</th><th style="padding:10px;text-align:right">Importe</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="text-align:right;font-size:17px"><strong>Total estimado: ${formatPrice(order.total)}</strong></p>
      <p style="padding:14px;background:#f3f6f8;font-size:12px;line-height:1.6"><strong>Importante:</strong> comprobante informativo no fiscal. No es un CFDI ni confirma pago o disponibilidad. La tienda confirmará existencias, envío y forma de pago.</p>
      <p style="font-size:11px;color:#687986">Adjuntamos el comprobante en PDF.</p>
    </div>
  </div>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return respond(res, 405, { success: false, message: "Método no permitido." });
  }

  const origin = req.headers.origin;
  let requestOrigin;
  try {
    requestOrigin = origin ? new URL(origin) : null;
  } catch {
    requestOrigin = null;
  }
  if (!requestOrigin || !["http:", "https:"].includes(requestOrigin.protocol) || requestOrigin.host !== req.headers.host) {
    return respond(res, 403, { success: false, message: "Origen de solicitud no permitido." });
  }

  if (!process.env.RESEND_API_KEY || !process.env.ORDER_EMAIL_FROM) {
    console.error("Faltan RESEND_API_KEY u ORDER_EMAIL_FROM en el servidor.");
    return respond(res, 503, { success: false, message: "El envío de comprobantes aún no está configurado." });
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return respond(res, 400, { success: false, message: "El formato del pedido no es válido." });
    }
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return respond(res, 400, { success: false, message: "El pedido no contiene datos válidos." });
  }
  if (cleanText(payload.website, 200)) {
    return respond(res, 400, { success: false, message: "No se pudo validar el pedido." });
  }

  const customerInput = payload.customer;
  const name = cleanText(customerInput?.name, 120);
  const email = cleanText(customerInput?.email, 254).toLowerCase();
  const phone = cleanText(customerInput?.phone, 30);
  const city = cleanText(customerInput?.city, 120);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !emailPattern.test(email) || !city) {
    return respond(res, 400, { success: false, message: "Revisa nombre, correo y ciudad antes de enviar." });
  }
  if (typeof phone !== "string" || phone.length > 30) {
    return respond(res, 400, { success: false, message: "El teléfono no es válido." });
  }
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > products.size) {
    return respond(res, 400, { success: false, message: "El carrito no contiene una cantidad válida de productos." });
  }

  const items = [];
  const seen = new Set();
  for (const item of payload.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return respond(res, 400, { success: false, message: "Hay un producto con datos no válidos." });
    }
    const productName = cleanText(item.name, 120);
    const quantity = item.quantity;
    if (!products.has(productName) || seen.has(productName) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
      return respond(res, 400, { success: false, message: "Revisa los productos y cantidades del carrito." });
    }
    seen.add(productName);
    items.push({ name: productName, quantity, price: products.get(productName) });
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = {
    id: `RN-${randomUUID().slice(0, 8).toUpperCase()}`,
    date: new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "America/Mexico_City" }).format(new Date()),
    customer: { name, email, phone, city },
    items,
    total
  };

  try {
    const invoice = await createInvoice(order);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const extraRecipients = typeof process.env.ORDER_EMAIL_TO === "string" && process.env.ORDER_EMAIL_TO.trim()
      ? [process.env.ORDER_EMAIL_TO.trim()]
      : [];

    const emailPayload = {
      from: process.env.ORDER_EMAIL_FROM,
      to: [order.customer.email],
      replyTo: order.customer.email,
      subject: `Comprobante de pedido ${order.id} — Ruta Norte`,
      html: createEmailHtml(order),
      attachments: [{
        filename: `comprobante-${order.id}.pdf`,
        content: invoice
      }]
    };

    if (extraRecipients.length) {
      emailPayload.bcc = extraRecipients;
    }

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error("Resend no aceptó el envío del comprobante.", error);
      return respond(res, 502, { success: false, message: "El proveedor de correo no pudo aceptar el envío. El carrito se conservó." });
    }

    return respond(res, 200, { success: true, orderId: order.id, emailId: data?.id });
  } catch (error) {
    console.error("Error al generar o enviar el comprobante.", error);
    return respond(res, 500, { success: false, message: "No se pudo enviar el comprobante. Inténtalo de nuevo más tarde." });
  }
};
