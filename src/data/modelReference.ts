/** Referências visuais validadas usadas somente para orientar a IA de produção. */
export type ModelReference = {
  id: string;
  categoria: string;
  modelo: string;
  descricaoTecnica: string;
  quantidadeFotosAnalisadas: number;
  caminhoFonte: string;
  statusValidacao: string;
};

export const modelReferences: readonly ModelReference[] = [
  {
    "id": "zeabur_001",
    "categoria": "Blusa",
    "modelo": "Blusa Elastéx",
    "descricaoTecnica": "Blusa curta de modelagem solta e arredondada, com decote em V profundo e mangas curtas amplas, formadas com bastante folga desde a cava. O corpo possui volume leve e termina em barra franzida com elástico, que ajusta a peça à cintura e cria efeito blusado. Os ombros são pouco estruturados e o caimento é fluido. Não há fechamento frontal aparente; o ajuste principal é feito pelo elástico da barra.",
    "quantidadeFotosAnalisadas": 1,
    "caminhoFonte": "Blusa/Blusa Elastéx",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_002",
    "categoria": "Blusa",
    "modelo": "Blusa GG",
    "descricaoTecnica": "Blusa de modelagem ampla, comprimento até a linha do quadril e mangas curtas largas. O decote é em V e possui abertura frontal parcial com fechamento por botões. O corpo segue corte reto e folgado, com bastante espaço no busto, cintura e quadris. A peça apresenta barra regular e caimento leve, sem estrutura rígida. A construção foi pensada para vestir com conforto e pouca aderência ao corpo.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Blusa/Blusa GG",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_003",
    "categoria": "Blusa",
    "modelo": "Blusa Lenço",
    "descricaoTecnica": "Blusa sem mangas, de modelagem muito ampla em formato de lenço. Possui decote redondo aberto, alças largas integradas ao corpo e laterais que descem em pontas alongadas. A barra é assimétrica, com laterais mais compridas e região central mais curta, formando silhueta triangular. O corpo é solto, sem marcação de cintura ou fechamento aparente, com caimento leve e bastante movimento.",
    "quantidadeFotosAnalisadas": 1,
    "caminhoFonte": "Blusa/Blusa Lenço",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_004",
    "categoria": "Blusa",
    "modelo": "Blusa Manga Lenço",
    "descricaoTecnica": "Blusa de corpo reto e solto, com decote em V e pequena abertura central no colo. As mangas são no estilo lenço: muito largas, abertas e fluidas, com bordas que formam pontas e criam movimento lateral. O comprimento chega aproximadamente ao quadril e a barra é regular. A peça não apresenta ajuste marcado na cintura nem fechamento frontal completo, mantendo silhueta ampla e confortável.",
    "quantidadeFotosAnalisadas": 1,
    "caminhoFonte": "Blusa/Blusa Manga Lenço",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_005",
    "categoria": "Blusa",
    "modelo": "Blusa Transpassada",
    "descricaoTecnica": "Blusa de modelagem ampla e fluida, com frente transpassada que forma decote em V profundo. Possui mangas longas e soltas, com volume suave e caimento leve. A barra é ajustada por amarração frontal, criando efeito blusado e permitindo regular a altura e a largura na cintura. O comprimento é curto a regular, os ombros têm construção macia e a silhueta combina amplitude nas mangas com concentração de tecido no nó frontal.",
    "quantidadeFotosAnalisadas": 1,
    "caminhoFonte": "Blusa/Blusa Transpassada",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_006",
    "categoria": "Calça",
    "modelo": "Calça Pantalona",
    "descricaoTecnica": "Calça longa de cintura alta com cós largo franzido por elástico, proporcionando ajuste sem fechamento rígido. A modelagem é solta desde o quadril e se amplia em direção à barra, formando pernas bem largas no estilo pantalona. O gancho é convencional, o tecido cai de forma fluida e o comprimento alcança os pés. A silhueta é alongada, ampla e confortável, sem pregas estruturadas visíveis.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Calça/Calça Pantalona",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_007",
    "categoria": "Camisas",
    "modelo": "Com botão",
    "descricaoTecnica": "Camisa de modelagem reta e folgada, com gola tradicional, abertura frontal completa e fechamento por sequência de botões. Possui mangas curtas amplas, ombros levemente caídos e comprimento até a região do quadril. A barra é regular e o corpo não apresenta pences ou marcação acentuada de cintura. Pode ser usada fechada ou aberta como sobreposição, mantendo caimento leve e confortável.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Camisas/Com botão",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_008",
    "categoria": "Conjunto",
    "modelo": "Conjunto Resort Três Peças",
    "descricaoTecnica": "Conjunto coordenado composto por três peças: top curto, terceira peça aberta e parte inferior. O top possui alças, busto modelado e amarração frontal, permitindo ajuste. A terceira peça tem construção de kimono, frente totalmente aberta, mangas amplas e comprimento alongado. A parte inferior completa a composição com cintura ajustada e modelagem confortável. O conjunto prioriza sobreposição, leveza e mobilidade, equilibrando uma peça superior ajustável com camadas externas fluidas.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Conjunto Resort Três Peças",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_009",
    "categoria": "Conjunto",
    "modelo": "Conjunto de lãzinha",
    "descricaoTecnica": "Conjunto de duas peças composto por blusa de mangas longas e calça. A blusa possui decote redondo, corpo reto e amplo, ombros suavemente caídos, mangas compridas e punhos ajustados. O comprimento cobre parcialmente o quadril. A calça apresenta cintura elástica, pernas afuniladas e acabamento justo nos tornozelos. A modelagem geral é macia, aconchegante e voltada ao conforto, sem estruturas ou fechamentos rígidos aparentes.",
    "quantidadeFotosAnalisadas": 1,
    "caminhoFonte": "Conjunto de lãzinha",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_010",
    "categoria": "Kimonos",
    "modelo": "Kimono Avulso",
    "descricaoTecnica": "Terceira peça de modelagem ampla e alongada, com frente completamente aberta e sem fechamento fixo. Possui mangas longas e largas, cavas baixas e faixa contínua acompanhando o decote e as bordas frontais. O corpo segue corte reto, sem marcação de cintura, e termina em barra solta. O caimento é fluido e vertical, adequado para sobreposição. As imagens mostram frente aberta e parte posterior ampla.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Kimonos/Kimono Avulso",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_011",
    "categoria": "Macacão",
    "modelo": "Macacão Frente Única",
    "descricaoTecnica": "Macacão longo de frente única, sustentado por alças que contornam ou se unem atrás do pescoço, deixando ombros, braços e grande parte das costas expostos. O decote frontal é profundo e o corpo se ajusta na região do busto e da cintura. A parte inferior possui pernas longas e amplas, com caimento próximo ao de uma pantalona. A silhueta é alongada e combina parte superior aberta com volume fluido nas pernas.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Macacão/Macacão Frente Única",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_012",
    "categoria": "Macacão",
    "modelo": "Macacão Lu",
    "descricaoTecnica": "Macacão longo sem mangas, com alças largas e decote redondo suavemente aberto. O corpo apresenta modelagem extremamente ampla e contínua, sem marcação evidente de cintura, formando laterais largas e pernas de grande volume. A barra é longa e solta, e o tecido cai de maneira fluida desde as cavas. A peça tem silhueta confortável, minimalista e pouco estruturada, com aparência próxima a um vestido amplo dividido em pernas.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Macacão/Macacão Lu",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_013",
    "categoria": "Macacão",
    "modelo": "Macacão Sandra",
    "descricaoTecnica": "Macacão longo sem mangas, com alças largas, decote arredondado e corpo de modelagem solta. A cintura recebe leve concentração ou ajuste, criando transição discreta entre a parte superior e as pernas. A parte inferior é ampla e comprida, com volume uniforme e caimento fluido. A construção é simples, sem fechamento frontal aparente, priorizando conforto, mobilidade e uma silhueta vertical pouco estruturada.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Macacão/Macacão Sandra",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_014",
    "categoria": "Macacão",
    "modelo": "Macacão Sandra de Manga",
    "descricaoTecnica": "Macacão longo com decote em V e mangas médias amplas, de construção solta. O corpo possui modelagem reta a levemente acinturada e segue para pernas compridas e largas, com caimento contínuo. A cintura é marcada de forma suave, sem cós rígido aparente. A peça combina cobertura dos braços com silhueta alongada, mantendo ombros macios, volume confortável e acabamento de barra ampla.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Macacão/Macacão Sandra de Manga",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_015",
    "categoria": "Macacão",
    "modelo": "Macacão Saruel",
    "descricaoTecnica": "Macacão de peça única com parte superior transpassada, decote em V e mangas curtas muito amplas, semelhantes a mangas lenço. A cintura é concentrada por faixa ou elástico, destacando a transição para a parte inferior. A calça possui modelagem saruel, com gancho rebaixado, bastante volume entre quadris e coxas e pernas que afunilam. O resultado é uma silhueta solta, confortável e com forte mobilidade.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Macacão/Macacão Saruel",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_016",
    "categoria": "Macacão",
    "modelo": "Macacão Stephany",
    "descricaoTecnica": "Macacão longo sem mangas, com alças largas e decote arredondado. O corpo possui modelagem reta e confortável, com cintura pouco marcada e pernas compridas de largura moderada. A região superior é simples e contínua, sem abertura frontal aparente. O caimento é leve e vertical, com volume distribuído de maneira uniforme. A peça oferece cobertura ampla do tronco e das pernas, mantendo construção descomplicada.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Macacão/Macacão Stephany",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_017",
    "categoria": "Macacão",
    "modelo": "Macacão de Zíper",
    "descricaoTecnica": "Macacão longo com mangas curtas, gola com lapelas e abertura frontal por zíper. O fechamento vertical permite regular o decote e facilita o vestir. A cintura é marcada por faixa integrada ou amarração, enquanto a parte inferior apresenta pernas compridas e amplas. O corpo tem construção semelhante a uma peça de alfaiataria leve, com ombros definidos de forma suave, bolsos aparentes e silhueta alongada.",
    "quantidadeFotosAnalisadas": 1,
    "caminhoFonte": "Macacão/Macacão de Zíper",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_018",
    "categoria": "Macaquinho",
    "modelo": "Macaquinho Transpassado",
    "descricaoTecnica": "Macaquinho curto com parte superior transpassada, decote em V e mangas curtas amplas. A cintura é marcada por faixa larga para amarração, permitindo ajustar a peça ao corpo e criar efeito envelope. A parte inferior possui shorts soltos, com barra ampla e comprimento curto. A modelagem equilibra volume nas mangas e nos shorts com concentração na cintura, formando silhueta leve, confortável e bem definida.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Macaquinho/Macaquinho Transpassado",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_019",
    "categoria": "Regata",
    "modelo": "Regata Estampada",
    "descricaoTecnica": "Regata sem mangas de modelagem reta e levemente solta, com decote redondo e cavas médias. As alças são largas e integradas ao corpo, oferecendo boa cobertura dos ombros. O comprimento alcança aproximadamente o quadril e a barra é regular. A peça não possui fechamento, recortes estruturados ou ajuste de cintura aparentes. O caimento é simples, leve e confortável, adequado para uso isolado ou em sobreposição.",
    "quantidadeFotosAnalisadas": 1,
    "caminhoFonte": "Regata/Regata Estampada",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_020",
    "categoria": "Regata",
    "modelo": "Regata Lisa",
    "descricaoTecnica": "Regata sem mangas confeccionada em material de aparência canelada, com decote redondo fechado a médio e alças largas. A modelagem é ajustada ao tronco, acompanhando busto e cintura sem excesso de volume. As cavas têm acabamento reforçado e a barra é reta, com comprimento na altura do quadril. Não há fechamento aparente. A silhueta é básica, limpa e próxima ao corpo.",
    "quantidadeFotosAnalisadas": 1,
    "caminhoFonte": "Regata/Regata Lisa",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_021",
    "categoria": "Saia",
    "modelo": "Saia",
    "descricaoTecnica": "Saia longa de cintura alta com cós largo franzido por elástico. A modelagem é ampla e fluida, abrindo gradualmente a partir da cintura até a barra. O comprimento alcança os pés e a construção não apresenta fechamento rígido visível. O volume é distribuído de maneira uniforme, criando movimento e silhueta em formato evasê suave. O ajuste principal acontece no cós elástico.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Saia/Saia",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_022",
    "categoria": "Saia",
    "modelo": "Saia Longa (Midi)",
    "descricaoTecnica": "Saia de comprimento midi a longo, com cintura alta e cós largo franzido por elástico. A peça possui modelagem ampla, corte reto a levemente evasê e tecido distribuído em pregas suaves decorrentes do franzido. A barra é larga e solta, proporcionando movimento. Não há zíper, botões ou amarração aparentes; o vestir e o ajuste são feitos pelo elástico da cintura.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Saia/Saia Longa (Midi)",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_023",
    "categoria": "Short",
    "modelo": "Short de Linho",
    "descricaoTecnica": "Short de cintura alta com cós largo franzido por elástico e cordão de ajuste. Possui modelagem solta, quadril confortável e pernas amplas, com comprimento curto. A frente apresenta bolsos laterais ou oblíquos e leve formação de pregas pelo franzido do cós. A barra é reta e livre, sem punho. A silhueta é casual, arejada e pouco aderente às pernas.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Short/Short de Linho",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_024",
    "categoria": "Short",
    "modelo": "Shortinho",
    "descricaoTecnica": "Short curto de cintura alta, com cós elástico largo e franzido. A modelagem é confortável, com espaço no quadril e pernas levemente abertas. Possui bolsos laterais visíveis e barra reta, sem acabamento ajustado. Não apresenta zíper ou botões aparentes; o cós elástico concentra o tecido e permite vestir com facilidade. A silhueta é simples, leve e solta.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Short/Shortinho",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_025",
    "categoria": "Vestido curto",
    "modelo": "Vestido Envelope Curto",
    "descricaoTecnica": "Vestido curto de modelagem envelope, com frente transpassada e decote em V. Possui mangas curtas a médias, soltas e amplas, além de faixa para amarração na cintura, responsável pelo fechamento e pelo ajuste. A saia tem corte evasê, comprimento acima dos joelhos e barra fluida. O cruzamento frontal cria sobreposição no busto e na saia, formando silhueta acinturada e regulável.",
    "quantidadeFotosAnalisadas": 1,
    "caminhoFonte": "Vestido curto/Vestido Envelope Curto",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_026",
    "categoria": "Vestido curto",
    "modelo": "Vestido Hellen",
    "descricaoTecnica": "Vestido curto com decote em V, mangas longas amplas e cintura marcada por faixa larga para amarração frontal. A parte superior apresenta volume suave e construção transpassada ou sobreposta. A saia é curta, solta e levemente evasê, com barra fluida. As mangas possuem bastante tecido e estreitam discretamente próximas aos punhos. A silhueta concentra o ajuste na cintura e mantém movimento no busto, braços e saia.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido curto/Vestido Hellen",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_027",
    "categoria": "Vestido curto",
    "modelo": "Vestido Midi 3/4 (Preço de Longo)",
    "descricaoTecnica": "Vestido de comprimento midi, com decote em V, mangas curtas amplas e corpo solto. A cintura é suavemente marcada, conduzindo a uma saia ampla com recortes horizontais e camadas franzidas. A barra possui bastante volume e termina abaixo dos joelhos. A modelagem combina parte superior confortável com saia em formato evasê, criando movimento e silhueta alongada sem aderência excessiva.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido curto/Vestido Midi 3 4 (Preço de Longo)",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_028",
    "categoria": "Vestido curto",
    "modelo": "Vestido de Alcinha Curto",
    "descricaoTecnica": "Vestido curto sem mangas, sustentado por alças finas e reguláveis. Possui decote reto a suavemente arredondado, corpo pouco estruturado e modelagem solta. A cintura é discretamente definida antes de uma saia curta e fluida, com barra ampla. As costas permanecem abertas na região superior e as alças fazem o principal suporte. A silhueta é leve, simples e adequada a movimentos livres.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido curto/Vestido de Alcinha Curto",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_029",
    "categoria": "Vestido curto",
    "modelo": "Vestido de Babado Gata-da-Mata",
    "descricaoTecnica": "Vestido curto com alças finas, decote reto e corpo ajustado de forma suave. A cintura é marcada e dá origem a uma saia em camadas, com babados franzidos que aumentam o volume em direção à barra. O comprimento fica acima dos joelhos. As costas apresentam acabamento simples e sustentação pelas alças. A silhueta combina parte superior compacta com saia leve, rodada e de bastante movimento.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido curto/Vestido de Babado Gata-da-Mata",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_030",
    "categoria": "Vestido curto",
    "modelo": "Vestido de Peitinho Curto",
    "descricaoTecnica": "Vestido curto com busto modelado por recortes e decote em V, sustentado por alças finas. A região do tronco é mais ajustada e a cintura fica marcada. A saia é curta, ampla e levemente evasê, abrindo abaixo da cintura. As costas possuem construção ajustável ou franzida para acomodação do busto. A peça cria silhueta feminina, com destaque estrutural na parte superior e movimento na saia.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido curto/Vestido de Peitinho Curto",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_031",
    "categoria": "Vestido curto",
    "modelo": "Vestido de Saída Curto",
    "descricaoTecnica": "Vestido curto de modelagem ampla, com decote em V profundo, mangas curtas largas e corpo solto. A cintura é marcada por faixa para amarração frontal, permitindo regular o ajuste. A saia possui comprimento acima dos joelhos, corte evasê e barra fluida. A construção leve e pouco estruturada favorece o uso como sobreposição, mantendo abertura confortável no colo e bastante movimento nas mangas e na saia.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido curto/Vestido de Saída Curto",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_032",
    "categoria": "Vestido longo",
    "modelo": "Vestido 3 Marias",
    "descricaoTecnica": "Vestido longo sem mangas, com alças médias e decote reto a suavemente arredondado. O corpo é ajustado de maneira leve até a cintura, onde começa uma saia ampla formada por três seções horizontais franzidas. Cada recorte acrescenta volume progressivo, produzindo barra larga e movimento abundante. O comprimento alcança os pés e a silhueta é alongada, com parte superior simples e saia em camadas.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido longo/Vestido 3 Marias",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_033",
    "categoria": "Vestido longo",
    "modelo": "Vestido Cordinha",
    "descricaoTecnica": "Vestido longo com decote em V, mangas curtas amplas e ajuste por cordão ou amarração na cintura. O corpo superior é solto e levemente blusado. A saia é comprida, ampla e construída com recortes horizontais franzidos, formando camadas de volume até a barra. O modelo permite regular a cintura sem estrutura rígida e combina cobertura dos ombros com caimento fluido e movimento na parte inferior.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido longo/Vestido Cordinha",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_034",
    "categoria": "Vestido longo",
    "modelo": "Vestido Envelope",
    "descricaoTecnica": "Vestido longo de construção envelope, com frente transpassada, decote em V e mangas curtas amplas. A cintura é fechada e ajustada por faixa de amarração, criando definição marcada. A saia é longa, larga e sobreposta na parte frontal, com caimento fluido. O modelo permite adaptação ao corpo por meio do transpasse e da faixa, equilibrando parte superior solta com cintura ajustada e barra de bastante movimento.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido longo/Vestido Envelope",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_035",
    "categoria": "Vestido longo",
    "modelo": "Vestido Frente Única",
    "descricaoTecnica": "Vestido longo de frente única, com alças que se unem ou amarram atrás do pescoço e deixam ombros, braços e costas expostos. O busto possui decote profundo e acabamento ajustável. A cintura é marcada, e a saia abre em modelagem ampla e longa, com volume progressivo até a barra. A silhueta destaca a parte superior aberta e alonga o corpo por meio da saia fluida.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido longo/Vestido Frente Única",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_036",
    "categoria": "Vestido longo",
    "modelo": "Vestido Marina",
    "descricaoTecnica": "Vestido longo com decote em V, mangas curtas amplas e cintura definida por recorte ou faixa. A parte superior apresenta leve volume e caimento solto. A saia é comprida, ampla e formada por recortes horizontais franzidos, que criam camadas e movimento. O comprimento alcança os pés. A construção combina cobertura dos braços, cintura marcada e volume distribuído progressivamente na parte inferior.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido longo/Vestido Marina",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_037",
    "categoria": "Vestido longo",
    "modelo": "Vestido Midi 3/4",
    "descricaoTecnica": "Vestido de comprimento midi, com decote em V e mangas médias volumosas, franzidas nos ombros e ajustadas nos punhos por elástico. A cintura possui amplo painel de lastex ou franzido elástico, definindo o tronco com conforto. A saia abre abaixo da cintura em corte evasê, com barra larga abaixo dos joelhos. A silhueta combina mangas marcantes, cintura elástica e saia fluida.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido longo/Vestido Midi 3 4",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_038",
    "categoria": "Vestido longo",
    "modelo": "Vestido Midi de alça",
    "descricaoTecnica": "Vestido midi sem mangas, com alças finas, decote reto e corpo ajustado na região do busto. A cintura é marcada por faixa franzida ou elástica, seguida por saia de comprimento abaixo dos joelhos e corte levemente evasê. A parte superior possui estrutura simples e as costas ficam mais abertas. A silhueta é alongada, com sustentação delicada e volume moderado na saia.",
    "quantidadeFotosAnalisadas": 1,
    "caminhoFonte": "Vestido longo/Vestido Midi de alça",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_039",
    "categoria": "Vestido longo",
    "modelo": "Vestido Reto",
    "descricaoTecnica": "Vestido longo sem mangas, com alças médias, decote reto e modelagem predominantemente tubular. O corpo desce com pouca marcação de cintura e largura relativamente constante até a barra. Possui recortes ou faixas horizontais vazadas que adicionam textura construtiva sem alterar a silhueta reta. O comprimento alcança os tornozelos ou pés, e o caimento é leve, simples e pouco volumoso.",
    "quantidadeFotosAnalisadas": 3,
    "caminhoFonte": "Vestido longo/Vestido Reto",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_040",
    "categoria": "Vestido longo",
    "modelo": "Vestido Saída",
    "descricaoTecnica": "Vestido longo de modelagem ampla, com decote em V profundo, mangas curtas largas e cintura ajustada por cordão ou faixa. A parte superior é solta e adequada para sobreposição. A saia é comprida, fluida e formada por camadas ou recortes franzidos, criando movimento até a barra. O modelo privilegia leveza, abertura no colo e ajuste regulável, sem estrutura rígida.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido longo/Vestido Saída",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_041",
    "categoria": "Vestido longo",
    "modelo": "Vestido Sereia",
    "descricaoTecnica": "Vestido longo com decote em V, mangas curtas amplas e cintura marcada. A modelagem acompanha o tronco, a cintura e parte dos quadris antes de se ampliar gradualmente em direção à barra, formando silhueta sereia suavizada. A saia possui recortes franzidos que acrescentam volume na região inferior. O comprimento alcança os pés e combina ajuste superior com movimento concentrado na barra.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido longo/Vestido Sereia",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_042",
    "categoria": "Vestido longo",
    "modelo": "Vestido Tomara que Caia",
    "descricaoTecnica": "Vestido longo sem alças, com decote reto e busto ajustado por faixa franzida ou elástica. A região superior permanece firme ao redor do tórax, deixando ombros, braços e costas expostos. A cintura é suavemente marcada e a saia desce longa e ampla, com caimento fluido. O modelo cria silhueta vertical e limpa, concentrando sustentação no acabamento elástico do busto.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido longo/Vestido Tomara que Caia",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_043",
    "categoria": "Vestido longo",
    "modelo": "Vestido V",
    "descricaoTecnica": "Vestido longo com decote em V profundo, mangas curtas amplas e corpo transpassado ou sobreposto na parte superior. A cintura é marcada e conduz a uma saia longa de corte evasê, com camadas franzidas e bastante movimento. As costas mantêm cobertura semelhante à frente e a barra é larga. A silhueta equilibra abertura no colo, definição de cintura e volume fluido na parte inferior.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido longo/Vestido V",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_044",
    "categoria": "Vestido longo",
    "modelo": "Vestido de Botão",
    "descricaoTecnica": "Vestido longo sem mangas, com gola tradicional e abertura frontal completa fechada por sequência de botões. Possui alças largas ou ombros recortados, corpo reto a levemente acinturado e saia ampla com recortes horizontais franzidos. O fechamento permite abrir a peça em diferentes alturas. O comprimento alcança os pés e a construção combina elementos de camisa com volume fluido de vestido longo.",
    "quantidadeFotosAnalisadas": 1,
    "caminhoFonte": "Vestido longo/Vestido de Botão",
    "statusValidacao": "validado_por_imagens"
  },
  {
    "id": "zeabur_045",
    "categoria": "Vestido longo",
    "modelo": "Vestido de Peitinho",
    "descricaoTecnica": "Vestido longo com busto modelado por recortes, decote em V e alças finas. A parte superior é ajustada e destaca a região do busto, enquanto a cintura fica definida. A saia abre em corte evasê e possui camadas ou recortes franzidos, criando volume progressivo até a barra. As costas apresentam acabamento ajustável ou elástico. A silhueta combina sustentação delicada, cintura marcada e saia fluida.",
    "quantidadeFotosAnalisadas": 2,
    "caminhoFonte": "Vestido longo/Vestido de Peitinho",
    "statusValidacao": "validado_por_imagens"
  }
];

