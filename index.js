// /home/ubuntu/programas/inventarios/index.js

// Importa as bibliotecas necessárias
require('dotenv').config(); // Carrega as variáveis de ambiente do ficheiro .env
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { formidable } = require('formidable'); // Biblioteca para processar uploads
const { GoogleGenerativeAI } = require("@google/genai");

// --- Configuração da IA ---
const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest'; // Usa a variável de ambiente com um fallback
const genAI = new GoogleGenerativeAI(apiKey);

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
app.post('/api/parse-pdf', async (req, res) => {
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

    // --- LÓGICA DE PROCESSAMENTO COM IA ---
    const runAI = async () => {
      try {
        if (!apiKey) {
          throw new Error("A chave de API do Gemini não está configurada no servidor.");
        }
        console.log(`🤖 A iniciar processamento com IA usando o modelo: ${modelName}`);

        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `Analisa este documento de inventário. Extrai os produtos e devolve APENAS um array de objetos JSON com a seguinte estrutura: { "code": "string", "description": "string", "quantity": number, "unitValue": number, "type": "M" | "P" | "A" | "S" | "T", "unit": "string" }. Não inclua mais nenhum texto ou formatação na resposta.`;

        const imagePart = {
          inlineData: {
            data: fs.readFileSync(file.filepath).toString("base64"),
            mimeType: file.mimetype,
          },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        
        // Limpa a resposta da IA para garantir que é um JSON válido
        const cleanedJson = responseText.replace(/```json\n?/, '').replace(/```/, '').trim();
        const parsedProducts = JSON.parse(cleanedJson);

        console.log(`✅ IA processou ${parsedProducts.length} produtos.`);
        res.status(200).json(parsedProducts);

      } catch (aiError) {
        console.error("❌ Erro durante o processamento com IA:", aiError);
        res.status(500).json({ error: 'Falha ao analisar o documento com a IA.' });
      } finally {
        // Limpa o ficheiro temporário
        fs.unlinkSync(file.filepath);
      }
    }

    runAI();
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