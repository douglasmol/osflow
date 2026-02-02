# OS Flow - Estrutura do Projeto

## Estrutura de Arquivos Reorganizada

O projeto foi reorganizado para separar HTML, CSS e JavaScript em arquivos dedicados, melhorando a manutenibilidade e organização do código.

### Estrutura de Diretórios

```
os flow ok/
├── css/                          # Estilos CSS
│   ├── global.css               # Estilos globais compartilhados
│   ├── index.css                # Estilos específicos do Dashboard
│   ├── produtos.css             # Estilos específicos de Produtos
│   ├── servicos.css             # Estilos específicos de Serviços
│   ├── ordem-servico.css        # Estilos específicos de Ordem de Serviço
│   ├── cadastrar-clientes.css   # Estilos específicos de Cadastro de Clientes
│   ├── vendas.css               # Estilos específicos de Vendas
│   ├── garantias.css            # Estilos específicos de Garantias
│   ├── arquivos.css             # Estilos específicos de Arquivos
│   └── configuracoes.css        # Estilos específicos de Configurações
├── js/                          # Scripts JavaScript
│   ├── index.js                 # Lógica do Dashboard
│   ├── produtos.js              # Lógica de Produtos
│   ├── servicos.js              # Lógica de Serviços
│   ├── ordem-servico.js         # Lógica de Ordem de Serviço
│   ├── cadastrar-clientes.js   # Lógica de Cadastro de Clientes
│   ├── vendas.js                # Lógica de Vendas
│   ├── cobranca.js              # Lógica de Cobrança
│   ├── garantias.js             # Lógica de Garantias
│   ├── arquivos.js              # Lógica de Arquivos
│   └── configuracoes.js         # Lógica de Configurações
├── index.html                   # Dashboard Principal
├── produtos.html                # Gestão de Produtos
├── servicos.html                # Cadastro de Serviços
├── ordem-servico.html           # Ordem de Serviço
├── cadastrar-clientes.html      # Cadastro de Clientes
├── vendas.html                  # Gestão de Vendas
├── cobranca.html                # Cobrança
├── garantias.html               # Modelos de Garantia
├── arquivos.html                # Arquivos
└── configuracoes.html           # Configurações

```

### Arquivos

#### CSS
- **global.css**: Contém todos os estilos compartilhados entre as páginas:
  - Variáveis CSS (cores, fontes, espaçamentos, etc.)
  - Reset global
  - Layout base (sidebar, topbar)
  - Componentes comuns

- **[pagina].css**: Estilos específicos de cada página

#### JavaScript
- **[pagina].js**: Lógica e funcionalidades específicas de cada página

#### HTML
- Cada arquivo HTML referencia:
  - `css/global.css` (sempre)
  - `css/[pagina].css` (quando aplicável)
  - `js/[pagina].js` (quando aplicável)

### Benefícios da Reorganização

1. **Manutenibilidade**: Código mais fácil de manter e atualizar
2. **Reutilização**: Estilos globais compartilhados evitam duplicação
3. **Performance**: Cache de arquivos CSS/JS compartilhados
4. **Organização**: Estrutura clara e profissional
5. **Separação de Responsabilidades**: HTML, CSS e JS em arquivos dedicados

### Páginas Disponíveis

1. **Dashboard** (`index.html`) - Visão geral e estatísticas
2. **Produtos** (`produtos.html`) - Gestão de produtos
3. **Serviços** (`servicos.html`) - Cadastro de serviços
4. **Ordem de Serviço** (`ordem-servico.html`) - Gerenciamento de OS
5. **Cadastrar Clientes** (`cadastrar-clientes.html`) - Cadastro de clientes
6. **Vendas** (`vendas.html`) - Gestão de vendas
7. **Cobrança** (`cobranca.html`) - Cobrança e pagamentos
8. **Garantias** (`garantias.html`) - Modelos de garantia
9. **Arquivos** (`arquivos.html`) - Gerenciamento de arquivos
10. **Configurações** (`configuracoes.html`) - Configurações do sistema

### Como Executar

Para visualizar o projeto localmente, use um servidor HTTP simples:

```bash
# Com Python 3
python3 -m http.server 8000

# Com Node.js (http-server)
npx http-server

# Com PHP
php -S localhost:8000
```

Depois acesse `http://localhost:8000/index.html` no navegador.

### Notas Técnicas

- Todos os estilos inline foram extraídos para arquivos CSS
- Todo JavaScript inline foi extraído para arquivos JS
- Nenhuma funcionalidade foi alterada ou removida
- A estrutura mantém compatibilidade total com o código original
