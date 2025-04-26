module.exports = {
  apps: [
    {
      name: "chatbot",          // Nome para identificação no PM2
      script: "chatbot.js",     // Altere para o nome do seu arquivo principal
      instances: 1,             // 1 instância (pode usar "max" para usar todos os núcleos)
      autorestart: true,        // Reinicia se travar
      watch: false,             // Se quiser reiniciar se mudar arquivo, põe true (não recomendado em produção)
      max_memory_restart: "300M", // Se usar mais de 300MB reinicia (ajustável)
      error_file: "./logs/error.log",   // Arquivo para erros
      out_file: "./logs/output.log",    // Arquivo para saídas normais
      log_date_format: "YYYY-MM-DD HH:mm:ss", // Formato de data nos logs
      env: {
        NODE_ENV: "production",
        PORT: 3000,            // Exemplo de variável de ambiente
        // Adicione aqui variáveis importantes para seu bot, como tokens etc:
        // API_KEY: "sua-api-key"
      }
    }
  ]
};

