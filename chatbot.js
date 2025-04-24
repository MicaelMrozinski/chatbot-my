// Leitor de QR code e persistência de sessão (pronto para nuvem)
require('dotenv').config();
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Carrega configuração de horário de expediente do .env (opcional)
const WORK_HOURS = {
  weekdays: { start: parseInt(process.env.WEEK_START_HOUR) || 7, end: parseInt(process.env.WEEK_END_HOUR) || 18 },
  saturday: { start: parseInt(process.env.SAT_START_HOUR) || 7, end: parseInt(process.env.SAT_END_HOUR) || 12 }
};

// Estado atual do bot
const state = { inEnergySubmenu: false };

// Inicialização do cliente
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: process.env.SESSION_PATH }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

// Helpers
function isWithinWorkingHours(date = new Date()) {
  const day = date.getDay(), hour = date.getHours();
  if (day >= 1 && day <= 5) {
    return hour >= WORK_HOURS.weekdays.start && hour < WORK_HOURS.weekdays.end;
  } else if (day === 6) {
    return hour >= WORK_HOURS.saturday.start && hour < WORK_HOURS.saturday.end;
  }
  return false;
}

async function sendReply(chatId, text) {
  await client.sendMessage(chatId, text);
}

// Definições de menus
const MAIN_MENU = {
  '1': msg => sendReply(msg.from, '🛠️ Me diga o que deseja que logo irei lhe atender!'),
  '2': msg => {
    state.inEnergySubmenu = true;
    return sendReply(msg.from,
      '🌞 *EK Energia Solar* - Escolha:\n' +
      '1️⃣ Falar com atendente\n' +
      '2️⃣ Como funciona a energia solar?\n\n' +
      'Digite *menu* para voltar ao início'
    );
  },
  '3': msg => sendReply(msg.from, '🤝 Olá! Você é um fornecedor, me diga seu nome e as empresas que você representa.'),
  '4': msg => sendReply(msg.from,
    '💻 No momento estou criando apenas Chatbot, mas em breve terei novidades!\n' +
    'Se deseja adquirir um Chatbot para sua empresa, me diga seu nome, nome da sua empresa e com o que trabalha. Logo irei lhe atender e farei um orçamento.'
  )
};

const ENERGY_SUBMENU = {
  '1': msg => {
    state.inEnergySubmenu = false;
    return sendReply(msg.from,
      '👷 *Micael Mrozinski* - Especialista em Energia Solar\n' +
      '👉 https://wa.me/556699543475\n' +
      'Horário: Seg–Sex, 7h–18h'
    );
  },
  '2': msg => {
    state.inEnergySubmenu = false;
    return sendReply(msg.from,
      '🌞 *COMO FUNCIONA A ENERGIA SOLAR?*\n\n' +
      '1. *CAPTAÇÃO* - Painéis convertem luz em eletricidade\n' +
      '2. *CONVERSÃO* - Inversor adapta para sua casa\n' +
      '3. *ECONOMIA* - Até 95% de redução na conta\n\n' +
      '🔗 Detalhes: https://www.neosolar.com.br/media/wysiwyg/Energia_Solar_Fotovoltaica_Esquema_Sistema_Off_Grid_1.jpg'
    );
  }
};

// Eventos do cliente
client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('🤖 Bot do Micael online.'));
client.on('auth_failure', () => {
  console.error('⚠️ Falha na autenticação, limpe a session e tente novamente.');
});
client.on('disconnected', () => {
  console.log('🔌 Desconectado. Reconectando...');
  client.initialize();
});

client.on('message', async msg => {
  try {
    if (!msg.from.endsWith('@c.us')) return;
    if (!isWithinWorkingHours()) {
      return sendReply(msg.from,
        '⏰ Fora de expediente!\n' +
        `Horário: Seg–Sex ${WORK_HOURS.weekdays.start}h–${WORK_HOURS.weekdays.end}h, ` +
        `Sáb ${WORK_HOURS.saturday.start}h–${WORK_HOURS.saturday.end}h.\n` +
        'Retornarei assim que possível.'
      );
    }

    const body = msg.body.trim();
    const isMenuTrigger = /^(MENU|INICIAR|OLÁ|OLA|OI)$/i.test(body);

    if (state.inEnergySubmenu) {
      const handler = ENERGY_SUBMENU[body];
      if (handler) return handler(msg);
    } else if (isMenuTrigger || !/^[1-4]$/.test(body)) {
      state.inEnergySubmenu = false;
      return sendReply(msg.from,
        '👋 Olá! Eu sou o *Micael Mrozinski*! Em que posso ajudar?\n\n' +
        '1️⃣ Materiais de construção (Construfacil)\n' +
        '2️⃣ Energia solar (EK Energia Solar)\n' +
        '3️⃣ Fornecedores\n' +
        '4️⃣ Programas para computador (Chatbot)'
      );
    } else {
      const handler = MAIN_MENU[body];
      if (handler) return handler(msg);
    }

    // Fallback
    return sendReply(msg.from, '❓ Comando não reconhecido. Digite *menu* para voltar.');
  } catch (err) {
    console.error('❗ Erro ao processar mensagem:', err);
  }
});

client.initialize();
