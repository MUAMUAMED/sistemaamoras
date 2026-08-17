import { useQuery } from '@tanstack/react-query';
import { Mail, MessageCircle, PackageCheck, ShieldCheck, Share2 } from 'lucide-react';
import { Footer } from '../components/layout/Footer';
import { commercialApi } from '../lib/commercialApi';
import './InstitutionalPage.css';

type PageKind = 'about' | 'contact' | 'account';

const pageCopy: Record<PageKind, { eyebrow: string; title: string; lead: string }> = {
  about: {
    eyebrow: 'Amoras Capital',
    title: 'Moda com leveza, cor e personalidade.',
    lead: 'Selecionamos peças para acompanhar diferentes momentos, com uma experiência de compra simples e atendimento próximo.',
  },
  contact: {
    eyebrow: 'Atendimento',
    title: 'Como podemos ajudar?',
    lead: 'Fale com a Amoras para dúvidas sobre produtos, entrega, trocas, devoluções ou revenda.',
  },
  account: {
    eyebrow: 'Pedidos',
    title: 'Acompanhe sua compra.',
    lead: 'Cada pedido é concluído no checkout seguro. Para acompanhamento ou suporte depois da compra, fale diretamente com o atendimento.',
  },
};

function validExternalUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export function InstitutionalPage({ kind }: { kind: PageKind }) {
  const { data: settings } = useQuery({ queryKey: ['commercial-settings'], queryFn: commercialApi.settings, staleTime: 60_000 });
  const copy = pageCopy[kind];
  const hasWhatsapp = validExternalUrl(settings?.whatsappUrl);
  const hasInstagram = validExternalUrl(settings?.instagramUrl);

  return <>
    <section className="institutional-page">
      <div className="container institutional-wrap">
        <p className="institutional-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="institutional-lead">{copy.lead}</p>

        {kind === 'about' && <div className="institutional-grid">
          <article><PackageCheck size={26} /><h2>Compra com clareza</h2><p>Veja fotos, descrição, tamanho e disponibilidade antes de colocar a peça no carrinho.</p></article>
          <article><ShieldCheck size={26} /><h2>Checkout seguro</h2><p>O pagamento e os dados de entrega são preenchidos no ambiente seguro de finalização do pedido.</p></article>
          <article><MessageCircle size={26} /><h2>Atendimento próximo</h2><p>Precisou de ajuda? Os canais configurados pela loja ficam disponíveis nesta página.</p></article>
        </div>}

        {(kind === 'contact' || kind === 'account') && <div className="institutional-contact">
          <h2>Fale com a Amoras</h2>
          <p>Use um dos canais oficiais abaixo. Se um canal ainda não aparecer, ele pode ser configurado no painel comercial.</p>
          <div className="institutional-actions">
            {hasWhatsapp && <a className="institutional-button" href={settings!.whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={19} /> WhatsApp</a>}
            {hasInstagram && <a className="institutional-button institutional-button-secondary" href={settings!.instagramUrl} target="_blank" rel="noreferrer"><Share2 size={19} /> Instagram</a>}
            {!hasWhatsapp && !hasInstagram && <span className="institutional-empty"><Mail size={19} /> Canais de atendimento aguardando configuração no painel comercial.</span>}
          </div>
        </div>}
      </div>
    </section>
    <Footer />
  </>;
}
