const fs = require('fs');
const path = require('path');

// Lista de arquivos de rotas para corrigir
const routeFiles = [
  'src/routes/automation.routes.ts',
  'src/routes/barcode.ts',
  'src/routes/interactions.ts',
  'src/routes/product.routes.ts',
  'src/routes/sale.routes.ts',
  'src/routes/stock-movements.ts'
];

function fixRouteFile(filePath) {
  console.log(`Corrigindo: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Padrões para encontrar e corrigir
  const patterns = [
    // res.json(...) -> return res.json(...)
    { 
      regex: /(\s+)res\.json\(/g, 
      replacement: '$1return res.json(' 
    },
    // res.status(...).json(...) -> return res.status(...).json(...)
    { 
      regex: /(\s+)res\.status\(/g, 
      replacement: '$1return res.status(' 
    },
    // res.send(...) -> return res.send(...)
    { 
      regex: /(\s+)res\.send\(/g, 
      replacement: '$1return res.send(' 
    },
    // next(error) -> return next(error)
    { 
      regex: /(\s+)next\(/g, 
      replacement: '$1return next(' 
    }
  ];
  
  // Aplicar correções
  patterns.forEach(pattern => {
    content = content.replace(pattern.regex, pattern.replacement);
  });
  
  // Salvar arquivo corrigido
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ ${filePath} corrigido`);
}

// Corrigir todos os arquivos
routeFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fixRouteFile(file);
  } else {
    console.log(`❌ Arquivo não encontrado: ${file}`);
  }
});

console.log('\n🎉 Correção de rotas concluída!'); 