import { readFile, writeFile } from 'node:fs/promises';

const asset = async (path, mime) => {
  const data = await readFile(path);
  return `data:${mime};base64,${data.toString('base64')}`;
};

const logo = await asset('imagens/logo-43-horizontal-color-tight.png', 'image/png');
const seal = await asset('imagens/logo-43-selo-color-clean-tight.png', 'image/png');
const theme = await asset('deploy/marca-cristo-vive-claro.webp', 'image/webp');
const entrance = await asset('deploy/referencia-entrada-centro-convencoes.webp', 'image/webp');

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{--ink:#101010;--blue:#00223e;--pink:#f5017a;--paper:#f1f1f1;--white:#fff;--muted:#5c6670;--line:rgba(0,34,62,.16)}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:var(--paper);font-family:Arial,Helvetica,sans-serif;line-height:1.5}img{display:block;max-width:100%}a{color:inherit}.topbar{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:76px;padding:12px clamp(20px,5vw,72px);background:var(--paper);border-bottom:1px solid var(--line)}.brand img{width:min(230px,42vw)}nav{display:flex;gap:22px;font-size:14px;font-weight:700}nav a{text-decoration:none}.hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,340px);align-items:center;gap:clamp(28px,6vw,88px);padding:clamp(44px,7vw,80px) clamp(20px,6vw,92px);background:var(--blue);color:var(--white)}.hero h1,.section-copy h2{margin:0;max-width:760px;font-size:clamp(38px,5.7vw,68px);line-height:1;letter-spacing:0}.eyebrow{margin:0 0 14px;color:var(--pink);font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.theme-title{margin:20px 0 0;color:var(--pink);font-size:clamp(28px,3.4vw,42px);font-weight:800;line-height:1}.intro{max-width:650px;margin:20px 0 0;color:rgba(255,255,255,.82);font-size:clamp(18px,1.8vw,20px)}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border:2px solid transparent;border-radius:6px;font-weight:800;text-decoration:none}.button.primary{background:var(--pink);color:var(--white)}.button.secondary{border-color:rgba(255,255,255,.38);color:var(--white)}.hero-mark{justify-self:center;width:min(340px,70vw);padding:28px;background:var(--paper);border-radius:8px}.info-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid var(--line);background:var(--white)}.info-strip div{min-height:116px;padding:26px clamp(20px,4vw,44px);border-right:1px solid var(--line)}.info-strip span{display:block;color:var(--muted);font-size:13px;font-weight:800;text-transform:uppercase}.info-strip strong{display:block;margin-top:8px;color:var(--blue);font-size:clamp(24px,3vw,38px);line-height:1}.theme-section,.about-section,.contact-section{display:grid;grid-template-columns:minmax(0,.95fr) minmax(280px,.8fr);align-items:center;gap:clamp(28px,6vw,84px);padding:clamp(56px,8vw,96px) clamp(20px,6vw,92px)}.theme-section img,.about-section img{width:100%;border-radius:8px;border:1px solid var(--line)}.section-copy h2{color:var(--blue);font-size:clamp(34px,5vw,62px)}.section-copy p:not(.eyebrow){max-width:650px;margin:22px 0 0;color:var(--muted);font-size:clamp(18px,2vw,22px)}.updates-section{padding:clamp(56px,8vw,96px) clamp(20px,6vw,92px);background:var(--white)}.compact{margin-bottom:34px}.updates-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.updates-grid article{min-height:170px;padding:24px;border:1px solid var(--line);border-radius:8px;background:var(--paper)}.updates-grid span{color:var(--pink);font-weight:900}.updates-grid h3{margin:18px 0 8px;color:var(--blue);font-size:24px}.updates-grid p{margin:0;color:var(--muted)}.contact-section{background:var(--blue);color:var(--white)}.contact-section .section-copy h2,.contact-section .section-copy p:not(.eyebrow){color:var(--white)}address{display:grid;gap:14px;font-style:normal}address a,address span{display:block;padding:16px 0;border-bottom:1px solid rgba(255,255,255,.22);color:var(--white);font-size:clamp(18px,2vw,24px);font-weight:700;overflow-wrap:anywhere}footer{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:28px clamp(20px,6vw,92px);background:var(--ink);color:var(--white)}footer img{width:min(240px,48vw);filter:brightness(0) invert(1)}footer p{margin:0;color:rgba(255,255,255,.72);font-size:14px}@media (max-width:880px){.topbar{align-items:flex-start;flex-direction:column}nav{width:100%;gap:12px;overflow-x:auto;padding-bottom:4px}.hero,.theme-section,.about-section,.contact-section{grid-template-columns:1fr}.info-strip,.updates-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:560px){.info-strip,.updates-grid{grid-template-columns:1fr}.info-strip div{min-height:96px;border-right:0}footer{align-items:flex-start;flex-direction:column}}
</style>
</head>
<body>
<header class="topbar">
<a class="brand" href="#inicio" aria-label="Início"><img src="${logo}" alt="43º Congresso Espírita de Goiás"></a>
<nav aria-label="Navegação principal"><a href="#tema">Tema</a><a href="#congresso">O Congresso</a><a href="#informacoes">Informações</a><a href="#contato">Contato</a></nav>
</header>
<main id="inicio">
<section class="hero">
<div><p class="eyebrow">FEEGO apresenta</p><h1>43º Congresso Espírita de Goiás</h1><p class="theme-title">O Cristo vive em mim</p><p class="intro">A Federação Espírita do Estado de Goiás prepara a próxima edição do Congresso Espírita de Goiás. Em breve, divulgaremos datas, programação, convidados e inscrições.</p><div class="actions"><a class="button primary" href="#informacoes">Inscrições em breve</a><a class="button secondary" href="#contato">Fale com a secretaria</a></div></div>
<div class="hero-mark" aria-hidden="true"><img src="${seal}" alt=""></div>
</section>
<section class="info-strip" aria-label="Resumo do evento"><div><span>Edição</span><strong>43</strong></div><div><span>Ano</span><strong>2027</strong></div><div><span>Cidade</span><strong>Goiânia/GO</strong></div><div><span>Realização</span><strong>FEEGO</strong></div></section>
<section class="theme-section" id="tema"><div class="section-copy"><p class="eyebrow">Tema</p><h2>O Cristo vive em mim</h2><p>A 43ª edição convida ao recolhimento, à renovação interior e à vivência do Evangelho nas escolhas do cotidiano.</p></div><img src="${theme}" alt="O Cristo vive em mim"></section>
<section class="about-section" id="congresso"><div class="section-copy"><p class="eyebrow">O Congresso</p><h2>Um encontro para estudar, conviver e servir</h2><p>O Congresso Espírita de Goiás reúne participantes de diversas cidades em uma experiência de estudo, acolhimento, arte e fortalecimento do movimento espírita goiano.</p></div><img src="${entrance}" alt="Aplicação visual do 43º Congresso em entrada de evento"></section>
<section class="updates-section" id="informacoes"><div class="section-copy compact"><p class="eyebrow">Informações</p><h2>Novidades em preparação</h2></div><div class="updates-grid"><article><span>01</span><h3>Programação</h3><p>Em preparação.</p></article><article><span>02</span><h3>Convidados</h3><p>Em breve.</p></article><article><span>03</span><h3>Inscrições</h3><p>Em breve.</p></article><article><span>04</span><h3>Local</h3><p>Goiânia/GO, detalhes a confirmar.</p></article></div></section>
<section class="contact-section" id="contato"><div class="section-copy"><p class="eyebrow">Contato</p><h2>Fale conosco</h2><p>Para dúvidas sobre o Congresso, fale com a secretaria da FEEGO.</p></div><address><a href="tel:+556232810200">+55 (62) 3281-0200</a><a href="https://wa.me/5562993481215" target="_blank" rel="noopener">+55 (62) 99348-1215</a><a href="mailto:secretaria.congresso@feego.org.br">secretaria.congresso@feego.org.br</a><span>Segunda a sexta-feira, das 8h00 às 17h00</span></address></section>
</main>
<footer><img src="${logo}" alt="43º Congresso Espírita de Goiás"><p>Federação Espírita do Estado de Goiás</p></footer>
</body>
</html>`;

await writeFile('deploy/google-sites-embed.html', html);
console.log(`Wrote deploy/google-sites-embed.html (${html.length} chars)`);
