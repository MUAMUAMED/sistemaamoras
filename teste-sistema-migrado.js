const axios = require("axios");

async function testarSistema() {
  try {
    console.log("🧪 Testando sistema após migração...");
    
    // Teste 1: Login
    const loginResponse = await axios.post("http://localhost:3001/api/auth/login", {
      email: "admin@amorascapital.com",
      password: "admin123"
    });
    
    const token = loginResponse.data.token;
    console.log("✅ Login realizado com sucesso");
    
    // Teste 2: Listar produtos
    const productsResponse = await axios.get("http://localhost:3001/api/products", {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Produtos listados: ${productsResponse.data.data.length}`);
    
    // Teste 3: Criar venda
    const products = productsResponse.data.data;
    if (products.length > 0) {
      const saleData = {
        items: [
          {
            productId: products[0].id,
            quantity: 1
          }
        ],
        paymentMethod: "PIX",
        leadName: "Cliente Teste",
        leadPhone: "11999999999"
      };
      
      const saleResponse = await axios.post("http://localhost:3001/api/sales", saleData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("✅ Venda criada com sucesso:", saleResponse.data.data.id);
    }
    
    console.log("🎉 Todos os testes passaram!");
    
  } catch (error) {
    console.error("❌ Erro no teste:", error.response?.data || error.message);
  }
}

testarSistema();
