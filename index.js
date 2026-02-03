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
// Configuração de CORS para desenvolvimento e produção (Vercel)
const allowedOrigins = ['http://localhost:3001'];
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido por CORS'));
    }
  },
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Permite que o servidor entenda JSON nos corpos dos pedidos.
app.use(express.json());

// --- Lógica de Validação (Portaria n.º 2/2015) ---
const validateProduct = (p) => {
  const errors = [];
  let suggestion = "";

  // Assegura que os valores são strings para as validações
  const pCode = p.code ? String(p.code) : '';
  const pDescription = p.description ? String(p.description) : '';
  const pUnit = p.unit ? String(p.unit) : '';

  // 1. Verificações de Presença
  if (!pCode || pCode.trim() === "" || pCode === "SEM-COD") {
    errors.push("Identificador do Produto (ProductCode) é obrigatório.");
    suggestion = "Falta a referência do artigo.";
  }
  if (!pDescription || pDescription.trim() === "" || pDescription === "DESCRIÇÃO EM FALTA") {
    errors.push("Descrição do Produto (ProductDescription) é obrigatória.");
    suggestion = "Falta a designação comercial.";
  }

  // 2. Verificações de Comprimento Máximo
  if (pCode.length > 60) {
    errors.push(`Código excede 60 carateres (Atual: ${pCode.length}).`);
  }
  if (pDescription.length > 200) {
    errors.push(`Descrição excede 200 carateres (Atual: ${pDescription.length}).`);
  }
  if (pUnit.length > 20) {
    errors.push(`Unidade excede 20 carateres (Atual: ${pUnit.length}).`);
  }

  // 3. Verificação de Categoria
  if (!p.type || !['M', 'P', 'A', 'S', 'T'].includes(p.type)) {
    errors.push("Categoria inválida. Deve ser M, P, A, S ou T.");
  }

  return { errors, suggestions: suggestion };
};

// Endpoints da API

/**
 * @route   POST /api/parse-pdf
 * @desc    Recebe um ficheiro PDF, usa IA para o analisar e devolve os dados dos produtos.
 */
app.post('/api/parse-pdf', async (req, res) => {
  const form = formidable({});

  if (!apiKey) {
    return res.status(500).json({ error: "A chave de API do Gemini não está configurada no servidor." });
  }

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
        
        // --- NOVO LOG DE DEPURAÇÃO ---
        console.log("--- Resposta Bruta da IA ---");
        console.log(responseText);
        console.log("--------------------------");

        // Limpa a resposta da IA para garantir que é um JSON válido
        const cleanedJson = responseText.replace(/```json\n?/, '').replace(/```/, '').trim();
        const parsedProducts = JSON.parse(cleanedJson);

        // Valida cada produto extraído pela IA
        const validatedProducts = parsedProducts.map((product, index) => {
          const { errors, suggestions } = validateProduct(product);
          return {
            ...product,
            id: `pdf-${Date.now()}-${index}`, // Adiciona um ID único
            errors: errors || [],
            suggestions: suggestions || ''
          };
        });

        console.log(`✅ IA processou e validou ${validatedProducts.length} produtos.`);
        res.status(200).json(validatedProducts);

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