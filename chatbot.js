// Leitor de QR code e persistência de sessão (pronto para nuvem)
try { require('dotenv').config(); } catch (e) { console.warn('⚠️ dotenv não encontrado, usando valores padrão.'); }
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Cria diretório de sessão
const SESSION_PATH = process.env.SESSION_PATH || path.join(__dirname, 'session_data');
if (!fs.existsSync(SESSION_PATH)) fs.mkdirSync(SESSION_PATH, { recursive: true });

// Etiquetas coloridas
const LABELS = { materials:'🟧', solar:'🟡', suppliers:'🟦', chatbot:'🟩', info:'⚪' };

// Horário de expediente
const WORK_HOURS = {
  weekdays: { start: parseInt(process.env.WEEK_START_HOUR)||7, end: parseInt(process.env.WEEK_END_HOUR)||18 },
  saturday: { start: parseInt(process.env.SAT_START_HOUR)||7, end: parseInt(process.env.SAT_END_HOUR)||12 }
};

// Estado por chat
const chatStates = new Map();

// Inicializa cliente
const client = new Client({ authStrategy:new LocalAuth({ dataPath:SESSION_PATH }), puppeteer:{ headless:true, args:['--no-sandbox','--disable-setuid-sandbox'] } });

// Converte para horário de São Paulo
function getLocalDate(d=new Date()){ return new Date(d.toLocaleString('en-US',{ timeZone:process.env.TZ||'America/Sao_Paulo' })); }

// Verifica expediente
function isWithinWorkingHours(date=new Date()){
  const dt = getLocalDate(date), day=dt.getDay(), h=dt.getHours();
  if(day>=1&&day<=5) return h>=WORK_HOURS.weekdays.start&&h<WORK_HOURS.weekdays.end;
  if(day===6) return h>=WORK_HOURS.saturday.start&&h<WORK_HOURS.saturday.end;
  return false;
}

// Inicia janela de conversa de 3min e pausa de 2h
function openConversationWindow(state){
  const now = Date.now();
  state.windowEnd = now + 3*60*1000;
  state.pauseUntil = state.windowEnd + 2*60*60*1000;
}

// Decide se deve responder
function canRespond(state){
  const now = Date.now();
  if(!state.windowEnd || now>=state.pauseUntil){ openConversationWindow(state); return true; }
  if(now<state.windowEnd) return true;
  return false;
}

// Reset chat state if new
function getState(chatId){
  if(!chatStates.has(chatId)) chatStates.set(chatId,{});
  return chatStates.get(chatId);
}

// Envia mensagem
async function sendReply(to,text){ await client.sendMessage(to,text+" ↪️ Digite *menu* para voltar ao menu principal"); }

// Handlers de menu
const MAIN_MENU = {
  '1': msg=>sendReply(msg.from,`${LABELS.materials} 🛠️ Me diga o que deseja que logo irei lhe atender!`),
  '2': msg=>{
    const st=getState(msg.from);
    st.inEnergySubmenu=true;
    return sendReply(msg.from,`${LABELS.solar} 🌞 *EK Energia Solar* - Escolha:\n1️⃣ Como funciona a energia solar?`);
  },
  '3': msg=>sendReply(msg.from,`${LABELS.suppliers} 🤝 Olá! Você é um fornecedor, me diga seu nome e as empresas que você representa.`),
  '4': msg=>sendReply(msg.from,`${LABELS.chatbot} 💻 No momento crio apenas Chatbots. Para adquirir, me diga seu nome, empresa e ramo.`)
};

const ENERGY_SUBMENU = {
  '1': msg=>{
    const st=getState(msg.from);
    st.inEnergySubmenu=false;
    return sendReply(msg.from,`${LABELS.solar} 🌞 *COMO FUNCIONA A ENERGIA SOLAR?*\n`+
      `1. *CAPTAÇÃO* - Painéis convertem luz em eletricidade\n`+
      `2. *CONVERSÃO* - Inversor adapta para sua casa\n`+
      `3. *ECONOMIA* - Até 95% de redução na conta`);
  }
};

// Eventos
client.on('qr',qr=>qrcode.generate(qr,{small:true}));
client.on('ready',()=>console.log('🤖 Bot do Micael online.'));
client.on('auth_failure',()=>console.error('⚠️ Falha na autenticação.'));
client.on('disconnected',()=>{ console.log('🔌 Desconectado. Reconectando...'); client.initialize(); });

client.on('message',async msg=>{
  if(!msg.from.endsWith('@c.us')) return;
  const st=getState(msg.from);
  // Janela de conversa
  if(!canRespond(st)){
    const body=msg.body.trim();
    if(/^(MENU|INICIAR|OLÁ|OLA|OI)$/i.test(body)){
      openConversationWindow(st);
    } else return;
  }
  // Expediente
  if(!isWithinWorkingHours()) return sendReply(msg.from,`${LABELS.info} ⏰ Fora do expediente! Horário: Seg–Sex ${WORK_HOURS.weekdays.start}h–${WORK_HOURS.weekdays.end}h, Sáb ${WORK_HOURS.saturday.start}h–${WORK_HOURS.saturday.end}h.`);
  const body=msg.body.trim();
  const stLocal=getState(msg.from);
  const isMenu=/^(MENU|INICIAR|OLÁ|OLA|OI)$/i.test(body);
  // Submenu solar
  if(stLocal.inEnergySubmenu){ if(ENERGY_SUBMENU[body]) return ENERGY_SUBMENU[body](msg); }
  // Exibe menu
  if(isMenu|| !/^[1-4]$/.test(body)){
    stLocal.inEnergySubmenu=false;
    return sendReply(msg.from,`👋 Olá! Eu sou o *Micael Mrozinski*! Em que posso ajudar?\n\n1️⃣ Materiais de construção (Construfacil)\n2️⃣ Energia solar (EK Energia Solar)\n3️⃣ Fornecedores\n4️⃣ Programas para computador (Chatbot)`);
  }
  // Handler principal
  if(MAIN_MENU[body]) return MAIN_MENU[body](msg);
  // Fallback
  return sendReply(msg.from,'❓ Comando não reconhecido.');
});

client.initialize();
