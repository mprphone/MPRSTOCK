<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MPRSTOCK

Validador de Ficheiros de Inventário (CSV, Excel, PDF) em conformidade com a Portaria n.º 2/2015.

## Funcionalidades

*   **Validação de Ficheiros**: Carregue ficheiros CSV, XLS, XLSX para validação de estrutura e dados.
*   **Extração por IA**: Carregue ficheiros PDF e utilize a IA do Google Gemini para extrair os dados do inventário.
*   **Correção Interativa**: Edite e corrija os dados diretamente na interface.
*   **Exportação**: Exporte o inventário validado para os formatos CSV e XML (SAFT-PT).

## Executar Localmente

**Pré-requisitos:** [Node.js](https://nodejs.org/)

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/mprphone/MPRSTOCK.git
    cd MPRSTOCK
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure as Variáveis de Ambiente:**
    Crie um ficheiro `.env.local` na raiz do projeto e adicione a sua chave de API do Google Gemini:
    ```
    GEMINI_API_KEY="A_SUA_CHAVE_DE_API_AQUI"
    VITE_APP_VERSION="v1.0.0-local"
    ```

4.  **Execute a aplicação (Frontend + Backend):**
    ```bash
    npm run dev:all
    ```
    *   O Frontend estará disponível em `http://localhost:3001`.
    *   O Backend estará a correr em `http://localhost:8080`.

## Implementação (Deploy)

Este projeto está configurado para ser implementado na Vercel.

1.  Faça o push do seu código para o repositório GitHub.
2.  Importe o projeto na Vercel a partir do seu repositório GitHub.
3.  Configure as seguintes variáveis de ambiente no painel da Vercel:
    *   `GEMINI_API_KEY`: A sua chave de API do Google Gemini.
    *   `VITE_APP_VERSION`: A versão da sua aplicação (ex: `v1.0.0`).
