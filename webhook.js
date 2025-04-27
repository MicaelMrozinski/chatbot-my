const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());

// Defina seu token secreto aqui
const SECRET_TOKEN = "4e3b5e5a9c7d3f5f6a9c8a1b8d9e7f4a6b1d2e3c9f7a8b0d6a5c7f8e9b2d1c3f";

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];

  if (!signature) {
    console.log('Requisição sem assinatura. Bloqueado.');
    return res.status(403).send('Forbidden: No signature');
  }

  const payload = JSON.stringify(req.body);
  const expectedSignature = 'sha256=' + crypto.createHmac('sha256', SECRET_TOKEN)
                                               .update(payload)
                                               .digest('hex');

  if (signature !== expectedSignature) {
    console.log('Assinatura inválida. Bloqueado.');
    return res.status(403).send('Forbidden: Invalid signature');
  }

  console.log('Assinatura válida! Atualizando o chatbot...');

  exec('git pull origin main && pm2 reload ecosystem.config.js', (err, stdout, stderr) => {
    if (err) {
      console.error(`Erro no deploy: ${stderr}`);
      return res.status(500).send('Erro no deploy');
    }
    console.log(`Deploy feito: ${stdout}`);
    res.status(200).send('Deploy feito com sucesso!');
  });
});

const PORT = 5000;

// Escutando em todas as interfaces IPv4 e IPv6
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Webhook escutando na porta ${PORT}`);
});
