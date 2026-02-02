// /home/ubuntu/programas/inventarios/index.js

// Importa as bibliotecas necessárias
const express = require('express');
const cors = require('cors');
const { formidable } = require('formidable'); // Biblioteca para processar uploads
// A biblioteca da Google AI será usada aqui mais tarde
// const { GoogleGenerativeAI } = require("@google/genai");

// Configuração do Servidor
const app = express();
const PORT = 8080; // A porta onde o nosso servidor vai funcionar

// Middleware
// O 'cors' permite que a sua aplicação React (que corre noutra porta) faça pedidos a este servidor.
app.use(cors());
// Permite que o servidor entenda JSON nos corpos dos pedidos.
app.use(express.json());

// Endpoints da API

/**
 * @route   POST /api/parse-pdf
 * @desc    Recebe um ficheiro PDF, usa IA para o analisar e devolve os dados dos produtos.
 */
app.post('/api/parse-pdf', (req, res) => {
  const form = formidable({});

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("❌ Erro ao processar o formulário:", err);
      return res.status(500).json({ error: 'Erro ao processar o upload do ficheiro.' });
    }

    // O nome 'upload' vem do formulário no frontend: <input type="file" name="upload" ... />
    // Temos de garantir que o frontend envia o ficheiro com este nome.
    const file = Array.isArray(files.upload) ? files.upload[0] : files.upload;

    if (!file) {
      return res.status(400).json({ error: 'Nenhum ficheiro foi enviado.' });
    }

    console.log(`📄 Ficheiro recebido para processamento com IA: ${file.originalFilename} (${file.mimetype})`);

    // --- A LÓGICA DE PROCESSAMENTO COM IA IRÁ AQUI ---
    // Por agora, vamos apenas simular uma resposta de sucesso com dados de exemplo.
    try {
      console.log('🤖 A simular processamento com IA... A devolver dados de exemplo.');

      const mockProducts = [
        { code: 'PDF-001', description: 'Produto lido de PDF 1', quantity: 10, unitValue: 19.99, type: 'M', unit: 'UN' },
        { code: 'PDF-002', description: 'Produto lido de PDF 2', quantity: 5, unitValue: 10.50, type: 'P', unit: 'UN' },
      ];

      // Num cenário real, você analisaria a resposta da IA aqui.
      // const parsedProducts = JSON.parse(aiResponseText);

      // Envia os dados de exemplo de volta para a aplicação React
      res.status(200).json(mockProducts);

    } catch (aiError) {
      console.error("❌ Erro durante a simulação da IA:", aiError);
      res.status(500).json({ error: 'Falha ao analisar o documento.' });
    }
  });
});

// Rota principal para dar as boas-vindas e informar sobre a API
app.get('/', (req, res) => {
  res.status(200).json({
    message: '👋 Bem-vindo à API do MPRSTOCK!',
    description: 'Este é o backend da sua aplicação. Ele lida com o processamento de ficheiros.',
    endpoints: {
      health_check: 'GET /api/health',
      parse_pdf: 'POST /api/parse-pdf',
    },
  });
});

// Endpoint simples para verificar se o servidor está a funcionar
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Iniciar o Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de API a funcionar em http://localhost:${PORT}`);
  console.log('✅ Pronto para receber pedidos da sua aplicação React.');
  console.log('👉 Teste o servidor acedendo a http://localhost:8080/api/health');
});