// Envio de mensagens WhatsApp — desacoplado do provedor.
//
// Nenhum provedor foi escolhido ainda, então por padrão as mensagens só são registradas no
// log do servidor (não falha, não bloqueia nada). Para ativar o envio de verdade, defina a
// variável de ambiente WHATSAPP_PROVIDER com um dos valores abaixo e as credenciais
// correspondentes (veja .env.example):
//
//   - "callmebot": grátis, sem cartão — precisa de CALLMEBOT_PHONE e CALLMEBOT_API_KEY.
//   - "twilio": pago, oficial — precisa de TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
//     TWILIO_WHATSAPP_FROM (ex: "whatsapp:+14155238886") e WHATSAPP_TO.
//   - "meta": oficial (Meta Cloud API) — precisa de WHATSAPP_CLOUD_TOKEN,
//     WHATSAPP_CLOUD_PHONE_ID e WHATSAPP_TO.

export type EnvioWhatsAppResultado =
  | { enviado: true; modo: "log" | "callmebot" | "twilio" | "meta" }
  | { enviado: false; erro: string };

async function enviarViaCallMeBot(texto: string): Promise<EnvioWhatsAppResultado> {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_API_KEY;
  if (!phone || !apikey) {
    return { enviado: false, erro: "CALLMEBOT_PHONE ou CALLMEBOT_API_KEY não configurados." };
  }
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(apikey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { enviado: false, erro: `CallMeBot respondeu ${res.status}.` };
  }
  return { enviado: true, modo: "callmebot" };
}

async function enviarViaTwilio(texto: string): Promise<EnvioWhatsAppResultado> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.WHATSAPP_TO;
  if (!accountSid || !authToken || !from || !to) {
    return {
      enviado: false,
      erro: "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM ou WHATSAPP_TO não configurados.",
    };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    Body: texto,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    return { enviado: false, erro: `Twilio respondeu ${res.status}. ${detalhe}`.trim() };
  }
  return { enviado: true, modo: "twilio" };
}

async function enviarViaMeta(texto: string): Promise<EnvioWhatsAppResultado> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneId = process.env.WHATSAPP_CLOUD_PHONE_ID;
  const to = process.env.WHATSAPP_TO;
  if (!token || !phoneId || !to) {
    return {
      enviado: false,
      erro: "WHATSAPP_CLOUD_TOKEN, WHATSAPP_CLOUD_PHONE_ID ou WHATSAPP_TO não configurados.",
    };
  }
  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: texto },
    }),
  });
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    return { enviado: false, erro: `Meta Cloud API respondeu ${res.status}. ${detalhe}`.trim() };
  }
  return { enviado: true, modo: "meta" };
}

/** Envia (ou apenas registra no log, se nenhum provedor estiver configurado) uma mensagem de WhatsApp. */
export async function enviarWhatsApp(texto: string): Promise<EnvioWhatsAppResultado> {
  const provider = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase();

  switch (provider) {
    case "callmebot":
      return enviarViaCallMeBot(texto);
    case "twilio":
      return enviarViaTwilio(texto);
    case "meta":
      return enviarViaMeta(texto);
    default:
      // Nenhum provedor configurado ainda — apenas loga, não falha.
      console.log(`[whatsapp] (provedor não configurado, apenas log) ${texto}`);
      return { enviado: true, modo: "log" };
  }
}
