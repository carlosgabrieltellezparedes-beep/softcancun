
exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: "POST" },
      body: JSON.stringify({ error: "Método no permitido" })
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Falta configurar el servidor"
      })
    };
  }

  let data;

  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Solicitud no válida" })
    };
  }

  const nombre =
    typeof data.nombre === "string" ? data.nombre.trim() : "";
  const correo =
    typeof data.correo === "string" ? data.correo.trim() : "";

  if (
    nombre.length < 2 ||
    nombre.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
    correo.length > 254
  ) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: "Revisa tu nombre y correo electrónico"
      })
    };
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/pagos`,
      {
        method: "POST",
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          nombre,
          correo,
          importe_mxn: 1392,
          estado: "pendiente"
        })
      }
    );

    if (!response.ok) {
      console.error(
        "Error al registrar pago. Código:",
        response.status
      );

      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "No se pudo registrar la solicitud"
        })
      };
    }

    const rows = await response.json();

    if (!Array.isArray(rows) || !rows[0]?.id) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "No se recibió confirmación del registro"
        })
      };
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        mensaje: "Solicitud registrada como pendiente",
        pago_id: rows[0].id,
        estado: "pendiente",
        importe_mxn: 1392
      })
    };
  } catch (error) {
    console.error("Error de conexión al registrar pago");

    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: "No fue posible conectar con el servicio de pagos"
      })
    };
  }
};
